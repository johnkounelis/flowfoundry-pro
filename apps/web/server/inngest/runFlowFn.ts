import { inngestClient } from "./client";
import { prisma } from "@flowfoundry/db";
import { BuiltInConnectors, estimateTokens } from "@flowfoundry/connectors";

export const runFlowFn = inngestClient.createFunction(
  { id: "run-flow" },
  { event: "flow.triggered" },
  async ({ event, step }) => {
    const { flowId, payload } = event.data as { flowId: string; payload: any };
    const flow = await prisma.flow.findUnique({ where: { id: flowId }, include: { versions: { orderBy: { version: "desc" }, take: 1 } } });
    if (!flow) throw new Error("Flow not found");
    const version = flow.versions[0]!;
    const run = await prisma.run.create({ data: { orgId: flow.orgId, flowId: flow.id, versionId: version.id, status: "running", startedAt: new Date(), triggerPayload: payload } });

    let tokens = 0;
    let cost = 0;

    const emit = async (name: string, type: string, logs: any, status: "succeeded" | "failed" = "succeeded") => {
      await prisma.runStep.create({ data: { runId: run.id, name, type, status, startedAt: new Date(), finishedAt: new Date(), logs } });
    };

    // Helper to get node config - supports both node.config and node.data patterns
    const getNodeConfig = (node: any) => ({ ...node.config, ...node.data });

    try {
      for (const node of (version.definition as any).nodes) {
        const config = getNodeConfig(node);

        switch (node.type) {
          case "TRIGGER":
            await emit(node.name, node.type, { payload });
            break;

          case "AI_STEP": {
            const text = JSON.stringify(payload).slice(0, 2000);
            const t = estimateTokens(text);
            tokens += t;
            cost += t * 0.000002;
            const action = config.action || "classify";
            await emit(node.name, node.type, { tokens: t, action, result: action === "classify" ? "question" : text.slice(0, 100) + "..." });
            break;
          }

          case "SLACK": {
            const connector = await prisma.connector.findFirst({ where: { orgId: flow.orgId, type: "slack" } });
            const cred = connector ? await prisma.credential.findFirst({ where: { orgId: flow.orgId, connectorId: connector.id } }) : null;
            let webhookUrl: string | undefined;
            if (cred) {
              const { unsealEnvelopeToCredentials } = await import("@/server/crypto");
              const map = unsealEnvelopeToCredentials(Buffer.from(cred.envelope));
              webhookUrl = map.webhookUrl ?? map.apiKey;
            }
            const channel = config.channel ?? "support";
            const message = config.message ?? config.text ?? "Flow notification";
            if (webhookUrl) {
              try {
                const slackConnector = BuiltInConnectors.find(c => c.id === "slack");
                const postMessage = slackConnector?.actions.postMessage;
                if (postMessage) {
                  await postMessage(
                    { text: `[${channel}] ${message}` },
                    { orgId: flow.orgId, credentials: { webhookUrl }, emitLog: () => {} }
                  );
                }
                await emit(node.name, node.type, { posted: true, channel, message });
              } catch (err: any) {
                await emit(node.name, node.type, { posted: false, channel, error: err.message }, "failed");
              }
            } else {
              await emit(node.name, node.type, { posted: false, channel, reason: "no-credentials" });
            }
            break;
          }

          case "GMAIL": {
            const connector = await prisma.connector.findFirst({ where: { orgId: flow.orgId, type: "gmail" } });
            const cred = connector ? await prisma.credential.findFirst({ where: { orgId: flow.orgId, connectorId: connector.id } }) : null;
            if (cred) {
              const { unsealEnvelopeToCredentials } = await import("@/server/crypto");
              const credentials = unsealEnvelopeToCredentials(Buffer.from(cred.envelope));
              const accessToken = credentials.accessToken;

              if (accessToken) {
                const to = config.to ?? "";
                const subject = config.subject ?? "Flow Notification";
                const body = config.body ?? JSON.stringify(payload);

                const gmailConnector = BuiltInConnectors.find(c => c.id === "gmail");
                if (gmailConnector && gmailConnector.actions.send) {
                  try {
                    const result = await gmailConnector.actions.send(
                      { to, subject, body },
                      { orgId: flow.orgId, credentials: { accessToken }, emitLog: () => {} }
                    );
                    await emit(node.name, node.type, { sent: true, messageId: result.id, to, subject });
                  } catch (error: any) {
                    await emit(node.name, node.type, { sent: false, error: error.message }, "failed");
                  }
                } else {
                  await emit(node.name, node.type, { sent: false, reason: "gmail-connector-not-found" });
                }
              } else {
                await emit(node.name, node.type, { sent: false, reason: "no-access-token" });
              }
            } else {
              await emit(node.name, node.type, { sent: false, reason: "no-credentials" });
            }
            break;
          }

          case "HTTP": {
            const method = (config.method || "GET").toUpperCase();
            const url = config.url;
            if (!url) {
              await emit(node.name, node.type, { error: "No URL configured" }, "failed");
              break;
            }

            let headers: Record<string, string> = {};
            if (config.headers) {
              try {
                headers = typeof config.headers === "string" ? JSON.parse(config.headers) : config.headers;
              } catch {
                headers = {};
              }
            }

            let body: string | undefined;
            if (config.body && method !== "GET") {
              body = typeof config.body === "string" ? config.body : JSON.stringify(config.body);
              if (!headers["Content-Type"]) {
                headers["Content-Type"] = "application/json";
              }
            }

            try {
              const response = await fetch(url, {
                method,
                headers,
                body: method !== "GET" ? body : undefined
              });
              const responseText = await response.text().catch(() => "");
              let responseBody: any = responseText;
              try { responseBody = JSON.parse(responseText); } catch {}

              await emit(node.name, node.type, {
                status: response.status,
                statusText: response.statusText,
                body: typeof responseBody === "string" ? responseBody.slice(0, 1000) : responseBody
              }, response.ok ? "succeeded" : "failed");
            } catch (error: any) {
              await emit(node.name, node.type, { error: error.message }, "failed");
            }
            break;
          }

          case "WEBHOOK": {
            const url = config.url;
            if (!url) {
              await emit(node.name, node.type, { error: "No webhook URL configured" }, "failed");
              break;
            }

            let payloadData: any = payload;
            if (config.payload) {
              try {
                payloadData = typeof config.payload === "string" ? JSON.parse(config.payload) : config.payload;
              } catch {
                payloadData = payload;
              }
            }

            try {
              const webhookConnector = BuiltInConnectors.find(c => c.id === "webhook");
              const emitAction = webhookConnector?.actions.emit;
              if (emitAction) {
                const result = await emitAction(
                  { url, payload: payloadData },
                  { orgId: flow.orgId, emitLog: () => {} }
                );
                await emit(node.name, node.type, { sent: true, status: result.status, url });
              } else {
                // Fallback direct fetch
                const response = await fetch(url, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(payloadData)
                });
                await emit(node.name, node.type, { sent: true, status: response.status, url });
              }
            } catch (error: any) {
              await emit(node.name, node.type, { sent: false, error: error.message, url }, "failed");
            }
            break;
          }

          default:
            await emit(node.name, node.type, { info: `Node type ${node.type} executed` });
        }
      }

      // Track usage event
      await prisma.usageEvent.create({
        data: {
          orgId: flow.orgId,
          type: "run",
          amount: 1,
          meta: { flowId: flow.id, runId: run.id }
        }
      });

      if (tokens > 0) {
        await prisma.usageEvent.create({
          data: {
            orgId: flow.orgId,
            type: "ai_tokens",
            amount: tokens,
            meta: { flowId: flow.id, runId: run.id }
          }
        });
      }

      await prisma.run.update({ where: { id: run.id }, data: { status: "succeeded", finishedAt: new Date(), tokens, costUsd: cost } });
    } catch (e: any) {
      await prisma.run.update({ where: { id: run.id }, data: { status: "failed", finishedAt: new Date(), tokens, costUsd: cost } });
      await emit("Error", "ERROR", { message: e.message }, "failed");
      throw e;
    }

    return { runId: run.id };
  }
);
