import { describe, expect, it } from "vitest";
import type { SavedGeneration, UserPreferences } from "@/types";
import {
  resolveSnapOptions,
  resolveSnapOptionsForGeneration,
} from "@/utils/snapOptions";

const basePrefs: UserPreferences = {
  prompt: "x",
  model: "model",
  tempo: 120,
  key: "C Major",
  timeSignature: "4/4",
  durationBars: 8,
  constraints: "",
  attemptCount: 1,
  scaleRoot: 5,
  scaleType: "minor",
};

describe("resolveSnapOptions", () => {
  it("returns undefined when prefs are missing", () => {
    expect(resolveSnapOptions({ prefs: null, compositionKey: "C Major" })).toBeUndefined();
  });

  it("falls back to parsed composition key when prefs.key is null", () => {
    const result = resolveSnapOptions({
      prefs: { ...basePrefs, key: null, scaleRoot: 0, scaleType: "major" },
      compositionKey: "E minor",
    });

    expect(result).toEqual({ scaleRoot: 4, scaleType: "natural_minor" });
  });

  it("uses stored scale settings when composition key cannot be parsed", () => {
    const result = resolveSnapOptions({
      prefs: { ...basePrefs, key: null, scaleRoot: 7, scaleType: "dorian" },
      compositionKey: "not-a-key",
    });

    expect(result).toEqual({ scaleRoot: 7, scaleType: "dorian" });
  });
});

describe("resolveSnapOptionsForGeneration", () => {
  it("derives options from generation prefs and composition key", () => {
    const generation: SavedGeneration = {
      id: "gen-1",
      title: "Test",
      model: "model",
      attempt_index: 1,
      prefs: { ...basePrefs, key: null, scaleRoot: 0, scaleType: "major" },
      composition: {
        title: "Comp",
        tempo: 120,
        timeSignature: [4, 4],
        key: "A minor",
        tracks: [],
      },
      created_at: new Date().toISOString(),
    };

    expect(resolveSnapOptionsForGeneration(generation)).toEqual({
      scaleRoot: 9,
      scaleType: "natural_minor",
    });
  });
});
