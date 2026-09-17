import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  selectVoices,
  TranscriptSpeech,
} from "../../src/features/activity-logs/speech";
const voices = ["Samantha", "Alex", "Daniel"].map(
  (name) =>
    ({
      name,
      voiceURI: name,
      lang: "en-US",
      localService: true,
    }) as SpeechSynthesisVoice,
);
class Utterance {
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public text: string) {}
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal("SpeechSynthesisUtterance", Utterance);
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
function setup() {
  const synth = {
    getVoices: () => voices,
    speak: vi.fn(),
    cancel: vi.fn(),
    resume: vi.fn(),
    pause: vi.fn(),
  };
  const playing = vi.fn();
  const error = vi.fn();
  const player = new TranscriptSpeech(
    synth as unknown as SpeechSynthesis,
    playing,
    error,
  );
  return { synth, playing, error, player };
}
describe("browser speech", () => {
  it("keeps narrator fixed and employee voices stable even when voice list order changes", () => {
    const first = selectVoices(voices, "employee-a");
    expect(first.question?.name).toBe("Samantha");
    expect(first.answer).not.toBe(first.question);
    expect(selectVoices([...voices].reverse(), "employee-a")).toEqual(first);
    expect(selectVoices(voices, "employee-b").answer).not.toBe(first.answer);
    expect(selectVoices([voices[0]], "employee-a").answer).toBe(voices[0]);
    expect(selectVoices([], "employee-a").answer).toBeUndefined();
    const effects = { ...voices[0], name: "Bells", voiceURI: "Bells" };
    expect(selectVoices([effects, ...voices], "employee-a")).toEqual(first);
  });
  it("advances question to answer, finishes naturally, and can replay", () => {
    const { player, synth, playing } = setup();
    const text =
      "Guided voice log. Question (notes): Anything to flag? Answer: No.";
    player.play(text, "a");
    const question = synth.speak.mock.calls[0][0];
    question.onstart();
    question.onend();
    const answer = synth.speak.mock.calls[1][0];
    expect(question.voice).not.toBe(answer.voice);
    answer.onstart();
    answer.onend();
    expect(playing).toHaveBeenLastCalledWith(false);
    expect(synth.cancel).not.toHaveBeenCalled();
    player.play(text, "a");
    expect(synth.speak).toHaveBeenCalledTimes(3);
    player.stop();
  });
  it("pauses and resumes without canceling or restarting the utterance", () => {
    const { player, synth } = setup();
    player.play("Hello there.", "a");
    synth.speak.mock.calls[0][0].onstart();
    player.pause();
    player.play("Hello there.", "a");
    expect(synth.pause).toHaveBeenCalledOnce();
    expect(synth.speak).toHaveBeenCalledOnce();
    expect(synth.cancel).not.toHaveBeenCalled();
    player.stop();
  });
  it("does not enqueue old answers after a source change", () => {
    const { player, synth } = setup();
    player.play(
      "Guided voice log. Question (notes): Anything to flag? Answer: No.",
      "a",
    );
    const lateEnd = synth.speak.mock.calls[0][0].onend;
    player.stop();
    player.play("New text.", "b");
    lateEnd();
    expect(synth.speak).toHaveBeenCalledTimes(2);
    player.stop();
  });
  it("reports stalled starts so the user can retry", () => {
    const { player, error, playing } = setup();
    player.play("Hello.", "a");
    vi.advanceTimersByTime(10000);
    expect(error).toHaveBeenCalledOnce();
    expect(playing).toHaveBeenLastCalledWith(false);
  });
});
