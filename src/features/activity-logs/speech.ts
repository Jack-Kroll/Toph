import { speechParts } from "./transcript";

export function selectVoices(voices: SpeechSynthesisVoice[], identity: string) {
  // macOS includes musical/effect voices that can sound like clicks or tones.
  const natural = voices.filter(
    (voice) =>
      !/\b(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Deranged|Good News|Hysterical|Jester|Junior|Pipe Organ|Trinoids|Whisper|Wobble|Zarvox)\b/i.test(
        voice.name,
      ),
  );
  const usable = natural.length ? natural : voices;
  const english = usable.filter((voice) => /^en(?:-|_)/i.test(voice.lang));
  const available = (english.length ? english : usable)
    .slice()
    .sort(
      (a, b) =>
        Number(b.localService) - Number(a.localService) ||
        a.voiceURI.localeCompare(b.voiceURI),
    );
  const question =
    available.find((voice) => /Samantha/i.test(voice.name)) ?? available[0];
  const answers = available.filter(
    (voice) => voice.voiceURI !== question?.voiceURI,
  );
  let hash = 0;
  for (const char of identity)
    hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  return { question, answer: answers[hash % answers.length] ?? question };
}

/** Keep utterances alive and ignore late callbacks after stop/edit/unmount. */
export class TranscriptSpeech {
  private utterance: SpeechSynthesisUtterance | null = null;
  private generation = 0;
  private paused = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private synth: SpeechSynthesis;
  private onPlaying: (playing: boolean) => void;
  private onError: (message: string) => void;
  constructor(
    synth: SpeechSynthesis,
    onPlaying: (playing: boolean) => void,
    onError: (message: string) => void,
  ) {
    this.synth = synth;
    this.onPlaying = onPlaying;
    this.onError = onError;
  }

  play(transcript: string, identity: string) {
    if (this.utterance && this.paused) {
      this.paused = false;
      this.synth.resume();
      this.onPlaying(true);
      return;
    }
    this.stop();
    const generation = this.generation;
    const voices = selectVoices(this.synth.getVoices(), identity);
    const parts = speechParts(transcript).flatMap((part) =>
      (part.text.match(/.{1,180}(?:\s|$)|\S{1,180}/gs) ?? []).map((text) => ({
        ...part,
        text,
      })),
    );
    let index = 0;
    const next = () => {
      if (generation !== this.generation) return;
      const part = parts[index++];
      if (!part) {
        this.utterance = null;
        this.onPlaying(false);
        return; // Let speech end naturally: no cancel(), timer, or synthetic sound.
      }
      const utterance = new SpeechSynthesisUtterance(part.text);
      this.utterance = utterance;
      utterance.voice = voices[part.role] ?? null;
      utterance.lang = utterance.voice?.lang ?? "en-US";
      utterance.rate = 0.95;
      // A pitch distinction is the fallback on devices with only one voice.
      utterance.pitch =
        voices.question === voices.answer
          ? part.role === "question"
            ? 1.1
            : 0.9
          : 1;
      utterance.onstart = () => {
        if (generation === this.generation) clearTimeout(this.timer);
      };
      utterance.onend = () => {
        if (generation !== this.generation) return;
        clearTimeout(this.timer);
        next();
      };
      utterance.onerror = () => {
        if (generation !== this.generation) return;
        this.stop();
        this.onError("Speech couldn't play. Press Play to try again.");
      };
      this.timer = setTimeout(() => {
        if (generation !== this.generation || this.paused) return;
        this.stop();
        this.onError("Speech didn't start. Press Play to try again.");
      }, 10000);
      this.synth.speak(utterance);
    };
    // Browsers can retain a paused state after a previous canceled reading.
    this.synth.resume();
    this.onPlaying(true);
    next();
  }
  pause() {
    if (!this.utterance) return;
    this.paused = true;
    clearTimeout(this.timer);
    this.synth.pause();
    this.onPlaying(false);
  }
  stop() {
    this.generation++;
    clearTimeout(this.timer);
    const utterance = this.utterance;
    this.utterance = null;
    this.paused = false;
    if (utterance) {
      utterance.onstart = utterance.onend = utterance.onerror = null;
      this.synth.cancel();
    }
    this.onPlaying(false);
  }
}
