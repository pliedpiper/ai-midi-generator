import { expect, test } from "@playwright/test";

const hasRequiredEnv =
  Boolean(process.env.E2E_USER_EMAIL) &&
  Boolean(process.env.E2E_USER_PASSWORD);

test.describe("Playback smoke", () => {
  test.skip(!hasRequiredEnv, "Requires E2E_USER_EMAIL and E2E_USER_PASSWORD");

  test("can toggle playback on saved generations page", async ({ page }) => {
    await page.goto("/login");
    await page.getByPlaceholder("you@example.com").fill(process.env.E2E_USER_EMAIL ?? "");
    await page.getByPlaceholder("Password").fill(process.env.E2E_USER_PASSWORD ?? "");
    await page.getByRole("button", { name: "Sign In" }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"));

    await page.goto("/generations");
    await expect(page.getByRole("heading", { name: "My Generations" })).toBeVisible();

    const playButtons = page.getByRole("button", { name: "Play" });
    if ((await playButtons.count()) === 0) {
      test.skip(true, "No saved generations with playable content.");
    }

    await playButtons.first().click();
    await expect(page.getByRole("button", { name: "Stop" }).first()).toBeVisible();
    await page.getByRole("button", { name: "Stop" }).first().click();
  });
});
