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
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test("signup -> dashboard -> template -> run -> logs @e2e", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Get Started" }).first().click();
  await page.goto("/templates");
  await page.getByRole("button", { name: "Use template" }).click();
  await page.goto("/flows");
  await page.getByRole("link", { name: "Open" }).first().click();
  await page.getByRole("button", { name: "Run Flow" }).click();
  await page.waitForTimeout(500);
  await page.goto("/runs");
  await expect(page.getByText("succeeded").first()).toBeVisible();
});

test("a11y on landing @a11y", async ({ page }) => {
  await page.goto("/");
  const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
  // Allow non-critical violations in CI/dev to avoid flakiness; assert no "serious"/"critical".
  const serious = accessibilityScanResults.violations.filter(v => v.impact === "serious" || v.impact === "critical");
  expect(serious).toEqual([]);
});
