"use client";

import React from "react";
import type { SavedGeneration } from "@/types";
import { calculateCompositionMaxBeat } from "@/utils/midiUtils";
import { getErrorMessageFromResponse } from "@/utils/http";
import {
  normalizeGeneration,
  type GenerationDetailPayload,
} from "@/hooks/generations/normalizeGeneration";

type UseGenerationDetailsInput = {
  setGenerations: React.Dispatch<React.SetStateAction<SavedGeneration[]>>;
};

type UseGenerationDetailsResult = {
  ensureCompositionLoaded: (generation: SavedGeneration) => Promise<SavedGeneration>;
  clearDetailRequests: () => void;
};

export const useGenerationDetails = ({
  setGenerations,
}: UseGenerationDetailsInput): UseGenerationDetailsResult => {
  const detailRequestsRef = React.useRef<Map<string, Promise<SavedGeneration>>>(
    new Map()
  );

  const clearDetailRequests = React.useCallback(() => {
    detailRequestsRef.current.clear();
  }, []);

  const ensureCompositionLoaded = React.useCallback(
    async (generation: SavedGeneration): Promise<SavedGeneration> => {
      if (generation.composition) {
        return generation;
      }

      const existingRequest = detailRequestsRef.current.get(generation.id);
      if (existingRequest) {
        return existingRequest;
      }

      const request = (async () => {
        const response = await fetch(`/api/generations/${generation.id}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          const message = await getErrorMessageFromResponse(
            response,
            "Failed to load generation details."
          );
          throw new Error(message);
        }

        const data: unknown = await response.json();
        const payload = data as GenerationDetailPayload;
        const normalized = normalizeGeneration(payload.generation);
        if (!normalized?.composition) {
          throw new Error("Generation details are missing composition data.");
        }
        const fullComposition = normalized.composition;

        setGenerations((prev) =>
          prev.map((item) =>
            item.id === generation.id
              ? {
                  ...item,
                  ...normalized,
                  composition: fullComposition,
                  composition_key: normalized.composition_key ?? fullComposition.key,
                  track_count: normalized.track_count ?? fullComposition.tracks.length,
                  duration_beats:
                    normalized.duration_beats ??
                    calculateCompositionMaxBeat(fullComposition),
                }
              : item
          )
        );

        return {
          ...generation,
          ...normalized,
          composition: fullComposition,
          composition_key: normalized.composition_key ?? fullComposition.key,
          track_count: normalized.track_count ?? fullComposition.tracks.length,
          duration_beats:
            normalized.duration_beats ?? calculateCompositionMaxBeat(fullComposition),
        };
      })();

      detailRequestsRef.current.set(generation.id, request);
      try {
        return await request;
      } finally {
        detailRequestsRef.current.delete(generation.id);
      }
    },
    [setGenerations]
  );

  return {
    ensureCompositionLoaded,
    clearDetailRequests,
  };
};
