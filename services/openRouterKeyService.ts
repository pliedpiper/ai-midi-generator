import { getErrorMessageFromResponse } from "@/utils/http";

export const saveOpenRouterKey = async (apiKey: string): Promise<void> => {
  const normalized = apiKey.trim();
  const response = await fetch("/api/user/openrouter-key", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ apiKey: normalized }),
  });

  if (!response.ok) {
    const message = await getErrorMessageFromResponse(
      response,
      "Failed to save API key."
    );
    throw new Error(message);
  }
};
