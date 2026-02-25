// @vitest-environment jsdom

import React from "react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("submits explicit advanced fields by default", () => {
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
      tempo: DEFAULT_PREFERENCES.tempo,
      key: DEFAULT_PREFERENCES.key,
      timeSignature: DEFAULT_PREFERENCES.timeSignature,
      durationBars: DEFAULT_PREFERENCES.durationBars,
      attemptCount: DEFAULT_PREFERENCES.attemptCount,
    });
  });

  it("submits explicit tempo when advanced tempo is edited", () => {
    const onSubmit = vi.fn();
    render(<InputForm onSubmit={onSubmit} isGenerating={false} />);

    fireEvent.click(screen.getByRole("button", { name: /Advanced/i }));

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

  it("groups models by provider and filters them via search", async () => {
    const onSubmit = vi.fn();
    render(<InputForm onSubmit={onSubmit} isGenerating={false} />);

    fireEvent.click(screen.getByRole("button", { name: /Model selector/i }));
    const listbox = screen.getByRole("listbox", { name: /Model options/i });
    const initialGroups = within(listbox)
      .getAllByRole("group")
      .map(group => group.getAttribute("aria-label") ?? "");

    expect(initialGroups.length).toBeGreaterThan(1);
    expect(initialGroups).toEqual(
      [...initialGroups].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: "base" }))
    );

    fireEvent.change(screen.getByLabelText(/Search models/i), { target: { value: "openai" } });

    await waitFor(() => {
      const filteredGroups = within(listbox).getAllByRole("group");
      expect(filteredGroups).toHaveLength(1);
      expect(filteredGroups[0]?.getAttribute("aria-label")).toBe("OpenAI");
    });

    const filteredOptions = within(listbox).getAllByRole("option");
    expect(filteredOptions.length).toBeGreaterThan(0);
    filteredOptions.forEach(option => {
      expect(option.textContent?.toLowerCase().includes("openai/")).toBe(true);
    });

    fireEvent.click(filteredOptions[0]);

    await waitFor(() => {
      expect(screen.queryByRole("listbox", { name: /Model options/i })).toBeNull();
    });
  });
});
