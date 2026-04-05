import type { MidiComposition } from "../types";
import { buildMidiDownloadFilename } from "./downloadFilename";
import { generateMidiBlob } from "./midiUtils";

type DownloadMidiCompositionInput = {
  composition: MidiComposition;
  title?: string | null;
  fallbackTitle: string;
};

export const downloadMidiComposition = async ({
  composition,
  title,
  fallbackTitle,
}: DownloadMidiCompositionInput): Promise<void> => {
  const blob = await generateMidiBlob(composition);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = buildMidiDownloadFilename({
    title: title || composition.title,
    key: composition.key,
    tempo: composition.tempo,
    fallbackTitle,
  });

  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
