// MIT License — Copyright (c) 2025 FlowFoundry Pro
// Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated
// documentation files (the "Software"), to deal in the Software without restriction, including without limitation
// the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software,
// and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
// The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
// THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
// TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
import { describe, it, expect, vi } from "vitest";
import { createSlackClient, GmailSendInputSchema, createGmailClient } from "./index";

describe("FlowFoundryPro connector clients", () => {
  it("validates slack sendMessage input and posts", async () => {
    const fetchMock = vi.spyOn(globalThis as any, "fetch").mockResolvedValue({ ok: true, status: 200, text: async () => "ok" });
    const client = createSlackClient({ orgId: "org1", credentials: { webhookUrl: "https://example.com/hook" }, emitLog: () => {} });
    const res = await client.sendMessage({ text: "hello" });
    expect(res.ok).toBe(true);
    fetchMock.mockRestore();
  });

  it("validates gmail input schema", async () => {
    const parsed = GmailSendInputSchema.safeParse({ to: ["a@example.com"], subject: "s", html: "<b>x</b>" });
    expect(parsed.success).toBe(true);
    const client = createGmailClient({ orgId: "org1", emitLog: () => {} });
    const res = await client.sendEmail({ to: ["a@example.com"], subject: "s", html: "<b>x</b>" });
    expect(res.queued).toBe(true);
  });
});


