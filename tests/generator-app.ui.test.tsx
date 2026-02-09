// @vitest-environment jsdom

import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import GeneratorApp from "../components/GeneratorApp";
import type { MidiComposition } from "../types";

const generateAttemptMock = vi.hoisted(() => vi.fn());
const generateMidiBlobMock = vi.hoisted(() => vi.fn());
const stopPlaybackMock = vi.hoisted(() => vi.fn());
const playCompositionMock = vi.hoisted(() => vi.fn());
const getTransportBeatPositionMock = vi.hoisted(() => vi.fn());

vi.mock("../services/openRouterService", () => ({
  generateAttempt: generateAttemptMock,
}));

vi.mock("../utils/midiUtils", () => ({
  generateMidiBlob: generateMidiBlobMock,
  stopPlayback: stopPlaybackMock,
  playComposition: playCompositionMock,
  PlaybackError: class PlaybackError extends Error {},
  getTransportBeatPosition: getTransportBeatPositionMock,
}));

vi.mock("../components/AppHeader", () => ({
  default: ({ userEmail }: { userEmail: string }) => (
    <div data-testid="app-header">{userEmail}</div>
  ),
}));

vi.mock("../components/AttemptCard", () => ({
  default: ({ attempt }: { attempt: { id: number; status: string } }) => (
    <div data-testid={`attempt-${attempt.id}`}>{attempt.status}</div>
  ),
}));

vi.mock("../components/ExpandedAttemptModal", () => ({
  default: () => null,
}));

const successfulComposition: MidiComposition = {
  title: "UI Test Composition",
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

describe("GeneratorApp UI", () => {
  beforeEach(() => {
    generateAttemptMock.mockReset();
    generateMidiBlobMock.mockReset();
    stopPlaybackMock.mockReset();
    playCompositionMock.mockReset();
    getTransportBeatPositionMock.mockReset();

    generateAttemptMock.mockResolvedValue(successfulComposition);
    generateMidiBlobMock.mockReturnValue(new Blob(["midi"], { type: "audio/midi" }));
    playCompositionMock.mockResolvedValue(undefined);
    getTransportBeatPositionMock.mockReturnValue(0);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ configured: true }),
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("requires key setup first, then generates attempts", async () => {
    render(<GeneratorApp userEmail="user@example.com" initialHasApiKey={false} />);

    expect(screen.getByText(/Add OpenRouter API Key/i)).toBeTruthy();

    fireEvent.change(screen.getByPlaceholderText("sk-or-..."), {
      target: { value: "sk-or-test-key" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save key" }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/An upbeat 8-bit video game loop/i)).toBeTruthy();
    });

    fireEvent.change(screen.getByPlaceholderText(/An upbeat 8-bit video game loop/i), {
      target: { value: "A short piano idea for UI test" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Generate/ }));

    await waitFor(
      () => {
        expect(generateAttemptMock).toHaveBeenCalledTimes(5);
      },
      { timeout: 2500 }
    );

    expect(stopPlaybackMock).toHaveBeenCalled();
    expect(screen.getByText("Results")).toBeTruthy();
  });
});
