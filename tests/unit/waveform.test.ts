import { describe, expect, it } from "vitest";
import { computePeaks } from "../../src/features/activity-logs/audioSamples";

describe("computePeaks", () => {
  it("takes the loudest sample per slice and scales to the loudest slice", () => {
    const samples = new Float32Array([0.1, -0.5, 0.25, 0.2, 0, -0.05, 0.4, 0.1]);
    const peaks = computePeaks(samples, 4);
    [1, 0.5, 0.1, 0.8].forEach((expected, i) =>
      expect(peaks[i]).toBeCloseTo(expected, 6),
    );
  });

  it("returns flat zeros for silence instead of dividing by zero", () => {
    expect(computePeaks(new Float32Array(10), 5)).toEqual([0, 0, 0, 0, 0]);
  });

  it("always returns the requested number of bars", () => {
    expect(computePeaks(new Float32Array(3), 98)).toHaveLength(98);
  });
});
