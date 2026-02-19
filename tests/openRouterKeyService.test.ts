import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { saveOpenRouterKey } from "@/services/openRouterKeyService";

beforeEach(() => {
  vi.spyOn(global, "fetch");
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("saveOpenRouterKey", () => {
  it("posts trimmed api key to route", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: vi.fn(),
    } as unknown as Response);

    await saveOpenRouterKey("  sk-or-test  ");

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/user/openrouter-key",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: "sk-or-test" }),
      })
    );
  });

  it("surfaces API error message", async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Failed to save API key." }),
    } as unknown as Response);

    await expect(saveOpenRouterKey("sk-or-test")).rejects.toThrow(
      "Failed to save API key."
    );
  });
});
