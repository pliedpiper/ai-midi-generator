import React from 'react';
import { AttemptResult } from '../types';
import { Play, Square, Download, AlertCircle, CheckCircle, Music } from 'lucide-react';
import { playComposition, stopPlayback } from '../utils/midiUtils';

interface Props {
  attempt: AttemptResult;
  isPlaying: boolean;
  onPlay: (id: number) => void;
  onStop: () => void;
}

const AttemptCard: React.FC<Props> = ({ attempt, isPlaying, onPlay, onStop }) => {
  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (attempt.midiBlob) {
      const url = URL.createObjectURL(attempt.midiBlob);
      setDownloadUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [attempt.midiBlob]);

  const handlePlayToggle = () => {
    if (isPlaying) {
      onStop();
    } else if (attempt.data) {
      onPlay(attempt.id);
      playComposition(attempt.data);
    }
  };

  return (
    <div className="relative flex flex-col h-full bg-slate-800 rounded-xl border border-slate-700 hover:border-slate-500 transition-all duration-300">
      
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex justify-between items-center">
        <h3 className="font-semibold text-slate-200">Attempt {attempt.id}</h3>
        {attempt.status === 'success' && <CheckCircle size={16} className="text-green-500" />}
        {attempt.status === 'failed' && <AlertCircle size={16} className="text-red-500" />}
        {attempt.status === 'pending' && <div className="animate-spin h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full" />}
      </div>

      {/* Content */}
      <div className="p-4 flex-grow flex flex-col gap-3">
        {attempt.status === 'success' && attempt.data ? (
          <>
            <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Music size={12} className="text-blue-400" />
                        <span className="font-medium text-slate-300">{attempt.data.title || 'Untitled'}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 uppercase tracking-wider">
                        <div>Key: <span className="text-slate-300">{attempt.data.key}</span></div>
                        <div>Tempo: <span className="text-slate-300">{attempt.data.tempo} BPM</span></div>
                        <div>Time: <span className="text-slate-300">{attempt.data.timeSignature.join('/')}</span></div>
                        <div>Tracks: <span className="text-slate-300">{attempt.data.tracks.length}</span></div>
                    </div>
                </div>
            </div>
            
            <div className="flex-grow" />

            {/* Actions */}
            <div className="mt-auto flex gap-2">
              <button
                onClick={handlePlayToggle}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isPlaying 
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                    : 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20'}`}
              >
                {isPlaying ? <><Square size={16} /> Stop</> : <><Play size={16} /> Play</>}
              </button>
              
              {downloadUrl && (
                <a
                  href={downloadUrl}
                  download={`ai_midi_${attempt.id}.mid`}
                  className="flex items-center justify-center p-2 rounded-lg bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors"
                  title="Download MIDI"
                >
                  <Download size={16} />
                </a>
              )}
            </div>
          </>
        ) : attempt.status === 'failed' ? (
          <div className="text-red-400 text-sm">{attempt.error || "Generation failed"}</div>
        ) : (
          <div className="text-slate-500 text-sm italic">Composing...</div>
        )}
      </div>
    </div>
  );
};

export default AttemptCard;
