import { useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent, MouseEvent } from "react";
import { Icon } from "../../components/Icon";
import { LazySatelliteMap } from "../../components/LazySatelliteMap";
import type { ActivityLog } from "./api";
import { BAR_COUNT, useRecording } from "./useRecording";
import { parseTranscript } from "./transcript";
import { TranscriptSpeech } from "./speech";
import { DESIGN_BARS } from "./audioSamples";

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
  // Seeded files use one voice throughout; read their current Q&A with browser voices.
  const recordingPath =
    log.audioPath?.startsWith("demo/") && log.transcript ? null : log.audioPath;
  const { recording, loading, error, prepare } = useRecording(recordingPath);
  const [playError, setPlayError] = useState<string | null>(null);
  const exchanges = parseTranscript(log.transcript ?? "");
  const [playing, setPlaying] = useState(false);
  // Percent played; null until playback starts.
  const [progress, setProgress] = useState<number | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [savingTag, setSavingTag] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const speech = useRef<TranscriptSpeech | null>(null);

  useEffect(() => {
    window.speechSynthesis?.getVoices();
  }, []);

  useEffect(() => {
    // The media source changed; reset the state associated with the old source.
    // oxlint-disable-next-line react/set-state-in-effect
    setPlaying(false);
    setProgress(null);
    setPlayError(null);
    return () => {
      speech.current?.stop();
      speech.current = null;
      const element = audio.current;
      if (element) {
        element.onplay =
          element.onpause =
          element.onended =
          element.ontimeupdate =
          element.onerror =
            null;
        element.pause();
        element.removeAttribute("src");
        element.load();
      }
      audio.current = null;
    };
  }, [recording, log.id, log.transcript, log.employeeId]);

  function stop() {
    audio.current?.pause();
    speech.current?.pause();
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
      element.onended = () => {
        setPlaying(false);
        setProgress(null);
      };
      element.onerror = () => {
        setPlaying(false);
        setPlayError("Playback failed. Try preparing the audio again.");
      };
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
    if (recordingPath && !error) {
      prepare();
      return;
    }
    if (!window.speechSynthesis) throw new Error("Speech is unavailable");
    speech.current ??= new TranscriptSpeech(
      window.speechSynthesis,
      setPlaying,
      setPlayError,
    );
    speech.current.play(log.transcript ?? "", log.employeeId);
  }

  function seek(event: MouseEvent<HTMLDivElement>) {
    if (!recording) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const fraction = Math.max(
      0,
      Math.min(1, (event.clientX - bounds.left) / bounds.width),
    );
    const element = audioElement(recording.url);
    const jump = () => {
      if (!Number.isFinite(element.duration)) return;
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

  const hasWaveform = Boolean(recording?.peaks.length);
  const heights =
    hasWaveform && recording
      ? recording.peaks.map((peak) => Math.max(3, Math.round(peak * 60)))
      : DESIGN_BARS;
  const shownProgress = hasWaveform ? progress : 55;

  const application = [
    log.productName,
    log.applicationRate !== null &&
      `${formatNumber(log.applicationRate)} ${log.rateUnit ?? ""}`.trim(),
  ].filter(Boolean);

  return (
    <div className="entry-details">
      <div className="recording-details">
        <div
          className={`waveform ${hasWaveform ? "seekable" : ""}`}
          aria-label={
            hasWaveform ? "Recording waveform" : "Decorative waveform"
          }
          aria-busy={loading}
          onClick={hasWaveform ? seek : undefined}
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
          {hasWaveform && (
            <div
              className="playhead"
              style={{ left: `${shownProgress ?? 0}%` } as CSSProperties}
            />
          )}
        </div>
        <button
          className="wide-button play-button"
          onClick={() => {
            setPlayError(null);
            void play().catch(() => {
              stop();
              setPlayError("Playback couldn't start. Press Play to try again.");
            });
          }}
          disabled={loading || (!recording && !log.transcript)}
        >
          <Icon name={playing ? "pause" : "play"} size={15} />
          {loading
            ? "Loading Recording…"
            : playing
              ? recording
                ? "Pause Recording"
                : "Pause Reading"
              : recording
                ? "Play Recording"
                : "Read Transcript"}
        </button>
        {(error || playError) && (
          <p className="form-error" role="alert">
            {error || playError}
            {recordingPath && (
              <button className="text-button" onClick={prepare}>
                Reload audio
              </button>
            )}
          </p>
        )}

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
        {exchanges.length ? (
          <dl className="summary guided-transcript">
            {exchanges.map((exchange, index) => (
              <div key={index}>
                <dt>{exchange.question}</dt>
                <dd>{exchange.answer || "No answer recorded."}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="summary">
            {log.transcript || "No transcript recorded."}
          </p>
        )}
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
