import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import { Icon } from "../../components/Icon";
import { recordingUrl, type ActivityLog } from "./api";

// Bar heights traced from the design's waveform.
const BARS = Array.from({ length: 98 }, (_, index) =>
  index < 8
    ? [12, 23, 34, 44, 50, 43, 34, 22][index]
    : index > 26 && index < 42
      ? [9, 16, 22, 31, 50, 60, 45, 30, 24, 17, 15, 10, 12, 15, 23][index - 27]
      : index < 55
        ? 10
        : 6,
);
const IDLE_PROGRESS = 55;

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : String(value);
}

type Props = {
  log: ActivityLog;
  tagMenuOpen: boolean;
  onToggleTagMenu: () => void;
  onAddTag: (name: string) => Promise<void>;
  onRemoveTag: (tagId: string) => void;
  onEdit: () => void;
  onOpenMap: () => void;
};

export function LogDetails({
  log,
  tagMenuOpen,
  onToggleTagMenu,
  onAddTag,
  onRemoveTag,
  onEdit,
  onOpenMap,
}: Props) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(IDLE_PROGRESS);
  const [tagInput, setTagInput] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);

  useEffect(
    () => () => {
      audio.current?.pause();
      window.speechSynthesis?.cancel();
    },
    [],
  );

  // Speech playback has no reliable position events, so estimate progress.
  useEffect(() => {
    if (!playing || audio.current) return;
    const timer = window.setInterval(
      () => setProgress((value) => Math.min(value + 0.35, 100)),
      200,
    );
    return () => window.clearInterval(timer);
  }, [playing]);

  function stop() {
    audio.current?.pause();
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }

  async function play() {
    if (playing) return stop();
    if (log.audioPath) {
      if (!audio.current) {
        const element = new Audio(await recordingUrl(log.audioPath));
        element.ontimeupdate = () =>
          element.duration &&
          setProgress((element.currentTime / element.duration) * 100);
        element.onended = () => {
          setPlaying(false);
          setProgress(IDLE_PROGRESS);
        };
        audio.current = element;
      }
      setPlaying(true);
      await audio.current.play();
      return;
    }
    // No recording uploaded: read the transcript aloud instead.
    if (!window.speechSynthesis || !log.transcript) return;
    const speech = new SpeechSynthesisUtterance(log.transcript);
    speech.rate = 0.95;
    speech.onend = () => {
      setPlaying(false);
      setProgress(IDLE_PROGRESS);
    };
    speech.onerror = () => setPlaying(false);
    setProgress(0);
    setPlaying(true);
    window.speechSynthesis.speak(speech);
  }

  async function submitTag(event: FormEvent) {
    event.preventDefault();
    const name = tagInput.trim();
    if (!name) return;
    setSavingTag(true);
    try {
      await onAddTag(name);
      setTagInput("");
    } finally {
      setSavingTag(false);
    }
  }

  const application = [
    log.productName,
    log.applicationRate !== null &&
      `${formatNumber(log.applicationRate)} ${log.rateUnit ?? ""}`.trim(),
  ].filter(Boolean);

  return (
    <div className="entry-details">
      <div className="recording-details">
        <div className="waveform" aria-label="Recording waveform">
          <div className="wave-bars">
            {BARS.map((height, index) => (
              <span
                key={index}
                style={{ height, opacity: index < progress ? 0.83 : 0.2 }}
              />
            ))}
          </div>
          <div
            className="playhead"
            style={{ left: `${progress}%` } as CSSProperties}
          />
        </div>
        <button
          className="wide-button play-button"
          onClick={() => play().catch(stop)}
          disabled={!log.audioPath && !log.transcript}
          title={
            log.audioPath
              ? undefined
              : "No recording uploaded; plays a spoken reading of the transcript"
          }
        >
          <Icon name={playing ? "pause" : "play"} size={15} />
          {playing ? "Pause Recording" : "Play Recording"}
        </button>
        <div className="tag-area">
          <button
            className="wide-button tag-button"
            aria-expanded={tagMenuOpen}
            onClick={(event) => {
              event.stopPropagation();
              onToggleTagMenu();
            }}
          >
            <Icon name="star" size={16} />
            Add Tag
          </button>
          {tagMenuOpen && (
            <form
              className="tag-form"
              onClick={(event) => event.stopPropagation()}
              onSubmit={submitTag}
            >
              <input
                autoFocus
                placeholder="Enter a tag"
                aria-label="New tag"
                maxLength={40}
                value={tagInput}
                onChange={(event) => setTagInput(event.target.value)}
              />
              <button type="submit" disabled={!tagInput.trim() || savingTag}>
                {savingTag ? "Adding…" : "Add"}
              </button>
            </form>
          )}
          {log.tags.length > 0 && (
            <div className="tags">
              {log.tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => onRemoveTag(tag.id)}
                  aria-label={`Remove tag ${tag.name}`}
                >
                  {tag.name}
                  <Icon name="close" size={12} />
                </button>
              ))}
            </div>
          )}
        </div>
        {/* Facts share the heading line so the row keeps the design's height. */}
        <div className="summary-heading">
          <h3>Summary</h3>
          <span className="log-facts">
            {application.length > 0 && (
              <span title="Product applied">{application.join(" · ")}</span>
            )}
            {log.responseAccuracy !== null && (
              <span title="Response accuracy">
                {Math.round(log.responseAccuracy)}% accuracy
              </span>
            )}
          </span>
          <button className="text-button" onClick={onEdit}>
            <Icon name="edit" size={13} />
            Edit
          </button>
        </div>
        <p className="summary">
          {log.transcript ? `"${log.transcript}` : "No transcript recorded."}
        </p>
      </div>
      <div className="map-details">
        <button
          className="map-image-button"
          onClick={onOpenMap}
          aria-label={`Expand map of ${log.fieldName}`}
        >
          <img
            className="field-map"
            src="/reference/field-map.png"
            alt={`Satellite view of ${log.fieldName} with the recorded work location`}
          />
        </button>
        <button className="wide-button" onClick={onOpenMap}>
          <Icon name="expand" size={15} />
          Expand Map
        </button>
      </div>
    </div>
  );
}
