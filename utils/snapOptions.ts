import type { SavedGeneration, SnapOptions, UserPreferences } from "@/types";
import { parseKeyString } from "@/utils/scaleUtils";

type SnapSource = {
  prefs: UserPreferences | null;
  compositionKey?: string | null;
};

export const resolveSnapOptions = ({
  prefs,
  compositionKey,
}: SnapSource): SnapOptions | undefined => {
  if (!prefs) return undefined;

  if (prefs.key === null && typeof compositionKey === "string") {
    const parsed = parseKeyString(compositionKey);
    if (parsed) {
      return {
        scaleRoot: parsed.scaleRoot,
        scaleType: parsed.scaleType,
      };
    }
  }

  const scaleRoot = typeof prefs.scaleRoot === "number" ? prefs.scaleRoot : 0;
  const scaleType = typeof prefs.scaleType === "string" ? prefs.scaleType : "major";

  return { scaleRoot, scaleType };
};

export const resolveSnapOptionsForGeneration = (
  generation: SavedGeneration
): SnapOptions | undefined =>
  resolveSnapOptions({
    prefs: generation.prefs,
    compositionKey: generation.composition?.key,
  });
