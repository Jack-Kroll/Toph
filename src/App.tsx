import { Fragment, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import "./App.css";

type IconName =
  | "dashboard"
  | "audio"
  | "map"
  | "audit"
  | "reports"
  | "calendar"
  | "users"
  | "performance"
  | "mail"
  | "settings"
  | "support"
  | "switch"
  | "logout"
  | "search"
  | "inbox"
  | "sort"
  | "filter"
  | "close"
  | "play"
  | "pause"
  | "star"
  | "expand"
  | "worker"
  | "percent"
  | "check";
function Icon({ name, size = 16 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    dashboard: (
      <>
        <path d="M4 3v17h17" />
        <path d="m7 13 4-4 4 3 5-6" />
      </>
    ),
    audio: (
      <>
        <path d="M4 10v4m4-7v10m4-13v16m4-13v10m4-7v4" />
      </>
    ),
    map: (
      <>
        <path d="m3 5 6-2 6 2 6-2v16l-6 2-6-2-6 2Z" />
        <path d="M9 3v16M15 5v16" />
      </>
    ),
    audit: (
      <>
        <rect x="5" y="3" width="14" height="18" rx="1.5" />
        <path d="m8 9 2 2 5-5M8 16h7" />
      </>
    ),
    reports: (
      <>
        <path d="M9 3h7l4 4v11H9zM16 3v5h4" />
        <path d="M5 7H3v14h12v-1" />
      </>
    ),
    calendar: (
      <>
        <rect x="4" y="5" width="16" height="16" rx="2" />
        <path d="M8 3v5m8-5v5M4 11h16" />
      </>
    ),
    users: (
      <>
        <circle cx="9" cy="7" r="3" />
        <path d="M3 20v-3a6 6 0 0 1 12 0v3m1-16a3 3 0 0 1 0 6m2 4a5 5 0 0 1 3 5" />
      </>
    ),
    performance: (
      <>
        <path d="M11 3a9 9 0 1 0 10 10H11Z" />
        <path d="M15 3v6h6a8 8 0 0 0-6-6Z" />
      </>
    ),
    mail: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 6 9 7 9-7" />
      </>
    ),
    settings: (
      <>
        <path d="m10 3-.7 2.2-2 .9-2.1-.5L3 9l1.5 1.7v2.5L3 15l2.2 3.4 2.1-.5 2 .9.7 2.2h4l.7-2.2 2-.9 2.1.5L21 15l-1.5-1.8v-2.5L21 9l-2.2-3.4-2.1.5-2-.9L14 3Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    support: (
      <>
        <path d="m12 4 3 2 5-1 1 7-9 9-9-9 1-7 5 1Z" />
        <path d="m7 9 3-1 3 2-2 2 4 4m-9-4 5 5" />
      </>
    ),
    switch: (
      <>
        <path d="M4 8h15l-3-3m4 11H5l3 3M19 8l-3 3M5 16l3-3" />
      </>
    ),
    logout: (
      <>
        <path d="M10 4H4v16h6m4-12 4 4-4 4m-6-4h10" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 4 4" />
      </>
    ),
    inbox: (
      <>
        <path d="m6 5-3 8v6h18v-6l-3-8Z" />
        <path d="M3 13h5l2 3h4l2-3h5" />
      </>
    ),
    sort: <path d="M4 6h16M7 12h10m-7 6h4" />,
    filter: <path d="M3 4h18l-7 9v7l-4-2v-5Z" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    play: <path d="m7 4 13 8-13 8Z" />,
    pause: (
      <>
        <path d="M8 5v14M16 5v14" />
      </>
    ),
    star: (
      <path d="m12 3 2.8 5.6 6.2.9-4.5 4.4 1.1 6.1-5.6-2.9L6.4 20l1.1-6.1L3 9.5l6.2-.9Z" />
    ),
    expand: (
      <path d="M9 3H3v6m12-6h6v6M3 15v6h6m12-6v6h-6M3 3l6 6m12-6-6 6M3 21l6-6m12 6-6-6" />
    ),
    worker: (
      <>
        <path d="M5 21v-6m-1-4V7a6 6 0 0 1 12 0v5l3 2h-3v4h-5l-2 3" />
        <path d="m3 14 7-7 3 3-7 7-3 1Z" />
      </>
    ),
    percent: (
      <>
        <circle cx="6" cy="6" r="2.5" />
        <circle cx="18" cy="18" r="2.5" />
        <path d="m5 20 14-16" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.55"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

const groups: { title: string; items: { label: string; icon: IconName }[] }[] =
  [
    {
      title: "Overview",
      items: [
        { label: "Dashboard", icon: "dashboard" },
        { label: "Activity Logs", icon: "audio" },
        { label: "Map", icon: "map" },
      ],
    },
    {
      title: "Compliance",
      items: [
        { label: "Audit Manager", icon: "audit" },
        { label: "Reports", icon: "reports" },
        { label: "Schedule", icon: "calendar" },
      ],
    },
    {
      title: "Team Management",
      items: [
        { label: "Employees", icon: "users" },
        { label: "Performance", icon: "performance" },
        { label: "Messages", icon: "mail" },
      ],
    },
    {
      title: "Other",
      items: [
        { label: "Settings", icon: "settings" },
        { label: "Support", icon: "support" },
      ],
    },
  ];
const logs = [
  {
    id: 1,
    employee: "Isaac Wang",
    activity: "Spraying",
    date: "April 19, 2026",
    field: "FIELD A",
    time: "6:00 AM - 10:40 AM",
  },
  {
    id: 2,
    employee: "Maya Patel",
    activity: "Harvesting",
    date: "April 20, 2026",
    field: "FIELD B",
    time: "7:30 AM - 11:15 AM",
  },
  {
    id: 3,
    employee: "Liam Johnson",
    activity: "Planting",
    date: "April 21, 2026",
    field: "FIELD C",
    time: "8:00 AM - 12:00 PM",
  },
  {
    id: 4,
    employee: "Sophia Lee",
    activity: "Irrigation",
    date: "April 22, 2026",
    field: "FIELD D",
    time: "6:30 AM - 9:30 AM",
  },
];
const summary =
  '"Offline guided voice log created at 2026-04-08T22:01:07.711Z. Question (activity_type): What type of activity was this — spraying, fertilizing, planting, irrigating, harvesting, scouting, pruning, soil work, or equipment maintenance? Answer: I’m leaving first, I’m going to go home. Question (field_block): Where were you working (field, block, or area)? Answer: yes, in one part and then 130 and 200 yes, and 130 for uh 160 and no, this yes no, no, uhm no no I remember, uhm uhm uhm, no, I don’t remember anything.';

function App() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [menu, setMenu] = useState<"sort" | "filter" | "tag" | null>(null);
  const [descending, setDescending] = useState(false);
  const [activity, setActivity] = useState("All activities");
  const [month, setMonth] = useState(true);
  const [dateChip, setDateChip] = useState(true);
  const [tags, setTags] = useState<Record<number, string[]>>({});
  const [tagInput, setTagInput] = useState("");
  const [mapOpen, setMapOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(55);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const filtered = logs
    .filter(
      (log) =>
        `${log.employee} ${log.activity} ${log.field} ${log.date}`
          .toLowerCase()
          .includes(query.toLowerCase()) &&
        (activity === "All activities" || log.activity === activity),
    )
    .sort((a, b) => (descending ? b.id - a.id : a.id - b.id));

  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMapOpen(false);
        setMenu(null);
      }
    }
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("keydown", keydown);
      window.speechSynthesis?.cancel();
    };
  }, []);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () => setProgress((value) => Math.min(value + 0.35, 100)),
      200,
    );
    return () => window.clearInterval(timer);
  }, [playing]);
  function toggleRow(id: number) {
    window.speechSynthesis?.cancel();
    setPlaying(false);
    setProgress(55);
    setExpanded(expanded === id ? null : id);
    setMenu(null);
  }
  function toggleSelected(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : [...current, id],
    );
  }
  function play() {
    if (playing) {
      window.speechSynthesis?.cancel();
      setPlaying(false);
      return;
    }
    if (!window.speechSynthesis) return;
    const speech = new SpeechSynthesisUtterance(summary.replace(/^"/, ""));
    speech.rate = 0.95;
    speech.onend = () => {
      setPlaying(false);
      setProgress(55);
    };
    speech.onerror = () => setPlaying(false);
    utterance.current = speech;
    setProgress(0);
    setPlaying(true);
    window.speechSynthesis.speak(speech);
  }
  function addTag() {
    const value = tagInput.trim();
    if (expanded !== null && value) {
      setTags((current) => ({
        ...current,
        [expanded]: [...new Set([...(current[expanded] || []), value])],
      }));
      setTagInput("");
      setMenu(null);
    }
  }

  return (
    <div className="app-shell" onClick={() => menu && setMenu(null)}>
      <aside className="sidebar" aria-label="Main navigation">
        <div className="account">
          <img
            className="avatar"
            src="/reference/avatar.png"
            alt="Bays Ranch profile"
          />
          <div className="account-text">
            <strong>Bays Ranch</strong>
            <span>
              <Icon name="users" size={11} /> Admin
            </span>
          </div>
          <button className="icon-button inbox" aria-label="Inbox" disabled>
            <Icon name="inbox" size={16} />
          </button>
        </div>
        <nav>
          {groups.map((group) => (
            <div className="nav-group" key={group.title}>
              <h2>{group.title}</h2>
              {group.items.map((item) => (
                <button
                  key={item.label}
                  aria-label={item.label}
                  className={`nav-item ${item.label === "Dashboard" ? "active" : ""}`}
                  aria-current={item.label === "Dashboard" ? "page" : undefined}
                  aria-disabled={item.label !== "Dashboard"}
                  title={
                    item.label === "Dashboard"
                      ? undefined
                      : `${item.label} — coming soon`
                  }
                >
                  <Icon name={item.icon} />
                  <span>{item.label}</span>
                  {item.label === "Dashboard" && (
                    <span className="notification-count">1</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="account-actions">
          <button
            className="nav-item"
            aria-disabled="true"
            title="Account switching is not connected"
            aria-label="Switch User"
          >
            <Icon name="switch" />
            <span>Switch User</span>
          </button>
          <button
            className="nav-item"
            aria-disabled="true"
            title="Authentication is not connected"
            aria-label="Log Out"
          >
            <Icon name="logout" />
            <span>Log Out</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>Dashboard</h1>
            <p>An overview of your farm and employee activity</p>
          </div>
          <label className="search">
            <Icon name="search" size={15} />
            <input
              aria-label="Search employee logs"
              placeholder="Search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            {query && (
              <button
                className="icon-button"
                aria-label="Clear search"
                onClick={() => setQuery("")}
              >
                <Icon name="close" size={12} />
              </button>
            )}
          </label>
        </header>
        <section className="metrics" aria-label="Farm overview">
          <div className="metric">
            <div className="metric-label">
              <Icon name="calendar" />
              Todays Recordings
            </div>
            <div className="metric-value">
              5<span>1 New</span>
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">
              <Icon name="worker" />
              Active Workers
            </div>
            <div className="metric-value">12</div>
          </div>
          <div className="metric">
            <div className="metric-label">
              <Icon name="percent" />
              Response Accuracy
            </div>
            <div className="metric-value">90</div>
          </div>
        </section>

        <section className="logs-panel" aria-label="Employee activity logs">
          <div className="logs-toolbar">
            <h2>
              <Icon name="audio" />
              New Employee Logs <span>({filtered.length})</span>
            </h2>
            <div className="table-controls">
              {dateChip && (
                <button
                  className="pill selected-pill"
                  onClick={() => {
                    setDateChip(false);
                    setDescending(false);
                  }}
                  aria-label="Remove date sorting"
                >
                  <Icon name="close" size={13} />
                  Date
                </button>
              )}
              <div className="popover-anchor">
                <button
                  className="pill"
                  aria-expanded={menu === "sort"}
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenu(menu === "sort" ? null : "sort");
                  }}
                >
                  <Icon name="sort" size={15} />
                  Sort
                </button>
                {menu === "sort" && (
                  <div
                    className="popover"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <p>Sort by date</p>
                    {["Oldest first", "Newest first"].map((label, index) => (
                      <button
                        key={label}
                        onClick={() => {
                          setDescending(!!index);
                          setDateChip(true);
                          setMenu(null);
                        }}
                      >
                        {label}
                        {descending === !!index && (
                          <Icon name="check" size={14} />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {month && (
                <button
                  className="pill selected-pill"
                  onClick={() => setMonth(false)}
                  aria-label="Remove this month filter"
                >
                  <Icon name="close" size={13} />
                  This Month{expanded === null ? " (4)" : ""}
                </button>
              )}
              <div className="popover-anchor">
                <button
                  className={`pill ${activity !== "All activities" ? "filter-applied" : ""}`}
                  aria-expanded={menu === "filter"}
                  onClick={(event) => {
                    event.stopPropagation();
                    setMenu(menu === "filter" ? null : "filter");
                  }}
                >
                  <Icon name="filter" size={14} />
                  Filter
                </button>
                {menu === "filter" && (
                  <div
                    className="popover"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <p>Activity</p>
                    {[
                      "All activities",
                      "Spraying",
                      "Harvesting",
                      "Planting",
                      "Irrigation",
                    ].map((label) => (
                      <button
                        key={label}
                        onClick={() => {
                          setActivity(label);
                          setMenu(null);
                        }}
                      >
                        {label}
                        {activity === label && <Icon name="check" size={14} />}
                      </button>
                    ))}
                    {!month && (
                      <button
                        onClick={() => {
                          setMonth(true);
                          setMenu(null);
                        }}
                      >
                        This Month
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="table-scroll">
            <table>
              <colgroup>
                <col className="check-col" />
                <col />
                <col />
                <col />
                <col />
                <col className="time-col" />
                <col className="view-col" />
              </colgroup>
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      aria-label="Select all employee logs"
                      checked={
                        filtered.length > 0 &&
                        filtered.every((log) => selected.includes(log.id))
                      }
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? filtered.map((log) => log.id)
                            : [],
                        )
                      }
                    />
                  </th>
                  <th>Employee</th>
                  <th>Activity</th>
                  <th>Date</th>
                  <th>Field</th>
                  <th>Time</th>
                  <th>
                    <span className="sr-only">Details</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <Fragment key={log.id}>
                    <tr
                      className={`log-row ${expanded === log.id || (expanded === null && log.id === 1) ? "highlighted" : ""}`}
                      onClick={() => toggleRow(log.id)}
                    >
                      <td onClick={(event) => event.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${log.employee}'s log`}
                          checked={selected.includes(log.id)}
                          onChange={() => toggleSelected(log.id)}
                        />
                      </td>
                      <td>{log.employee}</td>
                      <td>{log.activity}</td>
                      <td>{log.date}</td>
                      <td>{log.field}</td>
                      <td>{log.time}</td>
                      <td>
                        <button
                          className="view-button"
                          aria-expanded={expanded === log.id}
                          aria-label={`${expanded === log.id ? "Close" : "View"} ${log.employee}'s log`}
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleRow(log.id);
                          }}
                        >
                          {expanded === log.id ? "Close" : "View"}
                        </button>
                      </td>
                    </tr>
                    {expanded === log.id && (
                      <tr className="detail-row">
                        <td colSpan={7}>
                          <div className="entry-details">
                            <div className="recording-details">
                              <div
                                className="waveform"
                                aria-label="Recording waveform"
                              >
                                <div className="wave-bars">
                                  {Array.from({ length: 98 }, (_, index) => {
                                    const height =
                                      index < 8
                                        ? [12, 23, 34, 44, 50, 43, 34, 22][
                                            index
                                          ]
                                        : index > 26 && index < 42
                                          ? [
                                              9, 16, 22, 31, 50, 60, 45, 30, 24,
                                              17, 15, 10, 12, 15, 23,
                                            ][index - 27]
                                          : index === 41
                                            ? 40
                                            : index < 55
                                              ? 10
                                              : 6;
                                    return (
                                      <span
                                        key={index}
                                        style={{
                                          height,
                                          opacity:
                                            index < progress ? 0.83 : 0.2,
                                        }}
                                      />
                                    );
                                  })}
                                </div>
                                <div
                                  className="playhead"
                                  style={
                                    { left: `${progress}%` } as CSSProperties
                                  }
                                />
                              </div>
                              <button
                                className="wide-button play-button"
                                onClick={play}
                                title="Demo playback uses a synthesized reading of the supplied transcript"
                              >
                                <Icon
                                  name={playing ? "pause" : "play"}
                                  size={15}
                                />
                                {playing ? "Pause Recording" : "Play Recording"}
                              </button>
                              <div className="tag-area">
                                <button
                                  className="wide-button tag-button"
                                  aria-expanded={menu === "tag"}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setMenu(menu === "tag" ? null : "tag");
                                  }}
                                >
                                  <Icon name="star" size={16} />
                                  Add Tag
                                </button>
                                {menu === "tag" && (
                                  <form
                                    className="tag-form"
                                    onClick={(event) => event.stopPropagation()}
                                    onSubmit={(event) => {
                                      event.preventDefault();
                                      addTag();
                                    }}
                                  >
                                    <input
                                      autoFocus
                                      placeholder="Enter a tag"
                                      aria-label="New tag"
                                      value={tagInput}
                                      onChange={(event) =>
                                        setTagInput(event.target.value)
                                      }
                                    />
                                    <button
                                      type="submit"
                                      disabled={!tagInput.trim()}
                                    >
                                      Add
                                    </button>
                                  </form>
                                )}
                                {(tags[log.id] || []).length > 0 && (
                                  <div className="tags">
                                    {tags[log.id].map((tag) => (
                                      <button
                                        key={tag}
                                        onClick={() =>
                                          setTags((current) => ({
                                            ...current,
                                            [log.id]: current[log.id].filter(
                                              (value) => value !== tag,
                                            ),
                                          }))
                                        }
                                        aria-label={`Remove tag ${tag}`}
                                      >
                                        {tag}
                                        <Icon name="close" size={12} />
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <h3>Summary</h3>
                              <p className="summary">
                                {log.id === 1
                                  ? summary
                                  : `Work log for ${log.employee}. ${log.activity} completed in ${log.field} on ${log.date}, ${log.time}.`}
                              </p>
                            </div>
                            <div className="map-details">
                              <button
                                className="map-image-button"
                                onClick={() => setMapOpen(true)}
                                aria-label={`Expand map of ${log.field}`}
                              >
                                <img
                                  className="field-map"
                                  src="/reference/field-map.png"
                                  alt={`Satellite view of ${log.field} with the recorded work location`}
                                />
                              </button>
                              <button
                                className="wide-button"
                                onClick={() => setMapOpen(true)}
                              >
                                <Icon name="expand" size={15} />
                                Expand Map
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      No logs match your search.
                      <button
                        onClick={() => {
                          setQuery("");
                          setActivity("All activities");
                        }}
                      >
                        Clear filters
                      </button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
      {mapOpen && (
        <div className="modal-backdrop" onClick={() => setMapOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Field map"
            className="map-modal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header">
              <h2>
                {logs.find((log) => log.id === expanded)?.field || "FIELD A"}
              </h2>
              <button
                autoFocus
                className="icon-button"
                aria-label="Close map"
                onClick={() => setMapOpen(false)}
              >
                <Icon name="close" size={20} />
              </button>
            </div>
            <img
              src="/reference/field-map.png"
              alt="Expanded satellite field map"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
