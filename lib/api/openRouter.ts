import OpenAI, { APIError, APIConnectionError, APIConnectionTimeoutError } from 'openai';
import { NextResponse } from 'next/server';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

type ErrorResponseShape = {
  message: string;
  status: number;
};

export type OpenRouterErrorMapOptions = {
  timeoutMessage: string;
  connectionMessage: string;
  unauthorizedMessage: string;
  creditsMessage: string;
  notFoundMessage: string;
  rateLimitMessage: string;
  mapApiStatus?: (status: number) => ErrorResponseShape | null;
  fallbackApiError: (status: number) => ErrorResponseShape;
  unknownError: ErrorResponseShape;
};

const toJsonErrorResponse = (errorShape: ErrorResponseShape) =>
  NextResponse.json(
    { error: errorShape.message },
    { status: errorShape.status }
  );

export const createOpenRouterClient = (apiKey: string, timeoutMs: number) => new OpenAI({
  apiKey,
  baseURL: OPENROUTER_BASE_URL,
  timeout: timeoutMs
});

export const mapOpenRouterErrorToResponse = (
  error: unknown,
  options: OpenRouterErrorMapOptions
): NextResponse => {
  if (error instanceof APIConnectionTimeoutError) {
    return toJsonErrorResponse({
      message: options.timeoutMessage,
      status: 504
    });
  }

  if (error instanceof APIConnectionError) {
    return toJsonErrorResponse({
      message: options.connectionMessage,
      status: 503
    });
  }

  if (error instanceof APIError) {
    const status = error.status ?? 502;

    if (status === 401) {
      return toJsonErrorResponse({
        message: options.unauthorizedMessage,
        status: 401
      });
    }

    if (status === 402) {
      return toJsonErrorResponse({
        message: options.creditsMessage,
        status: 402
      });
    }

    if (status === 404) {
      return toJsonErrorResponse({
        message: options.notFoundMessage,
        status: 404
      });
    }

    if (status === 429) {
      return toJsonErrorResponse({
        message: options.rateLimitMessage,
        status: 429
      });
    }

    const mapped = options.mapApiStatus?.(status);
    if (mapped) {
      return toJsonErrorResponse(mapped);
    }

    return toJsonErrorResponse(options.fallbackApiError(status));
  }

  return toJsonErrorResponse(options.unknownError);
};
