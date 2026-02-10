// @vitest-environment jsdom

import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import LandingPlaybackDemo from "@/components/landing/LandingPlaybackDemo";
import { HERO_DEMO_COMPOSITION } from "@/components/landing/landingData";

const generateMidiBlobMock = vi.hoisted(() => vi.fn());
const stopPlaybackMock = vi.hoisted(() => vi.fn());
const playCompositionMock = vi.hoisted(() => vi.fn());
const getTransportBeatPositionMock = vi.hoisted(() => vi.fn());
const createObjectURLMock = vi.hoisted(() => vi.fn(() => "blob:landing-demo"));
const revokeObjectURLMock = vi.hoisted(() => vi.fn());

vi.mock("@/components/PianoRoll", () => ({
  default: () => <div data-testid="landing-piano-roll" />,
}));

vi.mock("@/utils/midiUtils", () => ({
  generateMidiBlob: generateMidiBlobMock,
  stopPlayback: stopPlaybackMock,
  playComposition: playCompositionMock,
  getTransportBeatPosition: getTransportBeatPositionMock,
  PlaybackError: class PlaybackError extends Error {},
}));

describe("LandingPlaybackDemo UI", () => {
  beforeEach(() => {
    generateMidiBlobMock.mockReset();
    stopPlaybackMock.mockReset();
    playCompositionMock.mockReset();
    getTransportBeatPositionMock.mockReset();
    createObjectURLMock.mockClear();
    revokeObjectURLMock.mockClear();

    generateMidiBlobMock.mockReturnValue(new Blob(["demo"], { type: "audio/midi" }));
    playCompositionMock.mockResolvedValue(undefined);
    getTransportBeatPositionMock.mockReturnValue(0);

    vi.stubGlobal("requestAnimationFrame", vi.fn(() => 1));
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    vi.stubGlobal("URL", {
      createObjectURL: createObjectURLMock,
      revokeObjectURL: revokeObjectURLMock,
    });
  });

  it("starts and stops playback using the shared MIDI utilities", async () => {
    render(<LandingPlaybackDemo />);

    fireEvent.click(screen.getByRole("button", { name: "Play" }));

    await waitFor(() => {
      expect(playCompositionMock).toHaveBeenCalledWith(HERO_DEMO_COMPOSITION);
    });
    expect(screen.getByRole("button", { name: "Stop" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Stop" }));

    expect(stopPlaybackMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  });

  it("shows playback errors and performs cleanup", async () => {
    playCompositionMock.mockRejectedValueOnce(new Error("Audio blocked"));
    render(<LandingPlaybackDemo />);

    fireEvent.click(screen.getByRole("button", { name: "Play" }));

    await waitFor(() => {
      expect(screen.getByText("Playback error: Audio blocked")).toBeTruthy();
    });
    expect(stopPlaybackMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Play" })).toBeTruthy();
  });

  it("stops playback on unmount", () => {
    const { unmount } = render(<LandingPlaybackDemo />);
    unmount();

    expect(stopPlaybackMock).toHaveBeenCalledTimes(1);
  });
});
