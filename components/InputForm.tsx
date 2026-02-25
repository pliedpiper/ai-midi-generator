"use client";

import React from 'react';
import { UserPreferences } from '../types';
import { AVAILABLE_MODELS, DEFAULT_PREFERENCES } from '../constants';
import { parseKeyString } from '../utils/scaleUtils';
import { ChevronDown, Loader2, Sparkles } from 'lucide-react';
import { improvePrompt } from '../services/openRouterService';

interface Props {
  onSubmit: (prefs: UserPreferences) => void;
  isGenerating: boolean;
  variant?: 'default' | 'hero';
  promptSuggestion?: string | null;
}

const InputForm: React.FC<Props> = ({
  onSubmit,
  isGenerating,
  variant = 'default',
  promptSuggestion = null,
}) => {
  const [prefs, setPrefs] = React.useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const [isImprovingPrompt, setIsImprovingPrompt] = React.useState(false);
  const [improvePromptError, setImprovePromptError] = React.useState<string | null>(null);

  const isHero = variant === 'hero';
  const isPromptEmpty = !prefs.prompt.trim();
  const sortedAvailableModels = React.useMemo(
    () => [...AVAILABLE_MODELS].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })),
    []
  );

  const buildSubmissionPrefs = React.useCallback((): UserPreferences => ({
    ...prefs,
    tempo: Number.isFinite(prefs.tempo) ? prefs.tempo : DEFAULT_PREFERENCES.tempo,
    key: typeof prefs.key === 'string' && prefs.key.trim() ? prefs.key.trim() : DEFAULT_PREFERENCES.key,
    timeSignature: typeof prefs.timeSignature === 'string' && prefs.timeSignature.trim()
      ? prefs.timeSignature.trim()
      : DEFAULT_PREFERENCES.timeSignature,
    durationBars: Number.isFinite(prefs.durationBars) ? prefs.durationBars : DEFAULT_PREFERENCES.durationBars
  }), [prefs]);

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
        constraints: normalizedPrefs.constraints
      });
      setPrefs(prev => ({ ...prev, prompt: improved }));
    } catch (error) {
      setImprovePromptError(
        error instanceof Error ? error.message : 'Failed to improve prompt.'
      );
    } finally {
      setIsImprovingPrompt(false);
    }
  };

  const formClass = isHero
    ? 'space-y-5 rounded-[1.75rem] border border-surface-600/70 bg-surface-800/70 p-4 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-6 md:p-7'
    : 'space-y-6';

  const labelClass = isHero
    ? 'font-mono text-[11px] uppercase tracking-[0.17em] text-text-muted'
    : 'font-mono text-xs text-text-muted uppercase tracking-wider';

  const panelClass = isHero
    ? 'w-full rounded-2xl border border-surface-600/70 bg-surface-900/60 px-4 py-4 text-text-primary placeholder-text-muted/60 outline-none transition-colors focus:border-accent focus:ring-0 resize-none font-light'
    : 'w-full bg-surface-800 border border-surface-600 rounded px-4 py-3 text-text-primary placeholder-text-muted/50 focus:border-accent focus:ring-0 outline-none transition-colors resize-none font-light';

  const selectClass = isHero
    ? 'w-full appearance-none rounded-xl border border-surface-600/70 bg-surface-900/70 px-4 py-2.5 text-text-primary outline-none transition-colors focus:border-accent focus:ring-0 cursor-pointer font-light'
    : 'w-full appearance-none bg-surface-800 border border-surface-600 rounded px-4 py-3 text-text-primary focus:border-accent focus:ring-0 outline-none transition-colors cursor-pointer font-light';

  const inputClass = isHero
    ? 'w-full rounded-xl border border-surface-600/70 bg-surface-900/70 px-3 py-2 text-sm text-text-primary outline-none transition-colors focus:border-accent font-light'
    : 'w-full bg-surface-800 border border-surface-600 rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none transition-colors font-light';

  return (
    <form onSubmit={handleSubmit} className={formClass}>
      <div>
        <div className={`mb-3 flex ${isHero ? 'flex-col gap-3 sm:flex-row sm:items-center sm:justify-between' : 'items-baseline justify-between'}`}>
          <label className={labelClass}>
            Describe your music
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleImprovePrompt}
              disabled={isPromptEmpty || isGenerating || isImprovingPrompt}
              className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-wider transition-colors ${
                isPromptEmpty || isGenerating || isImprovingPrompt
                  ? 'bg-surface-700 text-text-muted cursor-not-allowed'
                  : 'bg-surface-700 text-text-secondary hover:bg-surface-600 hover:text-text-primary'
              }`}
            >
              {isImprovingPrompt ? (
                <Loader2 size={12} className="animate-spin" />
              ) : (
                <Sparkles size={12} />
              )}
              {isImprovingPrompt ? 'Improving...' : 'Improve prompt'}
            </button>
            <span className="font-mono text-[10px] text-text-muted/70">
              Cmd/Ctrl+Enter to submit
            </span>
          </div>
        </div>

        <textarea
          className={panelClass}
          rows={isHero ? 4 : 3}
          value={prefs.prompt}
          onChange={e => {
            setPrefs({ ...prefs, prompt: e.target.value });
            if (improvePromptError) setImprovePromptError(null);
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isGenerating && !isImprovingPrompt) {
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

      <div className={`grid gap-4 ${isHero ? 'sm:grid-cols-[minmax(0,1fr)_auto]' : ''}`}>
        <div>
          <label className={`mb-2 block ${labelClass}`}>
            Model
          </label>
          <div className="relative">
            <select
              className={selectClass}
              value={prefs.model}
              onChange={e => setPrefs({ ...prefs, model: e.target.value })}
              disabled={isGenerating}
            >
              {sortedAvailableModels.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-muted" />
          </div>
        </div>

        <div className="sm:justify-self-end">
          <label className={`mb-2 block ${labelClass}`}>
            Variations
          </label>
          <div className={`rounded-xl border border-surface-600/70 ${isHero ? 'bg-surface-900/65 px-4 py-3 sm:min-w-[16rem]' : 'bg-surface-800 px-4 py-3'}`}>
            <div className="mb-3 flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-text-muted">Count</span>
              <span className="font-mono text-base font-medium text-accent">{prefs.attemptCount}</span>
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
                onChange={(e) => setPrefs({...prefs, attemptCount: parseInt(e.target.value, 10)})}
                className="relative z-10 w-full cursor-pointer bg-transparent"
                disabled={isGenerating}
              />
            </div>
            <div className="mt-2 flex justify-between font-mono text-[10px] text-text-muted">
              <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
            </div>
          </div>
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
          className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
        />
        <span className="font-mono text-xs uppercase tracking-wider">Advanced</span>
      </button>

      {showAdvanced && (
        <div id="advanced-controls" className="grid grid-cols-1 gap-4 pt-1 animate-in fade-in slide-in-from-top-2 duration-200 sm:grid-cols-2">
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
              value={typeof prefs.tempo === 'number' && Number.isFinite(prefs.tempo) ? prefs.tempo : ''}
              onChange={e => {
                const value = e.target.value;
                setPrefs({
                  ...prefs,
                  tempo: value === '' ? NaN : parseInt(value, 10)
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
              value={prefs.key ?? ''}
              onChange={e => {
                const newKey = e.target.value;
                const parsed = parseKeyString(newKey);
                if (parsed) {
                  setPrefs({ ...prefs, key: newKey, scaleRoot: parsed.scaleRoot, scaleType: parsed.scaleType });
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
              value={prefs.timeSignature ?? ''}
              onChange={e => setPrefs({ ...prefs, timeSignature: e.target.value })}
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
              value={typeof prefs.durationBars === 'number' && Number.isFinite(prefs.durationBars) ? prefs.durationBars : ''}
              onChange={e => {
                const value = e.target.value;
                setPrefs({
                  ...prefs,
                  durationBars: value === '' ? NaN : parseInt(value, 10)
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
              onChange={e => setPrefs({ ...prefs, constraints: e.target.value })}
              placeholder="No drums, focus on melody..."
              disabled={isGenerating}
            />
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={isGenerating || isPromptEmpty || isImprovingPrompt}
        className={`w-full rounded-xl py-3.5 font-medium tracking-wide transition-all ${
          isGenerating || isPromptEmpty || isImprovingPrompt
            ? 'cursor-not-allowed bg-surface-700 text-text-muted'
            : 'bg-accent text-accent-foreground hover:bg-accent-hover active:scale-[0.99]'
        }`}
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={18} className="animate-spin" />
            Generating...
          </span>
        ) : (
          `Generate ${prefs.attemptCount > 1 ? `(${prefs.attemptCount})` : ''}`
        )}
      </button>
    </form>
  );
};

export default InputForm;
