import { initTRPC, TRPCError } from "@trpc/server";
import { z } from "zod";
import { estimateTokens } from "@flowfoundry/connectors";
import { readEnv } from "@flowfoundry/config";
import type { Context } from "../context";

const t = initTRPC.context<Context>().create();

export const aiRouter = t.router({
  summarize: t.procedure
    .input(z.object({ text: z.string().min(1).max(50000) }))
    .mutation(async ({ input, ctx }) => {
      const env = readEnv();
      const inputTokens = estimateTokens(input.text);

      // If no API key configured, fall back to a basic extractive summary
      if (!env.OPENAI_API_KEY || env.OPENAI_API_KEY === "sk-xxx") {
        const sentences = input.text
          .split(/[.!?]+/)
          .map(s => s.trim())
          .filter(s => s.length > 10);
        const summary = sentences.slice(0, 3).join(". ") + (sentences.length > 3 ? "." : "");
        const cost = inputTokens * 0.000002;
        return { summary: summary || input.text.slice(0, 200), tokens: inputTokens, cost, model: "extractive-fallback" };
      }

      try {
        const response = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`
          },
          body: JSON.stringify({
            model: env.AI_DEFAULT_MODEL,
            messages: [
              { role: "system", content: "You are a concise summarizer. Provide a clear, brief summary of the given text in 2-3 sentences." },
              { role: "user", content: input.text }
            ],
            max_tokens: Number(env.AI_MAX_TOKENS) || 512,
            temperature: Number(env.AI_TEMPERATURE) || 0.3
          })
        });

        if (!response.ok) {
          const err = await response.text();
          throw new Error(`OpenAI API error: ${response.status} - ${err}`);
        }

        const data = await response.json();
        const choice = data.choices?.[0];
        const summary = choice?.message?.content?.trim() || input.text.slice(0, 200);
        const usage = data.usage || {};
        const totalTokens = usage.total_tokens || inputTokens;
        // GPT-4o-mini pricing: $0.15/1M input, $0.60/1M output
        const cost = ((usage.prompt_tokens || 0) * 0.00000015) + ((usage.completion_tokens || 0) * 0.0000006);

        return {
          summary,
          tokens: totalTokens,
          cost,
          model: data.model || env.AI_DEFAULT_MODEL
        };
      } catch (error: any) {
        // On API failure, fall back to extractive summary
        const sentences = input.text
          .split(/[.!?]+/)
          .map(s => s.trim())
          .filter(s => s.length > 10);
        const summary = sentences.slice(0, 3).join(". ") + (sentences.length > 3 ? "." : "");
        return {
          summary: summary || input.text.slice(0, 200),
          tokens: inputTokens,
          cost: inputTokens * 0.000002,
          model: "extractive-fallback",
          error: error.message
        };
      }
    })
});
