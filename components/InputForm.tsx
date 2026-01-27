"use client";

import React from 'react';
import { UserPreferences } from '../types';
import { AVAILABLE_MODELS, DEFAULT_PREFERENCES } from '../constants';
import { ChevronDown, Loader2 } from 'lucide-react';

interface Props {
  onSubmit: (prefs: UserPreferences) => void;
  isGenerating: boolean;
}

const InputForm: React.FC<Props> = ({ onSubmit, isGenerating }) => {
  const [prefs, setPrefs] = React.useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const isPromptEmpty = !prefs.prompt.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isPromptEmpty) return;
    const normalizedPrefs: UserPreferences = {
      ...prefs,
      tempo: Number.isFinite(prefs.tempo) ? prefs.tempo : DEFAULT_PREFERENCES.tempo,
      durationBars: Number.isFinite(prefs.durationBars) ? prefs.durationBars : DEFAULT_PREFERENCES.durationBars
    };
    onSubmit(normalizedPrefs);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Prompt */}
      <div>
        <div className="flex justify-between items-baseline mb-3">
          <label className="font-mono text-xs text-text-muted uppercase tracking-wider">
            Describe your music
          </label>
          <span className="text-[10px] text-text-muted/60 font-mono">
            ⌘/Ctrl+Enter to submit
          </span>
        </div>
        <textarea
          className="w-full bg-surface-800 border border-surface-600 rounded px-4 py-3 text-text-primary placeholder-text-muted/50 focus:border-accent focus:ring-0 outline-none transition-colors resize-none font-light"
          rows={3}
          value={prefs.prompt}
          onChange={e => setPrefs({ ...prefs, prompt: e.target.value })}
          onKeyDown={e => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !isGenerating) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder="An upbeat 8-bit video game loop with a catchy melody..."
          disabled={isGenerating}
        />
      </div>

      {/* Model Select */}
      <div>
        <label className="block font-mono text-xs text-text-muted uppercase tracking-wider mb-3">
          Model
        </label>
        <div className="relative">
          <select
            className="w-full appearance-none bg-surface-800 border border-surface-600 rounded px-4 py-3 text-text-primary focus:border-accent focus:ring-0 outline-none transition-colors cursor-pointer font-light"
            value={prefs.model}
            onChange={e => setPrefs({ ...prefs, model: e.target.value })}
            disabled={isGenerating}
          >
            {AVAILABLE_MODELS.map(model => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
        </div>
      </div>

      {/* Advanced Toggle */}
      <button
        type="button"
        onClick={() => setShowAdvanced(!showAdvanced)}
        aria-expanded={showAdvanced}
        aria-controls="advanced-controls"
        className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
      >
        <ChevronDown
          size={14}
          className={`transform transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
        />
        <span className="font-mono text-xs uppercase tracking-wider">Advanced</span>
      </button>

      {/* Advanced Controls */}
      {showAdvanced && (
        <div id="advanced-controls" className="grid grid-cols-2 gap-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <div>
            <label className="block font-mono text-[10px] text-text-muted uppercase tracking-wider mb-2">
              Tempo
            </label>
            <input
              type="number"
              step="1"
              min="20"
              max="300"
              className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none transition-colors font-light"
              value={Number.isFinite(prefs.tempo) ? prefs.tempo : ''}
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
            <label className="block font-mono text-[10px] text-text-muted uppercase tracking-wider mb-2">
              Key
            </label>
            <input
              type="text"
              className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none transition-colors font-light"
              value={prefs.key}
              onChange={e => setPrefs({ ...prefs, key: e.target.value })}
              disabled={isGenerating}
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] text-text-muted uppercase tracking-wider mb-2">
              Time Sig
            </label>
            <input
              type="text"
              className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none transition-colors font-light"
              value={prefs.timeSignature}
              onChange={e => setPrefs({ ...prefs, timeSignature: e.target.value })}
              disabled={isGenerating}
            />
          </div>
          <div>
            <label className="block font-mono text-[10px] text-text-muted uppercase tracking-wider mb-2">
              Bars
            </label>
            <input
              type="number"
              step="1"
              min="1"
              max="64"
              className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-2 text-sm text-text-primary focus:border-accent outline-none transition-colors font-light"
              value={Number.isFinite(prefs.durationBars) ? prefs.durationBars : ''}
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
          <div className="col-span-2">
            <label className="block font-mono text-[10px] text-text-muted uppercase tracking-wider mb-2">
              Constraints
            </label>
            <input
              type="text"
              className="w-full bg-surface-800 border border-surface-600 rounded px-3 py-2 text-sm text-text-primary placeholder-text-muted/50 focus:border-accent outline-none transition-colors font-light"
              value={prefs.constraints}
              onChange={e => setPrefs({ ...prefs, constraints: e.target.value })}
              placeholder="No drums, focus on melody..."
              disabled={isGenerating}
            />
          </div>
        </div>
      )}

      {/* Variations Slider */}
      <div className="pt-2">
        <div className="flex justify-between items-baseline mb-4">
          <label className="font-mono text-xs text-text-muted uppercase tracking-wider">
            Variations
          </label>
          <span className="font-mono text-lg text-accent font-medium">
            {prefs.attemptCount}
          </span>
        </div>
        <div className="relative">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-surface-500 rounded -translate-y-1/2 pointer-events-none" />
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={prefs.attemptCount}
            onChange={(e) => setPrefs({...prefs, attemptCount: parseInt(e.target.value, 10)})}
            className="relative w-full cursor-pointer bg-transparent"
            disabled={isGenerating}
          />
        </div>
        <div className="flex justify-between text-[10px] text-text-muted mt-2 font-mono">
          <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isGenerating || isPromptEmpty}
        className={`w-full py-3.5 rounded font-medium tracking-wide transition-all ${
          isGenerating || isPromptEmpty
            ? 'bg-surface-700 text-text-muted cursor-not-allowed'
            : 'bg-accent text-surface-900 hover:bg-accent-hover active:scale-[0.99]'
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
