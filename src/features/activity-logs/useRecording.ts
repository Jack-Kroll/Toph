import { useEffect, useState } from "react";
import { recordingUrl } from "./api";

export const BAR_COUNT = 98;

type Recording = { url: string; peaks: number[] };

// Decoded once per file for the session; re-expanding a row is instant.
const cache = new Map<string, Promise<Recording>>();

/** Loudest sample in each of BAR_COUNT slices, scaled so the peak is 1. */
export function computePeaks(samples: Float32Array, count = BAR_COUNT) {
  const size = Math.max(1, Math.floor(samples.length / count));
  const peaks = Array.from({ length: count }, (_, bar) => {
    let max = 0;
    const end = Math.min(samples.length, (bar + 1) * size);
    for (let i = bar * size; i < end; i++) {
      const value = Math.abs(samples[i]);
      if (value > max) max = value;
    }
    return max;
  });
  const loudest = Math.max(...peaks) || 1;
  return peaks.map((peak) => peak / loudest);
}

async function load(path: string): Promise<Recording> {
  // Signed URLs last an hour; the cache is dropped with the page long before
  // most sessions reach that, and playback errors fall back to a refetch.
  const url = await recordingUrl(path);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Recording unavailable (${response.status})`);
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(await response.arrayBuffer());
    return { url, peaks: computePeaks(audio.getChannelData(0)) };
  } finally {
    void context.close();
  }
}

export function useRecording(path: string | null) {
  const [state, setState] = useState<{
    path: string | null;
    recording: Recording | null;
    failed: boolean;
  }>({ path: null, recording: null, failed: false });

  useEffect(() => {
    if (!path) return;
    let active = true;
    let request = cache.get(path);
    if (!request) {
      request = load(path);
      cache.set(path, request);
      request.catch(() => cache.delete(path));
    }
    request.then(
      (recording) => active && setState({ path, recording, failed: false }),
      () => active && setState({ path, recording: null, failed: true }),
    );
    return () => {
      active = false;
    };
  }, [path]);

  const current = state.path === path ? state : null;
  return {
    recording: current?.recording ?? null,
    loading: Boolean(path) && !current,
    failed: current?.failed ?? false,
  };
}
