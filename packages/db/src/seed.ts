import { prisma } from "./index.js";
import { BuiltInConnectors } from "@flowfoundry/connectors";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@flowfoundry.local" },
    update: {
      password: "$2a$12$YHxpqXoFwdhvZ5L/y2jCnODG.lpYsent7twPssMiCJJn/OTDFPliu" // "password"
    },
    create: {
      email: "demo@flowfoundry.local",
      name: "Demo User",
      password: "$2a$12$YHxpqXoFwdhvZ5L/y2jCnODG.lpYsent7twPssMiCJJn/OTDFPliu" // "password"
    }
  });

  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Demo Org", slug: "demo" }
  });

  await prisma.membership.upsert({
    where: { userId_orgId: { userId: user.id, orgId: org.id } },
    update: { role: "OWNER" },
    create: { userId: user.id, orgId: org.id, role: "OWNER" }
  });

  await prisma.subscription.upsert({
    where: { id: org.id },
    update: { plan: "PRO" },
    create: { id: org.id, orgId: org.id, plan: "PRO", status: "active" }
  });

  // Built-in connectors types registered
  for (const c of BuiltInConnectors) {
    await prisma.connector.upsert({
      where: { id: `${org.id}_${c.id}` },
      update: {},
      create: {
        id: `${org.id}_${c.id}`,
        orgId: org.id,
        type: c.id,
        name: c.name
      }
    });
  }

  // Templates
  const supportTriageDef = {
    nodes: [
      { id: "t1", type: "TRIGGER", name: "Webhook Trigger", position: { x: 100, y: 100 }, data: { key: "support" } },
      { id: "a1", type: "AI_STEP", name: "Classify Ticket", position: { x: 400, y: 100 }, data: { action: "classify", labels: ["billing", "bug", "question"] } },
      { id: "s1", type: "SLACK", name: "Notify Support", position: { x: 700, y: 100 }, data: { channel: "#support", message: "New {{type}} ticket received" } }
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1" },
      { id: "e2", source: "a1", target: "s1" }
    ]
  };

  await prisma.template.upsert({
    where: { key: "support-triage-ai" },
    update: { definition: supportTriageDef },
    create: {
      key: "support-triage-ai",
      name: "Support Triage (AI)",
      description: "Classify inbound tickets with AI and notify the right Slack channel",
      definition: supportTriageDef
    }
  });

  const leadNotifyDef = {
    nodes: [
      { id: "t1", type: "TRIGGER", name: "New Lead Webhook", position: { x: 100, y: 100 }, data: {} },
      { id: "a1", type: "AI_STEP", name: "Summarize Lead", position: { x: 400, y: 100 }, data: { action: "summarize" } },
      { id: "s1", type: "SLACK", name: "Notify Sales", position: { x: 700, y: 50 }, data: { channel: "#sales", message: "New lead: {{summary}}" } },
      { id: "g1", type: "GMAIL", name: "Email Sales Rep", position: { x: 700, y: 200 }, data: { to: "sales@company.com", subject: "New Lead Alert", body: "A new lead has been received." } }
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1" },
      { id: "e2", source: "a1", target: "s1" },
      { id: "e3", source: "a1", target: "g1" }
    ]
  };

  await prisma.template.upsert({
    where: { key: "lead-notify" },
    update: { definition: leadNotifyDef },
    create: {
      key: "lead-notify",
      name: "Lead Notification Pipeline",
      description: "Summarize new leads with AI and notify via Slack and email",
      definition: leadNotifyDef
    }
  });

  const webhookSlackDef = {
    nodes: [
      { id: "t1", type: "TRIGGER", name: "Incoming Webhook", position: { x: 100, y: 100 }, data: {} },
      { id: "s1", type: "SLACK", name: "Post to Slack", position: { x: 400, y: 100 }, data: { channel: "#general", message: "Webhook received: {{payload}}" } }
    ],
    edges: [
      { id: "e1", source: "t1", target: "s1" }
    ]
  };

  await prisma.template.upsert({
    where: { key: "webhook-to-slack" },
    update: { definition: webhookSlackDef },
    create: {
      key: "webhook-to-slack",
      name: "Webhook to Slack",
      description: "Forward any incoming webhook payload to a Slack channel",
      definition: webhookSlackDef
    }
  });

  const apiMonitorDef = {
    nodes: [
      { id: "t1", type: "TRIGGER", name: "Schedule Trigger", position: { x: 100, y: 100 }, data: {} },
      { id: "h1", type: "HTTP", name: "Health Check", position: { x: 400, y: 100 }, data: { method: "GET", url: "https://api.example.com/health" } },
      { id: "s1", type: "SLACK", name: "Alert on Failure", position: { x: 700, y: 100 }, data: { channel: "#ops", message: "API health check alert!" } }
    ],
    edges: [
      { id: "e1", source: "t1", target: "h1" },
      { id: "e2", source: "h1", target: "s1" }
    ]
  };

  await prisma.template.upsert({
    where: { key: "api-monitor" },
    update: { definition: apiMonitorDef },
    create: {
      key: "api-monitor",
      name: "API Health Monitor",
      description: "Monitor an API endpoint and alert Slack if it goes down",
      definition: apiMonitorDef
    }
  });

  const emailDigestDef = {
    nodes: [
      { id: "t1", type: "TRIGGER", name: "Daily Trigger", position: { x: 100, y: 100 }, data: {} },
      { id: "a1", type: "AI_STEP", name: "Generate Summary", position: { x: 400, y: 100 }, data: { action: "summarize" } },
      { id: "g1", type: "GMAIL", name: "Send Digest", position: { x: 700, y: 100 }, data: { to: "team@company.com", subject: "Daily Activity Digest", body: "Here is your daily summary..." } }
    ],
    edges: [
      { id: "e1", source: "t1", target: "a1" },
      { id: "e2", source: "a1", target: "g1" }
    ]
  };

  await prisma.template.upsert({
    where: { key: "email-digest" },
    update: { definition: emailDigestDef },
    create: {
      key: "email-digest",
      name: "Daily Email Digest",
      description: "Generate an AI-powered daily summary and send it via email",
      definition: emailDigestDef
    }
  });

  // Demo flow with one version
  const existingFlow = await prisma.flow.findFirst({
    where: { orgId: org.id, name: "Demo Support Triage" }
  });

  if (!existingFlow) {
    const flow = await prisma.flow.create({
      data: {
        orgId: org.id,
        name: "Demo Support Triage",
        createdBy: user.id,
        versions: { create: [{ version: 1, definition: supportTriageDef }] }
      }
    });

    // Demo run history
    await prisma.run.create({
      data: {
        orgId: org.id,
        flowId: flow.id,
        versionId: (await prisma.flowVersion.findFirst({ where: { flowId: flow.id, version: 1 } }))!.id,
        status: "succeeded",
        startedAt: new Date(Date.now() - 60000),
        finishedAt: new Date(),
        tokens: 120,
        costUsd: 0.002,
        steps: {
          create: [
            { name: "Webhook Trigger", type: "TRIGGER", status: "succeeded", logs: { payload: { hello: "world" } } },
            { name: "Classify", type: "AI_STEP", status: "succeeded", logs: { result: "question" } },
            { name: "Notify", type: "SLACK", status: "succeeded", logs: { channel: "support" } }
          ]
        }
      }
    });
  }

  console.log("Seeded demo org, user, connectors, templates, flow & run.");
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
