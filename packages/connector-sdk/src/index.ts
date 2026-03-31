// MIT License — Copyright (c) 2025 J. Kunelis
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
// and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
// THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
import { z } from "zod";
import fetch from "node-fetch";

/** Base error class for connector execution failures */
export class ConnectorError extends Error {
  public readonly connectorId: string;
  public readonly action: string;
  public readonly cause?: unknown;

  constructor(connectorId: string, action: string, message: string, cause?: unknown) {
    super(`[${connectorId}.${action}] ${message}`);
    this.name = "ConnectorError";
    this.connectorId = connectorId;
    this.action = action;
    this.cause = cause;
  }
}

/** Thrown when connector credentials are missing or invalid */
export class ConnectorAuthError extends ConnectorError {
  constructor(connectorId: string, action: string, message?: string) {
    super(connectorId, action, message ?? "Authentication credentials are missing or invalid");
    this.name = "ConnectorAuthError";
  }
}

/** Thrown when an upstream API returns a non-OK response */
export class ConnectorApiError extends ConnectorError {
  public readonly statusCode: number;
  public readonly responseBody?: string;

  constructor(connectorId: string, action: string, statusCode: number, responseBody?: string) {
    super(connectorId, action, `Upstream API returned status ${statusCode}`);
    this.name = "ConnectorApiError";
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export type ConnectorCtx = {
  orgId: string;
  credentials?: Record<string, string>;
  emitLog: (msg: string, extra?: Record<string, unknown>) => void;
};

export type ConnectorAction<I, O> = (input: I, ctx: ConnectorCtx) => Promise<O>;

export type Connector = {
  id: string;
  name: string;
  auth: "oauth2" | "apiKey" | "none";
  schema: Record<string, z.ZodTypeAny>;
  actions: Record<string, ConnectorAction<any, any>>;
};

export const HTTP: Connector = {
  id: "http",
  name: "HTTP",
  auth: "none",
  schema: {
    request: z.object({
      method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).default("POST"),
      url: z.string().url(),
      headers: z.record(z.string()).default({ "content-type": "application/json" }),
      body: z.any().optional()
    })
  },
  actions: {
    request: async (input: unknown, ctx) => {
      const parsed = HTTP.schema.request!.parse(input);
      const res = await fetch(parsed.url, {
        method: parsed.method,
        headers: parsed.headers,
        body: ["GET", "DELETE"].includes(parsed.method) ? undefined : JSON.stringify(parsed.body)
      });
      const text = await res.text();
      ctx.emitLog("http.response", { status: res.status });
      return { status: res.status, body: text };
    }
  }
};

// Slack (Webhook based)
const SlackPostMessageSchema = z.object({ text: z.string().min(1) });

export const Slack: Connector = {
  id: "slack",
  name: "Slack",
  auth: "apiKey", // incoming webhook URL stored as apiKey
  schema: {
    postMessage: SlackPostMessageSchema
  },
  actions: {
    postMessage: async (input: unknown, ctx) => {
      const { text } = SlackPostMessageSchema.parse(input);
      const url = ctx.credentials?.webhookUrl ?? ctx.credentials?.apiKey;
      if (!url) throw new ConnectorAuthError("slack", "postMessage", "Missing Slack webhook URL. Configure the Slack connector with a valid incoming webhook URL.");
      const r = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text }) });
      if (!r.ok) throw new ConnectorApiError("slack", "postMessage", r.status, await r.text());
      return { ok: r.ok };
    }
  }
};

// Webhook In/Out (no-op for in; out via HTTP)
export const Webhook: Connector = {
  id: "webhook",
  name: "Webhook",
  auth: "none",
  schema: { emit: z.object({ url: z.string().url(), payload: z.any() }) },
  actions: {
    emit: async (input, ctx) => {
      const { url, payload } = Webhook.schema.emit!.parse(input);
      const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      ctx.emitLog("webhook.sent", { status: res.status });
      return { status: res.status };
    }
  }
};

// Mock connectors for demo (Notion, Sheets, Gmail)
export const Notion: Connector = {
  id: "notion",
  name: "Notion (mock)",
  auth: "oauth2",
  schema: { createPage: z.object({ title: z.string(), content: z.string().optional() }) },
  actions: {
    createPage: async (input, ctx) => {
      const { title, content } = Notion.schema.createPage!.parse(input);
      ctx.emitLog("notion.mock.createPage", { title });
      return { id: `notion_${Date.now()}`, title, content };
    }
  }
};

export const Sheets: Connector = {
  id: "sheets",
  name: "Sheets (mock)",
  auth: "oauth2",
  schema: { appendRow: z.object({ sheet: z.string(), values: z.array(z.any()) }) },
  actions: {
    appendRow: async (input, ctx) => {
      const { sheet, values } = Sheets.schema.appendRow!.parse(input);
      ctx.emitLog("sheets.mock.appendRow", { sheet });
      return { ok: true, appended: values.length };
    }
  }
};

