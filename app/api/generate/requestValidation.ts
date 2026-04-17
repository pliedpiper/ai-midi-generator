export type GenerateRequestBody = {
  id?: unknown;
  prefs?: unknown;
  idempotencyKey?: unknown;
};

type ValidatedGenerateRequest = {
  valid: true;
  attemptIndex: number;
  prefs: unknown;
  normalizedIdempotencyKey: string;
};

type InvalidGenerateRequest = {
  valid: false;
  error: string;
};

export type GenerateRequestValidationResult =
  | ValidatedGenerateRequest
  | InvalidGenerateRequest;

const isValidAttemptIndex = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Number.isInteger(value) &&
  value >= 1;

const normalizeIdempotencyKey = (
  value: unknown,
  maxLength: number
): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  if (!normalized || normalized.length > maxLength) {
    return null;
  }

  return normalized;
};

export const validateGenerateRequest = (
  body: GenerateRequestBody,
  idempotencyKeyMaxLength: number
): GenerateRequestValidationResult => {
  if (!isValidAttemptIndex(body.id)) {
    return {
      valid: false,
      error: "id must be a positive number.",
    };
  }

  const normalizedIdempotencyKey = normalizeIdempotencyKey(
    body.idempotencyKey,
    idempotencyKeyMaxLength
  );
  if (!normalizedIdempotencyKey) {
    return {
      valid: false,
      error: `idempotencyKey is required and must be ${idempotencyKeyMaxLength} characters or less.`,
    };
  }

  return {
    valid: true,
    attemptIndex: body.id,
    prefs: body.prefs,
    normalizedIdempotencyKey,
  };
};
