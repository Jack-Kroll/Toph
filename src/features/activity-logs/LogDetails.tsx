import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, MouseEvent } from "react";
import { Icon } from "../../components/Icon";
import { LazySatelliteMap } from "../../components/LazySatelliteMap";
import type { ActivityLog } from "./api";
import { BAR_COUNT, useRecording } from "./useRecording";

// Bar heights traced from the design's waveform, shown when a log has no
// recording to draw from.
const DESIGN_BARS = Array.from({ length: BAR_COUNT }, (_, index) =>
  index < 8
    ? [12, 23, 34, 44, 50, 43, 34, 22][index]
    : index > 26 && index < 42
      ? [9, 16, 22, 31, 50, 60, 45, 30, 24, 17, 15, 10, 12, 15, 23][index - 27]
      : index < 55
        ? 10
        : 6,
);
const DESIGN_PROGRESS = 55;

function formatNumber(value: number) {
  return Number.isInteger(value) ? value.toLocaleString() : String(value);
}

type Props = {
  log: ActivityLog;
  /** Real accounts get a satellite map; the demo shows the design's image. */
  liveMap: boolean;
  tagMenuOpen: boolean;
  onToggleTagMenu: () => void;
  onAddTag: (name: string) => Promise<void>;
  onRemoveTag: (tagId: string) => void;
  onEdit: () => void;
  onOpenMap: () => void;
};

export function LogDetails({
  log,
  liveMap,
  tagMenuOpen,
  onToggleTagMenu,
  onAddTag,
  onRemoveTag,
  onEdit,
  onOpenMap,
}: Props) {
  const { recording, loading, failed } = useRecording(log.audioPath);
  const [playing, setPlaying] = useState(false);
  // Percent played; null until playback starts.
  const [progress, setProgress] = useState<number | null>(null);
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
    if (!playing || recording) return;
    const timer = window.setInterval(
      () => setProgress((value) => Math.min((value ?? 0) + 0.35, 100)),
      200,
    );
    return () => window.clearInterval(timer);
  }, [playing, recording]);

  function stop() {
    audio.current?.pause();
    window.speechSynthesis?.cancel();
    setPlaying(false);
  }

  function audioElement(url: string) {
    if (!audio.current) {
      const element = new Audio(url);
      element.ontimeupdate = () =>
        element.duration &&
        setProgress((element.currentTime / element.duration) * 100);
      element.onpause = () => setPlaying(false);
      element.onplay = () => setPlaying(true);
      element.onended = () => setProgress(null);
      audio.current = element;
    }
    return audio.current;
  }

  async function play() {
    if (playing) return stop();
    if (recording) {
      await audioElement(recording.url).play();
      return;
    }
    // No playable recording: read the transcript aloud instead.
    if (!window.speechSynthesis || !log.transcript) return;
    const speech = new SpeechSynthesisUtterance(log.transcript);
    speech.rate = 0.95;
    speech.onend = () => {
      setPlaying(false);
      setProgress(null);
    };
    speech.onerror = () => setPlaying(false);
    setProgress(0);
    setPlaying(true);
    window.speechSynthesis.speak(speech);
  }

  function seek(event: MouseEvent<HTMLDivElement>) {
    if (!recording) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = (event.clientX - bounds.left) / bounds.width;
    const element = audioElement(recording.url);
    const jump = () => {
      element.currentTime = fraction * element.duration;
      setProgress(fraction * 100);
    };
    if (element.readyState >= 1) jump();
    else element.addEventListener("loadedmetadata", jump, { once: true });
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

  const heights = recording
    ? recording.peaks.map((peak) => Math.max(3, Math.round(peak * 60)))
    : DESIGN_BARS;
  // Without a recording, rest where the design shows the playhead.
  const shownProgress = progress ?? (recording ? null : DESIGN_PROGRESS);

  const application = [
    log.productName,
    log.applicationRate !== null &&
      `${formatNumber(log.applicationRate)} ${log.rateUnit ?? ""}`.trim(),
  ].filter(Boolean);

  return (
    <div className="entry-details">
      <div className="recording-details">
        <div
          className={`waveform ${recording ? "seekable" : ""}`}
          aria-label="Recording waveform"
          aria-busy={loading}
          onClick={seek}
        >
          <div className={`wave-bars ${loading ? "loading" : ""}`}>
            {heights.map((height, index) => (
              <span
                key={index}
                style={{
                  height,
                  opacity:
                    shownProgress === null ||
                    (index / BAR_COUNT) * 100 < shownProgress
                      ? 0.83
                      : 0.2,
                }}
              />
            ))}
          </div>
          <div
            className="playhead"
            style={{ left: `${shownProgress ?? 0}%` } as CSSProperties}
          />
        </div>
        <button
          className="wide-button play-button"
          onClick={() => play().catch(stop)}
          disabled={loading || (!recording && !log.transcript)}
          title={
            recording
              ? undefined
              : failed
                ? "The recording couldn't be loaded; plays a spoken reading of the transcript"
                : "No recording uploaded; plays a spoken reading of the transcript"
          }
        >
          <Icon name={playing ? "pause" : "play"} size={15} />
          {loading
            ? "Loading Recording…"
            : playing
              ? "Pause Recording"
              : "Play Recording"}
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
        {!liveMap ? (
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
        ) : log.latitude !== null && log.longitude !== null ? (
          <LazySatelliteMap
            className="map-image-button"
            center={{ latitude: log.latitude, longitude: log.longitude }}
            zoom={15}
            label={`Satellite map of ${log.fieldName} with the recorded work location`}
          />
        ) : (
          <div className="map-image-button map-empty">
            No location recorded.
            <button className="text-button" onClick={onEdit}>
              Add a location
            </button>
          </div>
        )}
        <button className="wide-button" onClick={onOpenMap}>
          <Icon name="expand" size={15} />
          Expand Map
        </button>
      </div>
    </div>
  );
}
