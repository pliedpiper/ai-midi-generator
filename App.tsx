import React, { useState, useRef } from 'react';
import { AttemptResult, GenerationStatus, UserPreferences } from './types';
import { generateAttempt } from './services/openRouterService';
import { generateMidiBlob, stopPlayback } from './utils/midiUtils';
import InputForm from './components/InputForm';
import AttemptCard from './components/AttemptCard';
import { Loader, Trophy, Music } from 'lucide-react';

const App: React.FC = () => {
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [attempts, setAttempts] = useState<AttemptResult[]>([]);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize empty slots based on requested count
  const resetAttempts = (count: number) => {
    setAttempts(Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      status: 'pending'
    })));
    setPlayingId(null);
    setErrorMsg(null);
  };

  const handleGenerate = async (prefs: UserPreferences) => {
    if (!process.env.API_KEY) {
        setErrorMsg("API Key is missing. Please check your environment configuration.");
        return;
    }

    setStatus(GenerationStatus.GENERATING);
    resetAttempts(prefs.attemptCount);

    // Launch parallel attempts based on attemptCount
    const attemptPromises = Array.from({ length: prefs.attemptCount }, (_, i) => i + 1).map(async (id) => {
      try {
        // Add small delay to avoid exact same microsecond timestamp seeds if logic relies on it
        await new Promise(r => setTimeout(r, id * 100));
        
        const composition = await generateAttempt(id, prefs);
        const blob = generateMidiBlob(composition);
        
        setAttempts(prev => prev.map(a => 
          a.id === id ? { ...a, status: 'success', data: composition, midiBlob: blob } : a
        ));
        return { id, data: composition, success: true };
      } catch (err) {
        setAttempts(prev => prev.map(a => 
          a.id === id ? { ...a, status: 'failed', error: 'Failed to generate JSON' } : a
        ));
        return { id, success: false };
      }
    });

    const results = await Promise.all(attemptPromises);
    const successfulAttempts = results.filter(r => r.success);

    if (successfulAttempts.length === 0) {
      setStatus(GenerationStatus.ERROR);
      setErrorMsg("All generation attempts failed. Please try a simpler prompt.");
    } else {
      setStatus(GenerationStatus.COMPLETED);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-200 pb-20">
      {/* Navbar */}
      <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Music size={20} className="text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">
              AI MIDI Generator
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 md:p-8 space-y-8">
        
        {/* Input Section */}
        <section className="max-w-2xl mx-auto">
          <InputForm 
            onSubmit={handleGenerate} 
            isGenerating={status === GenerationStatus.GENERATING} 
          />
          {errorMsg && (
            <div className="mt-4 p-4 bg-red-900/30 border border-red-800 rounded-lg text-red-300 text-sm text-center">
              {errorMsg}
            </div>
          )}
        </section>

        {/* Grid of Attempts */}
        {attempts.length > 0 && (
          <section className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {attempts.map((attempt) => {
              return (
                <AttemptCard
                  key={attempt.id}
                  attempt={attempt}
                  isPlaying={playingId === attempt.id}
                  onPlay={(id) => {
                    setPlayingId(id);
                  }}
                  onStop={() => {
                    stopPlayback();
                    setPlayingId(null);
                  }}
                />
              );
            })}
          </section>
        )}
      </main>
    </div>
  );
};

export default App;
