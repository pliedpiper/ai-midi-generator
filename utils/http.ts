type ErrorPayload = {
  error?: unknown;
};

export const parseJsonSafely = async <T>(response: Response): Promise<T | null> => {
  try {
    return await response.json() as T;
  } catch {
    return null;
  }
};

export const getErrorMessageFromResponse = async (
  response: Response,
  fallbackMessage: string
): Promise<string> => {
  const payload = await parseJsonSafely<ErrorPayload>(response);
  return typeof payload?.error === 'string' ? payload.error : fallbackMessage;
};
