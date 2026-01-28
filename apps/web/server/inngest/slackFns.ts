import { inngestClient } from "./client";
import { z } from "zod";

const SlackSendSchema = z.object({
  orgId: z.string(),
  text: z.string().min(1),
  webhookUrl: z.string().url().optional(),
  apiKey: z.string().url().optional()
});

export const slackSendMessageFn = inngestClient.createFunction(
  { id: "slack-send-message" },
  { event: "slack.send" },
  async ({ event, step, logger }) => {
    const { orgId, text, webhookUrl, apiKey } = SlackSendSchema.parse(event.data);
    const url = webhookUrl ?? apiKey;
    if (!url) throw new Error("Missing Slack webhook URL");

    // Retry with exponential backoff up to 3 attempts on 5xx
    const result = await step.run("slack.send.request", async () => {
      let lastStatus = 0;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const res = await fetch(url, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text })
        });
        lastStatus = res.status;
        if (res.ok) return { ok: true, status: res.status };
        if (res.status >= 500) {
          const backoffMs = Math.pow(2, attempt - 1) * 500;
          await new Promise((r) => setTimeout(r, backoffMs));
          continue;
        }
        // Non-retryable
        return { ok: false, status: res.status };
      }
      return { ok: false, status: lastStatus };
    });

    logger.info("slack.send.result", { orgId, ok: result.ok, status: result.status });
    if (!result.ok) throw new Error(`Slack send failed with status ${result.status}`);
    return { ok: true };
  }
);


