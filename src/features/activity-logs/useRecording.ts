import { useEffect, useState } from "react";
import { recordingUrl } from "./api";
import { computePeaks } from "./audioSamples";

type Recording = { url: string; peaks: number[] };
export function useRecording(path: string | null) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string;
    recording?: Recording;
    error?: string;
  }>({ key: "" });
  const key = JSON.stringify([path, attempt]);
  useEffect(() => {
    if (!path) return;
    let active = true;
    let url: string | undefined;
    const controller = new AbortController();
    async function load() {
      const response = await fetch(await recordingUrl(path!), {
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error("The recording couldn't be loaded. Please retry.");
      const blob = await response.blob();
      let context: AudioContext | undefined;
      let peaks: number[] = [];
      try {
        context = new AudioContext();
        const audio = await context.decodeAudioData(await blob.arrayBuffer());
        const samples = new Float32Array(audio.length);
        for (let channel = 0; channel < audio.numberOfChannels; channel++) {
          const data = audio.getChannelData(channel);
          for (let i = 0; i < samples.length; i++)
            samples[i] = Math.max(samples[i], Math.abs(data[i]));
        }
        peaks = computePeaks(samples);
      } catch {
        // A waveform decoding failure must not prevent normal media playback.
      } finally {
        void context?.close();
      }
      if (!active) return;
      url = URL.createObjectURL(blob);
      setState({ key, recording: { url, peaks } });
    }
    void load().catch((error) => {
      if (active)
        setState({
          key,
          error:
            error instanceof Error
              ? error.message
              : "Couldn't load the recording.",
        });
    });
    return () => {
      active = false;
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [key, path]);
  const current = state.key === key ? state : undefined;
  return {
    recording: current?.recording ?? null,
    loading: Boolean(path) && !current,
    error: current?.error,
    prepare: () => setAttempt((value) => value + 1),
  };
}
