import React from 'react';
import { UserPreferences } from '../types';
import { AVAILABLE_MODELS, DEFAULT_PREFERENCES } from '../constants';
import { Music, Sliders, Zap } from 'lucide-react';

interface Props {
  onSubmit: (prefs: UserPreferences) => void;
  isGenerating: boolean;
}

const InputForm: React.FC<Props> = ({ onSubmit, isGenerating }) => {
  const [prefs, setPrefs] = React.useState<UserPreferences>(DEFAULT_PREFERENCES);
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(prefs);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700">
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Describe your music
        </label>
        <textarea
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
          rows={3}
          value={prefs.prompt}
          onChange={e => setPrefs({ ...prefs, prompt: e.target.value })}
          placeholder="e.g. An upbeat 8-bit video game loop with a catchy melody"
          disabled={isGenerating}
        />
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Model
        </label>
        <select
          className="w-full bg-slate-900 border border-slate-700 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
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
      </div>

      <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setShowAdvanced(!showAdvanced)}>
        <span className="text-sm font-semibold text-slate-400 flex items-center gap-2">
          <Sliders size={16} /> Advanced Controls
        </span>
        <span className="text-xs text-blue-400 hover:text-blue-300">
          {showAdvanced ? 'Hide' : 'Show'}
        </span>
      </div>

      {showAdvanced && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 animate-in fade-in slide-in-from-top-2 duration-300">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tempo (BPM)</label>
            <input
              type="number"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
              value={prefs.tempo}
              onChange={e => setPrefs({ ...prefs, tempo: parseInt(e.target.value) || 120 })}
              disabled={isGenerating}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Key</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
              value={prefs.key}
              onChange={e => setPrefs({ ...prefs, key: e.target.value })}
              disabled={isGenerating}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Time Sig</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
              value={prefs.timeSignature}
              onChange={e => setPrefs({ ...prefs, timeSignature: e.target.value })}
              disabled={isGenerating}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Length (Bars)</label>
            <input
              type="number"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
              value={prefs.durationBars}
              onChange={e => setPrefs({ ...prefs, durationBars: parseInt(e.target.value) || 8 })}
              disabled={isGenerating}
            />
          </div>
          <div className="col-span-2 md:col-span-4">
            <label className="block text-xs text-slate-400 mb-1">Style Constraints</label>
            <input
              type="text"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm"
              value={prefs.constraints}
              onChange={e => setPrefs({ ...prefs, constraints: e.target.value })}
              placeholder="e.g. No drums, Use arpeggios"
              disabled={isGenerating}
            />
          </div>
        </div>
      )}

      <div className="mb-6 bg-slate-900/50 p-4 rounded-lg border border-slate-700/50">
         <div className="flex justify-between items-center mb-2">
           <label className="text-sm font-medium text-slate-300">
              Number of Variations
           </label>
           <span className="text-xs font-bold bg-blue-600 px-2 py-0.5 rounded text-white">
             {prefs.attemptCount}
           </span>
         </div>
         <input 
            type="range" 
            min="1" 
            max="5" 
            step="1"
            value={prefs.attemptCount} 
            onChange={(e) => setPrefs({...prefs, attemptCount: parseInt(e.target.value)})}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            disabled={isGenerating}
         />
         <div className="flex justify-between text-[10px] text-slate-500 mt-1 px-1">
            <span>1</span><span>2</span><span>3</span><span>4</span><span>5</span>
         </div>
      </div>

      <button
        type="submit"
        disabled={isGenerating}
        className={`w-full flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-bold text-white transition-all
          ${isGenerating 
            ? 'bg-slate-600 cursor-not-allowed opacity-50' 
            : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-lg shadow-blue-900/20 active:scale-[0.98]'
          }`}
      >
        {isGenerating ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            Composing...
          </>
        ) : (
          <>
            <Zap size={20} />
            Generate (x{prefs.attemptCount})
          </>
        )}
      </button>
    </form>
  );
};

export default InputForm;
