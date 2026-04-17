import { describe, expect, it } from "vitest";
import { validateGenerateRequest } from "@/app/api/generate/requestValidation";

describe("validateGenerateRequest", () => {
  it("rejects invalid attempt id", () => {
    const result = validateGenerateRequest(
      { id: 0, prefs: {}, idempotencyKey: "batch-1" },
      120
    );

    expect(result).toEqual({
      valid: false,
      error: "id must be a positive number.",
    });
  });

  it("rejects fractional attempt id", () => {
    const result = validateGenerateRequest(
      { id: 1.5, prefs: {}, idempotencyKey: "batch-1" },
      120
    );

    expect(result).toEqual({
      valid: false,
      error: "id must be a positive number.",
    });
  });

  it("rejects missing idempotency key", () => {
    const result = validateGenerateRequest({ id: 1, prefs: {} }, 120);

    expect(result).toEqual({
      valid: false,
      error: "idempotencyKey is required and must be 120 characters or less.",
    });
  });

  it("returns normalized request payload", () => {
    const prefs = { prompt: "test" };
    const result = validateGenerateRequest(
      { id: 3, prefs, idempotencyKey: "  batch-abc  " },
      120
    );

    expect(result).toEqual({
      valid: true,
      attemptIndex: 3,
      prefs,
      normalizedIdempotencyKey: "batch-abc",
    });
  });
});
