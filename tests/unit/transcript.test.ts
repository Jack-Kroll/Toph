import { describe, expect, it } from "vitest";
import {
  QUESTIONS,
  parseTranscript,
  serializeTranscript,
  speechParts,
} from "../../src/features/activity-logs/transcript";
import { computePeaks } from "../../src/features/activity-logs/audioSamples";

describe("guided transcripts", () => {
  it("round-trips multiline answers and preserves demo question wording", () => {
    const exchanges = QUESTIONS.map(({ key, text }) => ({
      key,
      question: text,
      answer: "Worked here.\nMore details.",
    }));
    expect(parseTranscript(serializeTranscript(exchanges))).toEqual(exchanges);
    expect(
      parseTranscript(
        "Offline guided voice log created at 2026-04-08T22:01:07.711Z. Question (field_block): Where (field or block)? Answer: West.",
      ),
    ).toEqual([
      {
        key: "field_block",
        question: "Where (field or block)?",
        answer: "West.",
      },
    ]);
  });
  it("distinguishes question and answer roles, including legacy free text", () => {
    expect(
      speechParts(
        "Guided voice log. Question (notes): Anything to flag? Answer: No.",
      ),
    ).toEqual([
      { text: "Anything to flag?", role: "question" },
      { text: "No.", role: "answer" },
    ]);
    expect(speechParts("Free text")).toEqual([
      { text: "Free text", role: "answer" },
    ]);
  });
  it("doesn't speak technical labels or empty answers", () => {
    expect(
      speechParts(
        "Guided voice log. Question (notes): Anything to flag? Answer: ",
      ),
    ).toEqual([{ text: "Anything to flag?", role: "question" }]);
  });
});
describe("recording waveform", () => {
  it("includes trailing samples in the waveform", () => {
    expect(computePeaks(new Float32Array([0, 0, 0, 0, 1]), 2)).toEqual([0, 1]);
  });
});
