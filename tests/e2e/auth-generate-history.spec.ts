import { expect, test } from "@playwright/test";

const hasRequiredEnv =
  Boolean(process.env.E2E_USER_EMAIL) &&
  Boolean(process.env.E2E_USER_PASSWORD) &&
  Boolean(process.env.E2E_OPENROUTER_KEY);

test.describe("Auth + Generate + History smoke", () => {
  test.skip(!hasRequiredEnv, "Requires E2E_USER_EMAIL, E2E_USER_PASSWORD, E2E_OPENROUTER_KEY");

  test("signs in, generates, and opens history", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Login Required" })).toBeVisible();

    await page.getByPlaceholder("you@example.com").fill(process.env.E2E_USER_EMAIL ?? "");
    await page.getByPlaceholder("Password").fill(process.env.E2E_USER_PASSWORD ?? "");
    await page.getByRole("button", { name: "Sign In" }).click();

    await page.waitForURL((url) => !url.pathname.startsWith("/login"));

    const addKeyHeading = page.getByRole("heading", { name: /OpenRouter API Key/i });
    if (await addKeyHeading.isVisible().catch(() => false)) {
      await page.getByPlaceholder("sk-or-...").fill(process.env.E2E_OPENROUTER_KEY ?? "");
      await page.getByRole("button", { name: "Save key" }).click();
    }

    await page.getByPlaceholder(/An upbeat 8-bit video game loop/i).fill(
      "A short uplifting piano progression with a simple melody."
    );
    await page.getByRole("button", { name: /Generate/ }).click();

    await expect(page.getByText("Results")).toBeVisible();

    await page.goto("/generations");
    await expect(page.getByRole("heading", { name: "My Generations" })).toBeVisible();

    const deleteButtons = page.getByRole("button", { name: /Delete /i });
    if ((await deleteButtons.count()) > 0) {
      await deleteButtons.first().click();
    }
  });
});
