import { beforeEach, describe, expect, it, vi } from "vitest";
import type { MidiComposition } from "@/types";

const toneState = vi.hoisted(() => ({
  start: vi.fn<() => Promise<void>>(),
  transportStop: vi.fn(),
  transportCancel: vi.fn(),
  transportStart: vi.fn(),
  transport: {
    stop: vi.fn(),
    cancel: vi.fn(),
    start: vi.fn(),
    bpm: { value: 120 },
    timeSignature: [4, 4] as [number, number],
    seconds: 0,
  },
  synthInstances: [] as Array<{ dispose: ReturnType<typeof vi.fn>; volume: { value: number }; toDestination: () => unknown; triggerAttackRelease: ReturnType<typeof vi.fn> }>,
  partInstances: [] as Array<{ dispose: ReturnType<typeof vi.fn>; start: ReturnType<typeof vi.fn> }>,
}));

vi.mock("tone", () => {
  toneState.start.mockResolvedValue(undefined);

  toneState.transport.stop = toneState.transportStop;
  toneState.transport.cancel = toneState.transportCancel;
  toneState.transport.start = toneState.transportStart;

  class PolySynthMock {
    volume = { value: 0 };
    dispose = vi.fn();
    triggerAttackRelease = vi.fn();

    toDestination() {
      return this;
    }

    constructor() {
      toneState.synthInstances.push(this);
    }
  }

  class PartMock {
    dispose = vi.fn();
    start = vi.fn(() => this);

    constructor() {
      toneState.partInstances.push(this);
    }
  }

  return {
    start: toneState.start,
    Transport: toneState.transport,
    PolySynth: PolySynthMock,
    Synth: class SynthMock {},
    Part: PartMock,
    Frequency: () => ({
      toNote: () => "C4",
    }),
  };
});

const composition: MidiComposition = {
  title: "Playback Boundary Test",
  tempo: 120,
  timeSignature: [4, 4],
  key: "C Major",
  tracks: [
    {
      name: "Piano",
      programNumber: 0,
      notes: [{ midi: 60, time: 0, duration: 1, velocity: 0.8 }],
    },
  ],
};

describe("playback boundaries", () => {
  beforeEach(() => {
    vi.resetModules();
    toneState.start.mockClear();
    toneState.transportStop.mockClear();
    toneState.transportCancel.mockClear();
    toneState.transportStart.mockClear();
    toneState.synthInstances.length = 0;
    toneState.partInstances.length = 0;
  });

  it("starts transport and invokes cleanup at playback start", async () => {
    const { playComposition } = await import("../utils/midiUtils");
    await playComposition(composition);

    expect(toneState.start).toHaveBeenCalledTimes(1);
    expect(toneState.transportStop).toHaveBeenCalledTimes(1);
    expect(toneState.transportCancel).toHaveBeenCalledTimes(1);
    expect(toneState.transportStart).toHaveBeenCalledTimes(1);
    expect(toneState.synthInstances.length).toBe(1);
    expect(toneState.partInstances.length).toBe(1);
  });

  it("disposes prior synths/parts when playback restarts", async () => {
    const { playComposition } = await import("../utils/midiUtils");

    await playComposition(composition);
    const firstSynth = toneState.synthInstances[0];
    const firstPart = toneState.partInstances[0];

    await playComposition(composition);

    expect(firstSynth?.dispose).toHaveBeenCalledTimes(1);
    expect(firstPart?.dispose).toHaveBeenCalledTimes(1);
    expect(toneState.synthInstances.length).toBe(2);
    expect(toneState.partInstances.length).toBe(2);
  });
});
