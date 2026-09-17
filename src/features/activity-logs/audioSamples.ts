export const BAR_COUNT = 98;
export function computePeaks(samples: Float32Array, count = BAR_COUNT) {
  const peaks = Array.from({ length: count }, (_, bar) => {
    let max = 0;
    const end = Math.floor(((bar + 1) * samples.length) / count);
    for (let i = Math.floor((bar * samples.length) / count); i < end; i++) {
      if (Number.isFinite(samples[i]))
        max = Math.max(max, Math.abs(samples[i]));
    }
    return max;
  });
  const loudest = Math.max(...peaks) || 1;
  return peaks.map((peak) => peak / loudest);
}

// Decorative fallback traced from the supplied Figma waveform. It is not
// audio analysis, so only decoded recordings expose seeking and a playhead.
export const DESIGN_BARS = Array.from({ length: BAR_COUNT }, (_, index) =>
  index < 8
    ? [12, 23, 34, 44, 50, 43, 34, 22][index]
    : index > 26 && index < 42
      ? [9, 16, 22, 31, 50, 60, 45, 30, 24, 17, 15, 10, 12, 15, 23][index - 27]
      : index < 55
        ? 10
        : 6,
);
