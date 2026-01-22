import { MidiComposition } from '../types';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';

// Helper to convert our JSON composition to a Tone.js Midi object
export const createMidiObject = (composition: MidiComposition): Midi => {
  // We need to calculate seconds from beats because @tonejs/midi expects time/duration in seconds
  // Formula: seconds = beats * (60 / BPM)
  const secondsPerBeat = 60 / composition.tempo;
  const [num, den] = composition.timeSignature;
  
  const midi = new Midi();
  midi.name = composition.title;
  midi.header.setTempo(composition.tempo);
  midi.header.timeSignatures.push({ ticks: 0, timeSignature: [num, den] });
  
  composition.tracks.forEach(trackData => {
    const track = midi.addTrack();
    track.name = trackData.name;
    track.instrument.number = trackData.programNumber;
    
    // Heuristic: If track name contains "drum", set to channel 9 (percussion channel in GM)
    track.channel = trackData.name.toLowerCase().includes('drum') ? 9 : 0;

    trackData.notes.forEach(note => {
      track.addNote({
        midi: note.midi,
        // Conversion: AI gives us Beats, Library wants Seconds.
        time: note.time * secondsPerBeat,
        duration: note.duration * secondsPerBeat,
        velocity: typeof note.velocity === 'number' ? note.velocity : 0.8
      });
    });
  });

  return midi;
};

export const generateMidiBlob = (composition: MidiComposition): Blob => {
  const midi = createMidiObject(composition);
  const arrayBuffer = midi.toArray();
  return new Blob([arrayBuffer], { type: 'audio/midi' });
};

// Playback engine
let synths: Tone.PolySynth[] = [];
let sequencePart: Tone.Part | null = null;

export const stopPlayback = () => {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  synths.forEach(s => s.dispose());
  synths = [];
  if (sequencePart) {
    sequencePart.dispose();
    sequencePart = null;
  }
};

export const playComposition = async (composition: MidiComposition) => {
  await Tone.start();
  stopPlayback();

  Tone.Transport.bpm.value = composition.tempo;
  Tone.Transport.timeSignature = composition.timeSignature;

  const secondsPerBeat = 60 / composition.tempo;

  // Create a synth for each track
  composition.tracks.forEach(track => {
    // Simple synth selection based on track name/program
    const synth = new Tone.PolySynth(Tone.Synth, {
      envelope: { attack: 0.02, decay: 0.1, sustain: 0.3, release: 1 }
    }).toDestination();
    
    // Lower volume a bit to prevent clipping with multiple tracks
    synth.volume.value = -6; 
    synths.push(synth);

    const notesForTone = track.notes.map(n => ({
      // Tone.Part expects seconds for time/duration
      time: n.time * secondsPerBeat,
      note: Tone.Frequency(n.midi, "midi").toNote(),
      duration: n.duration * secondsPerBeat,
      velocity: n.velocity
    }));

    const part = new Tone.Part((time, value) => {
      synth.triggerAttackRelease(value.note, value.duration, time, value.velocity);
    }, notesForTone).start(0);
    
    // We aren't tracking parts individually for cleanup in this simple demo, 
    // relying on Transport.cancel() but for robustness we could.
  });

  Tone.Transport.start();
};