"use client";

import React from "react";
import { getErrorMessageFromResponse } from "@/utils/http";
import { saveOpenRouterKey } from "@/services/openRouterKeyService";

type UseOpenRouterKeySettingsInput = {
  initialOpenRouterConfigured: boolean;
  initialOpenRouterUpdatedAt: string | null;
};

export const useOpenRouterKeySettings = ({
  initialOpenRouterConfigured,
  initialOpenRouterUpdatedAt,
}: UseOpenRouterKeySettingsInput) => {
  const [keyConfigured, setKeyConfigured] = React.useState(initialOpenRouterConfigured);
  const [keyUpdatedAt, setKeyUpdatedAt] = React.useState<string | null>(
    initialOpenRouterUpdatedAt
  );
  const [apiKeyInput, setApiKeyInput] = React.useState("");
  const [apiKeyError, setApiKeyError] = React.useState<string | null>(null);
  const [apiKeyMessage, setApiKeyMessage] = React.useState<string | null>(null);
  const [isSavingApiKey, setIsSavingApiKey] = React.useState(false);
  const [isRemovingApiKey, setIsRemovingApiKey] = React.useState(false);

  const refreshOpenRouterStatus = React.useCallback(async () => {
    try {
      const response = await fetch("/api/user/openrouter-key", { cache: "no-store" });
      if (!response.ok) {
        return;
      }

      const data: unknown = await response.json();
      const payload = data as { configured?: unknown; updatedAt?: unknown };
      setKeyConfigured(Boolean(payload.configured));
      setKeyUpdatedAt(typeof payload.updatedAt === "string" ? payload.updatedAt : null);
    } catch {
      // Non-critical status sync failure.
    }
  }, []);

  const handleSaveApiKey = async (event: React.FormEvent) => {
    event.preventDefault();
    setApiKeyError(null);
    setApiKeyMessage(null);

    const normalized = apiKeyInput.trim();
    if (!normalized) {
      setApiKeyError("API key is required.");
      return;
    }

    setIsSavingApiKey(true);
    try {
      await saveOpenRouterKey(normalized);
      setApiKeyInput("");
      setApiKeyMessage("OpenRouter API key saved.");
      await refreshOpenRouterStatus();
    } catch (error) {
      setApiKeyError(error instanceof Error ? error.message : "Failed to save API key.");
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleRemoveApiKey = async () => {
    setApiKeyError(null);
    setApiKeyMessage(null);

    const confirmed = window.confirm(
      "Remove your stored OpenRouter API key? Generation will be disabled until you add a new key."
    );
    if (!confirmed) {
      return;
    }

    setIsRemovingApiKey(true);
    try {
      const response = await fetch("/api/user/openrouter-key", { method: "DELETE" });

      if (!response.ok) {
        const message = await getErrorMessageFromResponse(
          response,
          "Failed to remove API key."
        );
        throw new Error(message);
      }

      setApiKeyMessage("OpenRouter API key removed.");
      await refreshOpenRouterStatus();
    } catch (error) {
      setApiKeyError(
        error instanceof Error ? error.message : "Failed to remove API key."
      );
    } finally {
      setIsRemovingApiKey(false);
    }
  };

  const formattedUpdatedAt = keyUpdatedAt ? new Date(keyUpdatedAt).toLocaleString() : null;

  return {
    formattedUpdatedAt,
    openRouterKey: {
      keyConfigured,
      apiKeyInput,
      apiKeyError,
      apiKeyMessage,
      isSavingApiKey,
      isRemovingApiKey,
      setApiKeyInput,
      handleSaveApiKey,
      handleRemoveApiKey,
    },
  };
};
