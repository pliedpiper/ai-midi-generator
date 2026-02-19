"use client";

import React from "react";
import {
  AttemptResult,
  GenerationStatus,
  UserPreferences,
} from "@/types";
import { generateAttempt } from "@/services/openRouterService";
import { generateMidiBlob, stopPlayback } from "@/utils/midiUtils";
import { resolveSnapOptions } from "@/utils/snapOptions";

const MAX_PARALLEL_ATTEMPTS = 2;

const createIdempotencyKey = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

type UseAttemptGenerationInput = {
  hasApiKey: boolean;
  onRequireApiKey: () => void;
};

type UseAttemptGenerationResult = {
  status: GenerationStatus;
  attempts: AttemptResult[];
  errorMsg: string | null;
  lastPrefs: UserPreferences | null;
  handleGenerate: (prefs: UserPreferences) => Promise<void>;
};

const resetAttemptSlots = (count: number): AttemptResult[] =>
  Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    status: "pending",
  }));

export const useAttemptGeneration = ({
  hasApiKey,
  onRequireApiKey,
}: UseAttemptGenerationInput): UseAttemptGenerationResult => {
  const [status, setStatus] = React.useState<GenerationStatus>(GenerationStatus.IDLE);
  const [attempts, setAttempts] = React.useState<AttemptResult[]>([]);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [lastPrefs, setLastPrefs] = React.useState<UserPreferences | null>(null);

  const resetAttempts = React.useCallback((count: number) => {
    stopPlayback();
    setAttempts(resetAttemptSlots(count));
    setErrorMsg(null);
  }, []);

  const runAttempt = React.useCallback(
    async (
      attemptId: number,
      prefs: UserPreferences,
      idempotencyKey: string
    ): Promise<{ id: number; success: boolean }> => {
      try {
        await new Promise((resolve) => setTimeout(resolve, attemptId * 100));

        const composition = await generateAttempt(attemptId, prefs, idempotencyKey);
        const snapOptions = resolveSnapOptions({
          prefs,
          compositionKey: composition.key,
        });
        const blob = generateMidiBlob(composition, snapOptions);

        setAttempts((prev) =>
          prev.map((attempt) =>
            attempt.id === attemptId
              ? {
                  ...attempt,
                  status: "success",
                  data: composition,
                  midiBlob: blob,
                }
              : attempt
          )
        );

        return { id: attemptId, success: true };
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to generate JSON";
        setAttempts((prev) =>
          prev.map((attempt) =>
            attempt.id === attemptId
              ? {
                  ...attempt,
                  status: "failed",
                  error: message,
                }
              : attempt
          )
        );

        return { id: attemptId, success: false };
      }
    },
    []
  );

  const handleGenerate = React.useCallback(
    async (prefs: UserPreferences) => {
      if (!hasApiKey) {
        setErrorMsg("Add your OpenRouter API key before generating.");
        onRequireApiKey();
        return;
      }

      setStatus(GenerationStatus.GENERATING);
      setLastPrefs(prefs);
      resetAttempts(prefs.attemptCount);
      const idempotencyKey = createIdempotencyKey();

      const attemptIds = Array.from({ length: prefs.attemptCount }, (_, index) => index + 1);
      const results: Array<{ id: number; success: boolean }> = [];
      let nextAttemptIndex = 0;

      const workerCount = Math.min(MAX_PARALLEL_ATTEMPTS, attemptIds.length);
      await Promise.all(
        Array.from({ length: workerCount }, async () => {
          while (nextAttemptIndex < attemptIds.length) {
            const attemptId = attemptIds[nextAttemptIndex];
            nextAttemptIndex += 1;
            const result = await runAttempt(attemptId, prefs, idempotencyKey);
            results.push(result);
          }
        })
      );

      const successfulAttempts = results.filter((result) => result.success);

      if (successfulAttempts.length === 0) {
        setStatus(GenerationStatus.ERROR);
        setErrorMsg("All generation attempts failed. Please try a simpler prompt.");
      } else {
        setStatus(GenerationStatus.COMPLETED);
      }
    },
    [hasApiKey, onRequireApiKey, resetAttempts, runAttempt]
  );

  return {
    status,
    attempts,
    errorMsg,
    lastPrefs,
    handleGenerate,
  };
};
