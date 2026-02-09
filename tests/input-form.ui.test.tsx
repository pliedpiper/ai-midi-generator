// @vitest-environment jsdom

import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import InputForm from "@/components/InputForm";
import { DEFAULT_PREFERENCES } from "@/constants";

const improvePromptMock = vi.hoisted(() => vi.fn());

vi.mock("@/services/openRouterService", () => ({
  improvePrompt: improvePromptMock,
}));

describe("InputForm UI", () => {
  beforeEach(() => {
    improvePromptMock.mockReset();
  });

  it("submits with model-decided advanced fields by default", () => {
    const onSubmit = vi.fn();
    render(<InputForm onSubmit={onSubmit} isGenerating={false} />);

    fireEvent.change(
      screen.getByPlaceholderText(/An upbeat 8-bit video game loop/i),
      { target: { value: "A soft ambient piano loop." } }
    );
    fireEvent.click(screen.getByRole("button", { name: /Generate/ }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0]?.[0];
    expect(submitted).toMatchObject({
      prompt: "A soft ambient piano loop.",
      model: DEFAULT_PREFERENCES.model,
      tempo: null,
      key: null,
      timeSignature: null,
      durationBars: null,
      attemptCount: DEFAULT_PREFERENCES.attemptCount,
    });
  });

  it("submits explicit tempo when tempo auto toggle is disabled", () => {
    const onSubmit = vi.fn();
    render(<InputForm onSubmit={onSubmit} isGenerating={false} />);

    fireEvent.click(screen.getByRole("button", { name: /Advanced/i }));

    const autoToggles = screen.getAllByRole("checkbox", {
      name: /Let model decide/i,
    });
    fireEvent.click(autoToggles[0]!);

    const tempoInput = screen.getAllByRole("spinbutton")[0];
    fireEvent.change(tempoInput, { target: { value: "142" } });

    fireEvent.change(
      screen.getByPlaceholderText(/An upbeat 8-bit video game loop/i),
      { target: { value: "A focused synth arpeggio idea." } }
    );
    fireEvent.click(screen.getByRole("button", { name: /Generate/ }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0]?.[0];
    expect(submitted.tempo).toBe(142);
  });

  it("improves prompt in-place through API helper", async () => {
    improvePromptMock.mockResolvedValueOnce("Improved prompt text");
    const onSubmit = vi.fn();
    render(<InputForm onSubmit={onSubmit} isGenerating={false} />);

    const promptInput = screen.getByPlaceholderText(/An upbeat 8-bit video game loop/i);
    fireEvent.change(promptInput, { target: { value: "basic prompt" } });
    fireEvent.click(screen.getByRole("button", { name: /Improve prompt/i }));

    await waitFor(() => {
      expect(improvePromptMock).toHaveBeenCalledTimes(1);
      expect((promptInput as HTMLTextAreaElement).value).toBe("Improved prompt text");
    });
  });
});
