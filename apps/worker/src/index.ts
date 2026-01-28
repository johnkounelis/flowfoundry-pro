import "dotenv/config";
import { initOTEL } from "@flowfoundry/otel";
import { readEnv } from "@flowfoundry/config";
import { Inngest } from "inngest";
import { prisma } from "@flowfoundry/db";
import { BuiltInConnectors, estimateTokens } from "@flowfoundry/connectors";

const env = readEnv();
initOTEL("flowfoundry-worker", env.OTEL_EXPORTER_OTLP_ENDPOINT);

const inngest = new Inngest({ id: "flowfoundry-worker", eventKey: env.INNGEST_EVENT_KEY });

// Worker-side flow execution function (mirrors web app's runFlowFn)
const runFlowFn = inngest.createFunction(
  { id: "worker-run-flow" },
  { event: "flow.triggered" },
  async ({ event }) => {
    const { flowId, payload } = event.data as { flowId: string; payload: any };
    const flow = await prisma.flow.findUnique({
      where: { id: flowId },
      include: { versions: { orderBy: { version: "desc" }, take: 1 } }
    });

    if (!flow) throw new Error("Flow not found");
    const version = flow.versions[0]!;

    const run = await prisma.run.create({
      data: {
        orgId: flow.orgId,
        flowId: flow.id,
        versionId: version.id,
        status: "running",
        startedAt: new Date(),
        triggerPayload: payload
      }
    });

    let tokens = 0;
    let cost = 0;

    const emit = async (name: string, type: string, logs: any, status: "succeeded" | "failed" = "succeeded") => {
      await prisma.runStep.create({
        data: { runId: run.id, name, type, status, startedAt: new Date(), finishedAt: new Date(), logs }
      });
    };

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
            await emit(node.name, node.type, { tokens: t, action: config.action || "classify", result: "processed" });
            break;
          }

          case "SLACK": {
            const channel = config.channel ?? "#general";
            const message = config.message ?? config.text ?? "Flow notification";
            const connector = await prisma.connector.findFirst({ where: { orgId: flow.orgId, type: "slack" } });
            const cred = connector ? await prisma.credential.findFirst({ where: { orgId: flow.orgId, connectorId: connector.id } }) : null;

            if (cred) {
              try {
                const credData = JSON.parse(Buffer.from(cred.envelope).toString("utf8"));
                const webhookUrl = credData.webhookUrl || credData.apiKey;
                if (webhookUrl) {
                  const slackConnector = BuiltInConnectors.find(c => c.id === "slack");
                  const postMessage = slackConnector?.actions.postMessage;
                  if (postMessage) {
                    await postMessage(
                      { text: `[${channel}] ${message}` },
                      { orgId: flow.orgId, credentials: { webhookUrl }, emitLog: () => {} }
                    );
                  }
                  await emit(node.name, node.type, { posted: true, channel });
                } else {
                  await emit(node.name, node.type, { posted: false, reason: "no-webhook-url" });
                }
              } catch (err: any) {
                await emit(node.name, node.type, { posted: false, error: err.message }, "failed");
              }
            } else {
              await emit(node.name, node.type, { posted: false, reason: "no-credentials" });
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

            try {
              let headers: Record<string, string> = {};
              if (config.headers) {
                try { headers = typeof config.headers === "string" ? JSON.parse(config.headers) : config.headers; } catch {}
              }

              const response = await fetch(url, {
                method,
                headers,
                body: method !== "GET" && config.body ? (typeof config.body === "string" ? config.body : JSON.stringify(config.body)) : undefined
              });
              await emit(node.name, node.type, { status: response.status, statusText: response.statusText });
            } catch (error: any) {
              await emit(node.name, node.type, { error: error.message }, "failed");
            }
            break;
          }

          case "WEBHOOK": {
            const url = config.url;
            if (!url) {
              await emit(node.name, node.type, { error: "No webhook URL" }, "failed");
              break;
            }
            try {
              const response = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
              });
              await emit(node.name, node.type, { sent: true, status: response.status });
            } catch (error: any) {
              await emit(node.name, node.type, { sent: false, error: error.message }, "failed");
            }
            break;
          }

          default:
            await emit(node.name, node.type, { info: `Node type ${node.type} executed` });
        }
      }

      // Track usage
      await prisma.usageEvent.create({
        data: { orgId: flow.orgId, type: "run", amount: 1, meta: { flowId: flow.id, runId: run.id } }
      });

      await prisma.run.update({
        where: { id: run.id },
        data: { status: "succeeded", finishedAt: new Date(), tokens, costUsd: cost }
      });
    } catch (e: any) {
      await prisma.run.update({
        where: { id: run.id },
        data: { status: "failed", finishedAt: new Date(), tokens, costUsd: cost }
      });
      await emit("Error", "ERROR", { message: e.message }, "failed");
      throw e;
    }

    return { runId: run.id };
  }
);

// Slack message sending with retry
const slackSendMessageFn = inngest.createFunction(
  { id: "worker-slack-send", retries: 3 },
  { event: "slack.send" },
  async ({ event }) => {
    const { webhookUrl, text, channel } = event.data as { webhookUrl: string; text: string; channel?: string };

    const slackConnector = BuiltInConnectors.find(c => c.id === "slack");
    const postMessage = slackConnector?.actions.postMessage;
    if (postMessage) {
      await postMessage(
        { text: channel ? `[${channel}] ${text}` : text },
        { orgId: "worker", credentials: { webhookUrl }, emitLog: () => {} }
      );
    } else {
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: channel ? `[${channel}] ${text}` : text })
      });
      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status}`);
      }
    }

    return { ok: true };
  }
);

async function main() {
  console.log("Worker online. Listening for events...");
  console.log("Registered functions: worker-run-flow, worker-slack-send");

  // Keep database connection alive
  setInterval(() => void prisma.$queryRaw`SELECT 1`, 30000);
}

main();
