"use client";

import React from "react";
import { UserPreferences } from "../types";
import { AVAILABLE_MODELS, DEFAULT_PREFERENCES } from "../constants";
import { parseKeyString } from "../utils/scaleUtils";
import {
  Check,
  ChevronDown,
  Loader2,
  Search,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { improvePrompt } from "../services/openRouterService";

interface Props {
  onSubmit: (prefs: UserPreferences) => void;
  isGenerating: boolean;
  variant?: "default" | "hero" | "composer";
  promptSuggestion?: string | null;
}

type ModelOption = (typeof AVAILABLE_MODELS)[number];
type ModelGroup = {
  providerId: string;
  providerName: string;
  models: ModelOption[];
};

const PROVIDER_NAME_OVERRIDES: Record<string, string> = {
  "arcee-ai": "Arcee AI",
  anthropic: "Anthropic",
  "bytedance-seed": "ByteDance Seed",
  deepseek: "DeepSeek",
  google: "Google",
  mistralai: "Mistral AI",
  moonshotai: "Moonshot AI",
  nvidia: "NVIDIA",
  openai: "OpenAI",
  openrouter: "OpenRouter",
  qwen: "Qwen",
  stepfun: "StepFun",
  xiaomi: "Xiaomi",
  "x-ai": "xAI",
  "z-ai": "Z AI",
};

const toTitleCase = (value: string): string =>
  value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const getProviderName = (providerId: string): string => {
  const override = PROVIDER_NAME_OVERRIDES[providerId];
  if (override) {
    return override;
  }

  return toTitleCase(providerId.replace(/[-_]+/g, " "));
};

const InputForm: React.FC<Props> = ({
  onSubmit,
  isGenerating,
  variant = "default",
  promptSuggestion = null,
}) => {
  const [prefs, setPrefs] = React.useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [isImprovingPrompt, setIsImprovingPrompt] = React.useState(false);
  const [improvePromptError, setImprovePromptError] = React.useState<string | null>(
    null
  );
  const [modelSearch, setModelSearch] = React.useState("");
  const [isModelPickerOpen, setIsModelPickerOpen] = React.useState(false);
  const modelPickerRef = React.useRef<HTMLDivElement | null>(null);
  const modelSearchInputRef = React.useRef<HTMLInputElement | null>(null);
  const composerFormRef = React.useRef<HTMLFormElement | null>(null);

  const isHero = variant === "hero";
  const isComposer = variant === "composer";
  const isPromptEmpty = !prefs.prompt.trim();

  const groupedModels = React.useMemo<ModelGroup[]>(() => {
    const grouped = new Map<string, ModelGroup>();

    for (const model of AVAILABLE_MODELS) {
      const providerId = model.id.split("/")[0] ?? "other";
      if (!grouped.has(providerId)) {
        grouped.set(providerId, {
          providerId,
          providerName: getProviderName(providerId),
          models: [],
        });
      }
      grouped.get(providerId)?.models.push(model);
    }

    return [...grouped.values()]
      .map((group) => ({
        ...group,
        models: [...group.models].sort((a, b) =>
          a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
        ),
      }))
      .sort((a, b) =>
        a.providerName.localeCompare(b.providerName, undefined, {
          sensitivity: "base",
        })
      );
  }, []);

  const filteredModelGroups = React.useMemo(() => {
    const normalizedQuery = modelSearch.trim().toLowerCase();
    if (!normalizedQuery) {
      return groupedModels;
    }

    return groupedModels
      .map((group) => ({
        ...group,
        models: group.models.filter((model) => {
          const searchText = `${group.providerName} ${model.name} ${model.id}`.toLowerCase();
          return searchText.includes(normalizedQuery);
        }),
      }))
      .filter((group) => group.models.length > 0);
  }, [groupedModels, modelSearch]);

  const visibleModelIds = React.useMemo(
    () => filteredModelGroups.flatMap((group) => group.models.map((model) => model.id)),
    [filteredModelGroups]
  );
  const firstVisibleModelId = visibleModelIds[0] ?? null;
  const selectedModel = React.useMemo(
    () => AVAILABLE_MODELS.find((model) => model.id === prefs.model) ?? AVAILABLE_MODELS[0],
    [prefs.model]
  );
  const selectedProviderName = React.useMemo(() => {
    const providerId = selectedModel?.id.split("/")[0] ?? "other";
    return getProviderName(providerId);
  }, [selectedModel]);

  const buildSubmissionPrefs = React.useCallback(
    (): UserPreferences => ({
      ...prefs,
      tempo: Number.isFinite(prefs.tempo) ? prefs.tempo : DEFAULT_PREFERENCES.tempo,
      key:
        typeof prefs.key === "string" && prefs.key.trim()
          ? prefs.key.trim()
          : DEFAULT_PREFERENCES.key,
      timeSignature:
        typeof prefs.timeSignature === "string" && prefs.timeSignature.trim()
          ? prefs.timeSignature.trim()
          : DEFAULT_PREFERENCES.timeSignature,
      durationBars: Number.isFinite(prefs.durationBars)
        ? prefs.durationBars
        : DEFAULT_PREFERENCES.durationBars,
    }),
    [prefs]
  );

  React.useEffect(() => {
    if (!promptSuggestion || promptSuggestion.trim().length === 0) {
      return;
    }

    setPrefs((currentPrefs) => ({
      ...currentPrefs,
      prompt: promptSuggestion,
    }));
    setImprovePromptError(null);
  }, [promptSuggestion]);

  React.useEffect(() => {
    if (!isModelPickerOpen) {
      return;
    }

    const handlePointerDownOutside = (event: MouseEvent) => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Node)) {
        return;
      }

      if (!modelPickerRef.current?.contains(eventTarget)) {
        setIsModelPickerOpen(false);
        setModelSearch("");
      }
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
    };
  }, [isModelPickerOpen]);

  React.useEffect(() => {
    if (!isModelPickerOpen) {
      return;
    }
    modelSearchInputRef.current?.focus();
  }, [isModelPickerOpen]);

  React.useEffect(() => {
    if (!isComposer || !showAdvanced) {
      return;
    }

    const handlePointerDownOutside = (event: MouseEvent) => {
      const eventTarget = event.target;
      if (!(eventTarget instanceof Node)) {
        return;
      }

      if (!composerFormRef.current?.contains(eventTarget)) {
        setShowAdvanced(false);
        setIsModelPickerOpen(false);
        setModelSearch("");
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowAdvanced(false);
        setIsModelPickerOpen(false);
        setModelSearch("");
      }
    };

    document.addEventListener("mousedown", handlePointerDownOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDownOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isComposer, showAdvanced]);

  React.useEffect(() => {
    if (!isComposer || showAdvanced) {
      return;
    }

    if (isModelPickerOpen) {
      setIsModelPickerOpen(false);
      setModelSearch("");
    }
  }, [isComposer, isModelPickerOpen, showAdvanced]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPromptEmpty) return;
    onSubmit(buildSubmissionPrefs());
  };

  const handleImprovePrompt = async () => {
    if (isPromptEmpty || isGenerating || isImprovingPrompt) return;

    setImprovePromptError(null);
    setIsImprovingPrompt(true);

    try {
      const normalizedPrefs = buildSubmissionPrefs();
      const improved = await improvePrompt({
        prompt: normalizedPrefs.prompt.trim(),
        tempo: normalizedPrefs.tempo,
        key: normalizedPrefs.key,
        timeSignature: normalizedPrefs.timeSignature,
        durationBars: normalizedPrefs.durationBars,
        constraints: normalizedPrefs.constraints,
      });
      setPrefs((prev) => ({ ...prev, prompt: improved }));
    } catch (error) {
      setImprovePromptError(
        error instanceof Error ? error.message : "Failed to improve prompt."
      );
    } finally {
      setIsImprovingPrompt(false);
    }
  };

  const handleSelectModel = (modelId: string) => {
    setPrefs((currentPrefs) => ({ ...currentPrefs, model: modelId }));
    setIsModelPickerOpen(false);
    setModelSearch("");
  };

  const formClass = isComposer
    ? "relative z-[90] w-full overflow-visible rounded-[1.8rem] border border-surface-600/70 bg-surface-800/85 p-3 shadow-[0_24px_70px_-34px_rgba(0,0,0,0.92)] backdrop-blur-2xl sm:p-4"
    : isHero
    ? `relative overflow-visible space-y-5 rounded-[1.75rem] border border-surface-600/70 bg-surface-800/70 p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-6 md:p-7 ${
        isModelPickerOpen ? "z-[70]" : "z-10"
      }`
    : "space-y-6";

  const labelClass = isHero
    ? "font-mono text-[11px] uppercase tracking-[0.17em] text-text-muted"
    : "font-mono text-xs text-text-muted uppercase tracking-wider";

  const panelClass = isComposer
    ? "w-full rounded-2xl border border-surface-600/70 bg-surface-900/70 px-4 py-3 text-base text-text-primary placeholder-text-muted/70 outline-none transition-colors focus:border-accent focus:ring-0 resize-none"
    : isHero
    ? "w-full rounded-2xl border border-surface-600/70 bg-surface-900/60 px-4 py-4 text-text-primary placeholder-text-muted/60 outline-none transition-colors focus:border-accent focus:ring-0 resize-none font-light"
    : "w-full bg-surface-800 border border-surface-600 rounded px-4 py-3 text-text-primary placeholder-text-muted/50 focus:border-accent focus:ring-0 outline-none transition-colors resize-none font-light";

  const inputClass = isHero || isComposer
    ? "w-full rounded-xl border border-surface-600/70 bg-surface-900/70 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent font-light"
    : "w-full bg-surface-800 border border-surface-600 rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none transition-colors font-light";

  const renderModelPicker = () => (
    <div className="relative" ref={modelPickerRef}>
      <button
        type="button"
        onClick={() => {
          if (isGenerating) return;
          setIsModelPickerOpen((current) => !current);
        }}
        aria-haspopup="listbox"
        aria-expanded={isModelPickerOpen}
        aria-controls="model-options-listbox"
        aria-label="Model selector"
        disabled={isGenerating}
        className={`w-full rounded-xl border border-surface-600/70 bg-surface-900/70 px-4 py-2.5 text-left transition-colors ${
          isGenerating
            ? "cursor-not-allowed text-text-muted/70"
            : "cursor-pointer text-text-primary hover:border-surface-500"
        } ${
          isModelPickerOpen
            ? "border-accent/70 shadow-[0_0_0_1px_rgb(var(--accent)_/_0.25)]"
            : ""
        }`}
      >
        <div className="pr-6">
          <p className="truncate text-sm font-medium">
            {selectedModel?.name ?? "Select a model"}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
            {selectedProviderName}
          </p>
        </div>
        <ChevronDown
          size={16}
          className={`pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-muted transition-transform ${
            isModelPickerOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isModelPickerOpen && (
        <div
          className={`absolute left-0 top-full mt-2 w-full overflow-hidden rounded-2xl border border-surface-600/70 bg-surface-900/95 shadow-[0_24px_64px_-36px_rgba(0,0,0,0.9)] backdrop-blur-xl ${
            isComposer ? "z-[130]" : "z-[80]"
          }`}
        >
          <div className="border-b border-surface-700/80 p-3">
            <div className="relative">
              <Search
                size={14}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted/80"
              />
              <input
                ref={modelSearchInputRef}
                type="text"
                value={modelSearch}
                onChange={(event) => setModelSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setIsModelPickerOpen(false);
                    setModelSearch("");
                    return;
                  }

                  if (event.key === "Enter" && firstVisibleModelId) {
                    event.preventDefault();
                    handleSelectModel(firstVisibleModelId);
                  }
                }}
                placeholder="Search models or providers..."
                className="w-full rounded-xl border border-surface-600/70 bg-surface-800/80 py-2 pl-9 pr-3 text-sm text-text-primary outline-none transition-colors placeholder:text-text-muted/70 focus:border-accent"
                aria-label="Search models"
              />
            </div>
          </div>

          <div
            id="model-options-listbox"
            role="listbox"
            aria-label="Model options"
            className="max-h-80 overflow-y-auto p-2"
          >
            {filteredModelGroups.length === 0 && (
              <div className="rounded-xl border border-surface-700/70 bg-surface-800/50 px-3 py-4 text-center text-sm text-text-muted">
                No models found for &quot;{modelSearch.trim()}&quot;.
              </div>
            )}

            {filteredModelGroups.map((group) => (
              <div
                key={group.providerId}
                role="group"
                aria-label={group.providerName}
                className="mb-2 last:mb-0"
              >
                <p className="px-2 pb-1 pt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-text-muted/85">
                  {group.providerName}
                </p>
                <div className="space-y-1">
                  {group.models.map((model) => {
                    const isSelected = model.id === prefs.model;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        onClick={() => handleSelectModel(model.id)}
                        className={`w-full rounded-xl border px-3 py-2 text-left transition-colors ${
                          isSelected
                            ? "border-accent/70 bg-accent/10 text-text-primary"
                            : "border-transparent bg-surface-800/60 text-text-secondary hover:border-surface-600/80 hover:text-text-primary"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium">{model.name}</p>
                            <p className="mt-1 truncate font-mono text-[10px] uppercase tracking-[0.11em] text-text-muted/80">
                              {model.id}
                            </p>
                          </div>
                          {isSelected && (
                            <Check size={14} className="mt-0.5 shrink-0 text-accent" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderVariationsControl = () => (
    <div
      className={`rounded-xl border border-surface-600/70 ${
        isHero || isComposer
          ? "bg-surface-900/65 px-4 py-3 sm:min-w-[16rem]"
          : "bg-surface-800 px-4 py-3"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">
          Count
        </span>
        <span className="font-mono text-base font-medium text-accent">
          {prefs.attemptCount}
        </span>
      </div>
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-surface-500/80"
        />
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={prefs.attemptCount}
          onChange={(e) =>
            setPrefs({ ...prefs, attemptCount: parseInt(e.target.value, 10) })
          }
          className="relative z-10 w-full cursor-pointer bg-transparent"
          disabled={isGenerating}
        />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-text-muted">
        <span>1</span>
        <span>2</span>
        <span>3</span>
        <span>4</span>
        <span>5</span>
      </div>
    </div>
  );

  const renderAdvancedInputs = () => (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-text-muted">
          Tempo
        </label>
        <input
          type="number"
          step="1"
          min="20"
          max="300"
          className={inputClass}
          value={typeof prefs.tempo === "number" && Number.isFinite(prefs.tempo) ? prefs.tempo : ""}
          onChange={(e) => {
            const value = e.target.value;
            setPrefs({
              ...prefs,
              tempo: value === "" ? NaN : parseInt(value, 10),
            });
          }}
          disabled={isGenerating}
        />
      </div>
      <div>
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-text-muted">
          Key
        </label>
        <input
          type="text"
          className={inputClass}
          value={prefs.key ?? ""}
          onChange={(e) => {
            const newKey = e.target.value;
            const parsed = parseKeyString(newKey);
            if (parsed) {
              setPrefs({
                ...prefs,
                key: newKey,
                scaleRoot: parsed.scaleRoot,
                scaleType: parsed.scaleType,
              });
            } else {
              setPrefs({ ...prefs, key: newKey });
            }
          }}
          disabled={isGenerating}
        />
      </div>
      <div>
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-text-muted">
          Time Sig
        </label>
        <input
          type="text"
          className={inputClass}
          value={prefs.timeSignature ?? ""}
          onChange={(e) => setPrefs({ ...prefs, timeSignature: e.target.value })}
          disabled={isGenerating}
        />
      </div>
      <div>
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-text-muted">
          Bars
        </label>
        <input
          type="number"
          step="1"
          min="1"
          max="64"
          className={inputClass}
          value={
            typeof prefs.durationBars === "number" && Number.isFinite(prefs.durationBars)
              ? prefs.durationBars
              : ""
          }
          onChange={(e) => {
            const value = e.target.value;
            setPrefs({
              ...prefs,
              durationBars: value === "" ? NaN : parseInt(value, 10),
            });
          }}
          disabled={isGenerating}
        />
      </div>
      <div className="sm:col-span-2">
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-text-muted">
          Constraints
        </label>
        <input
          type="text"
          className={inputClass}
          value={prefs.constraints}
          onChange={(e) => setPrefs({ ...prefs, constraints: e.target.value })}
          placeholder="No drums, focus on melody..."
          disabled={isGenerating}
        />
      </div>
    </div>
  );

  if (isComposer) {
    return (
      <form ref={composerFormRef} onSubmit={handleSubmit} className={formClass}>
        {isImprovingPrompt && (
          <svg
            aria-hidden="true"
            className="pointer-events-none absolute -inset-[1px] z-10 h-[calc(100%+2px)] w-[calc(100%+2px)]"
            viewBox="0 0 1000 240"
            preserveAspectRatio="none"
          >
            <path
              d="M 500 1.5 H 970.5 A 28 28 0 0 1 998.5 29.5 V 210.5 A 28 28 0 0 1 970.5 238.5 H 29.5 A 28 28 0 0 1 1.5 210.5 V 29.5 A 28 28 0 0 1 29.5 1.5 Z"
              fill="none"
              strokeWidth="1"
              className="composer-improving-outline-base"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M 500 1.5 H 970.5 A 28 28 0 0 1 998.5 29.5 V 210.5 A 28 28 0 0 1 970.5 238.5 H 29.5 A 28 28 0 0 1 1.5 210.5 V 29.5 A 28 28 0 0 1 29.5 1.5 Z"
              fill="none"
              strokeWidth="1.15"
              pathLength="100"
              strokeDasharray="22 78"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="composer-improving-outline-trail"
              vectorEffect="non-scaling-stroke"
            />
            <path
              d="M 500 1.5 H 970.5 A 28 28 0 0 1 998.5 29.5 V 210.5 A 28 28 0 0 1 970.5 238.5 H 29.5 A 28 28 0 0 1 1.5 210.5 V 29.5 A 28 28 0 0 1 29.5 1.5 Z"
              fill="none"
              strokeWidth="1.25"
              pathLength="100"
              strokeDasharray="8 92"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="composer-improving-outline-head"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
        )}

        {showAdvanced && (
          <div
            id="advanced-controls"
            className="absolute bottom-full left-0 right-0 z-[120] mb-3 overflow-visible rounded-[1.6rem] border border-surface-600/80 bg-surface-800/95 p-4 shadow-[0_28px_70px_-36px_rgba(0,0,0,0.95)] backdrop-blur-2xl"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[11px] uppercase tracking-[0.17em] text-text-muted">
                Options
              </span>
              <button
                type="button"
                onClick={() => setShowAdvanced(false)}
                className="inline-flex h-10 min-w-10 items-center justify-center rounded-lg bg-surface-700 px-3 text-xs font-mono uppercase tracking-wide text-text-secondary transition-colors hover:bg-surface-600 hover:text-text-primary"
              >
                Close
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
              <div>
                <label className={`mb-2 block ${labelClass}`}>Model</label>
                {renderModelPicker()}
              </div>
              <div className="sm:justify-self-end">
                <label className={`mb-2 block ${labelClass}`}>Variations</label>
                {renderVariationsControl()}
              </div>
            </div>

            <div className="mt-4">{renderAdvancedInputs()}</div>
          </div>
        )}

        <textarea
          className={panelClass}
          rows={2}
          value={prefs.prompt}
          onChange={(e) => {
            setPrefs({ ...prefs, prompt: e.target.value });
            if (improvePromptError) setImprovePromptError(null);
          }}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !isGenerating &&
              !isImprovingPrompt
            ) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="An upbeat 8-bit video game loop with a catchy melody..."
          disabled={isGenerating || isImprovingPrompt}
        />

        {improvePromptError && (
          <p className="mt-2 text-xs text-red-400">{improvePromptError}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvanced((current) => !current)}
              aria-expanded={showAdvanced}
              aria-controls="advanced-controls"
              className="inline-flex h-10 min-w-10 items-center justify-center gap-2 rounded-xl bg-surface-700 px-3 text-[11px] font-mono uppercase tracking-[0.14em] text-text-secondary transition-colors hover:bg-surface-600 hover:text-text-primary"
            >
              <SlidersHorizontal size={14} />
              Options
            </button>
            <button
              type="button"
              onClick={handleImprovePrompt}
              disabled={isPromptEmpty || isGenerating || isImprovingPrompt}
              className={`inline-flex h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl px-3 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors ${
                isPromptEmpty || isGenerating || isImprovingPrompt
                  ? "bg-surface-700 text-text-muted cursor-not-allowed"
                  : "bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary"
              }`}
            >
              {isImprovingPrompt ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Sparkles size={13} />
              )}
              {isImprovingPrompt ? "Improving..." : "Improve"}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={isGenerating || isPromptEmpty || isImprovingPrompt}
              className={`inline-flex h-10 min-w-[8.75rem] items-center justify-center rounded-xl px-4 text-sm font-medium tracking-wide transition-all ${
                isGenerating || isPromptEmpty || isImprovingPrompt
                  ? "cursor-not-allowed bg-surface-700 text-text-muted"
                  : "bg-accent text-accent-foreground hover:bg-accent-hover active:scale-[0.99]"
              }`}
            >
              {isGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  Generating...
                </span>
              ) : (
                `Generate ${prefs.attemptCount > 1 ? `(${prefs.attemptCount})` : ""}`
              )}
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className={formClass}>
      <div>
        <div
          className={`mb-3 flex ${
            isHero
              ? "flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
              : "items-baseline justify-between"
          }`}
        >
          <label className={labelClass}>Describe your music</label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleImprovePrompt}
              disabled={isPromptEmpty || isGenerating || isImprovingPrompt}
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                isPromptEmpty || isGenerating || isImprovingPrompt
                  ? "bg-surface-700 text-text-muted cursor-not-allowed"
                  : "bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary"
              }`}
            >
              {isImprovingPrompt ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              {isImprovingPrompt ? "Improving..." : "Improve prompt"}
            </button>
          </div>
        </div>

        <textarea
          className={panelClass}
          rows={isHero ? 4 : 3}
          value={prefs.prompt}
          onChange={(e) => {
            setPrefs({ ...prefs, prompt: e.target.value });
            if (improvePromptError) setImprovePromptError(null);
          }}
          onKeyDown={(e) => {
            if (
              e.key === "Enter" &&
              !e.shiftKey &&
              !isGenerating &&
              !isImprovingPrompt
            ) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="An upbeat 8-bit video game loop with a catchy melody..."
          disabled={isGenerating || isImprovingPrompt}
        />
        {improvePromptError && (
          <p className="mt-2 text-xs text-red-400">{improvePromptError}</p>
        )}
      </div>

      <div className={`grid gap-4 ${isHero ? "sm:grid-cols-[minmax(0,1fr)_auto]" : ""}`}>
        <div>
          <label className={`mb-2 block ${labelClass}`}>Model</label>
          {renderModelPicker()}
        </div>

        <div className="sm:justify-self-end">
          <label className={`mb-2 block ${labelClass}`}>Variations</label>
          {renderVariationsControl()}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        aria-expanded={showAdvanced}
        aria-controls="advanced-controls"
        className="flex items-center gap-2 text-text-secondary transition-colors hover:text-text-primary"
      >
        <ChevronDown
          size={14}
          className={`transform transition-transform ${showAdvanced ? "rotate-180" : ""}`}
        />
        <span className="font-mono text-xs uppercase tracking-wider">Advanced</span>
      </button>

      {showAdvanced && (
        <div
          id="advanced-controls"
          className="pt-1 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {renderAdvancedInputs()}
        </div>
      )}

      <button
        type="submit"
        disabled={isGenerating || isPromptEmpty || isImprovingPrompt}
        className={`w-full rounded-xl py-3.5 font-medium tracking-wide transition-all ${
          isGenerating || isPromptEmpty || isImprovingPrompt
            ? "cursor-not-allowed bg-surface-700 text-text-muted"
            : "bg-accent text-accent-foreground hover:bg-accent-hover active:scale-[0.99]"
        }`}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            Generating...
          </span>
        ) : (
          `Generate ${prefs.attemptCount > 1 ? `(${prefs.attemptCount})` : ""}`
        )}
      </button>
    </form>
  );
};

export default InputForm;