export const Gmail: Connector = {
  id: "gmail",
  name: "Gmail",
  auth: "oauth2",
  schema: { send: z.object({ to: z.string().email(), subject: z.string(), body: z.string() }) },
  actions: {
    send: async (input, ctx) => {
      const { to, subject, body } = Gmail.schema.send!.parse(input);
      
      // Get OAuth credentials from context
      const accessToken = ctx.credentials?.accessToken;
      if (!accessToken) {
        throw new ConnectorAuthError("gmail", "send", "Gmail OAuth access token not found. Please configure the Gmail connector in Settings > Connectors.");
      }

      // Create email message in RFC 2822 format
      const email = [
        `To: ${to}`,
        `Subject: ${subject}`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        body
      ].join("\r\n");

      // Encode message in base64url format (Gmail API requirement)
      const encodedMessage = Buffer.from(email)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // Send email via Gmail API
      const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          raw: encodedMessage
        })
      });

      if (!response.ok) {
        const error = await response.text();
        ctx.emitLog("gmail.send.error", { status: response.status, error });
        throw new ConnectorApiError("gmail", "send", response.status, error);
      }
      
      const result = await response.json() as { id: string };
      ctx.emitLog("gmail.send.success", { messageId: result.id, to, subject });

      return { id: result.id, queued: false, sent: true };
    }
  }
};

export const BuiltInConnectors: Connector[] = [HTTP, Slack, Webhook, Notion, Sheets, Gmail];

export type FlowNodeType =
  | "TRIGGER"
  | "HTTP"
  | "CONDITION"
  | "DELAY"
  | "LOOP"
  | "AI_STEP"
  | "MAPPER"
  | "EMAIL"
  | "SMS"
  | "SLACK"
  | "NOTION"
  | "SHEETS"
  | "WEBHOOK_OUT";

export type FlowNode = {
  id: string;
  type: FlowNodeType;
  name: string;
  config: unknown;
  next?: string[]; // next node ids (supports branches)
};

export type FlowDefinition = {
  versionId: string;
  nodes: FlowNode[];
};

export function estimateTokens(text: string): number {
  // Simple heuristic: ~1 token per 4 chars
  return Math.ceil(text.length / 4);
}

// Typed client helpers (FlowFoundryPro SDK)
export type SlackPostMessageInput = z.infer<typeof SlackPostMessageSchema> & { channelId?: string; threadTs?: string };
export type SlackPostMessageOutput = { ok: boolean };

/**
 * Creates a lightweight Slack client that validates inputs and delegates to connector actions.
 */
export function createSlackClient(ctx: ConnectorCtx) {
  return {
    async sendMessage(input: SlackPostMessageInput): Promise<SlackPostMessageOutput> {
      const { text } = SlackPostMessageSchema.parse({ text: input.text });
      // For webhook-based demo: channel/thread are ignored but accepted for typed compatibility
      const url = ctx.credentials?.webhookUrl ?? ctx.credentials?.apiKey;
      if (!url) throw new ConnectorAuthError("slack", "sendMessage", "Missing Slack webhook URL. Configure the Slack connector with a valid incoming webhook URL.");
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text })
      });
      ctx.emitLog("slack.client.sendMessage", { status: res.status });
      return { ok: res.ok };
    }
  };
}

export const GmailSendInputSchema = z.object({ to: z.array(z.string().email()).min(1), subject: z.string(), html: z.string() });
export type GmailSendInput = z.infer<typeof GmailSendInputSchema>;
export type GmailSendOutput = { id: string; queued: boolean };

/**
 * Creates a lightweight Gmail client that uses the Gmail API.
 */
export function createGmailClient(ctx: ConnectorCtx) {
  return {
    async sendEmail(input: GmailSendInput): Promise<GmailSendOutput> {
      const parsed = GmailSendInputSchema.parse(input);
      
      // Get OAuth credentials from context
      const accessToken = ctx.credentials?.accessToken;
      if (!accessToken) {
        throw new ConnectorAuthError("gmail", "sendEmail", "Gmail OAuth access token not found. Please configure the Gmail connector in Settings > Connectors.");
      }

      // Create email message in RFC 2822 format
      const toHeader = parsed.to.join(", ");
      const email = [
        `To: ${toHeader}`,
        `Subject: ${parsed.subject}`,
        `Content-Type: text/html; charset=utf-8`,
        ``,
        parsed.html
      ].join("\r\n");

      // Encode message in base64url format (Gmail API requirement)
      const encodedMessage = Buffer.from(email)
        .toString("base64")
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      // Send email via Gmail API
      const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          raw: encodedMessage
        })
      });

      if (!response.ok) {
        const error = await response.text();
        ctx.emitLog("gmail.client.sendEmail.error", { status: response.status, error });
        throw new ConnectorApiError("gmail", "sendEmail", response.status, error);
      }
      
      const result = await response.json() as { id: string };
      ctx.emitLog("gmail.client.sendEmail.success", { messageId: result.id, to: parsed.to.length });

      return { id: result.id, queued: false };
    }
  };
}
