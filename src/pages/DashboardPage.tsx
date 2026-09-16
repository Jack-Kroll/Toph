import { Fragment, useEffect, useMemo, useState } from "react";
import { errorMessage as message, useLayout } from "../components/layoutContext";
import { Icon } from "../components/Icon";
import { ConfirmDialog, Modal } from "../components/Modal";
import { formatDate, formatTimeRange } from "../lib/time";
import * as api from "../features/activity-logs/api";
import type { ActivityLog, LogInput } from "../features/activity-logs/api";
import {
  filterLogs,
  SORT_LABELS,
  sortLogs,
  type Sort,
  type SortKey,
} from "../features/activity-logs/filters";
import { LogDetails } from "../features/activity-logs/LogDetails";
import { LogFormDialog } from "../features/activity-logs/LogFormDialog";

const SORT_OPTIONS: { label: string; key: SortKey; descending: boolean }[] = [
  { label: "Date, oldest first", key: "date", descending: false },
  { label: "Date, newest first", key: "date", descending: true },
  { label: "Employee, A–Z", key: "employee", descending: false },
  { label: "Activity, A–Z", key: "activity", descending: false },
  { label: "Field, A–Z", key: "field", descending: false },
];

export function DashboardPage() {
  const { data, notify } = useLayout();
  const { profile, logs, setLogs, stats, loading, error, refresh } = data;
  const timeZone = profile?.organization.timezone ?? "America/Chicago";

  const [expanded, setExpanded] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [menu, setMenu] = useState<"sort" | "filter" | "tag" | null>(null);
  const [sort, setSort] = useState<Sort>({ key: "date", descending: false });
  const [activity, setActivity] = useState<string | null>(null);
  const [thisMonth, setThisMonth] = useState(true);
  const [includeReviewed, setIncludeReviewed] = useState(false);
  const [mapLog, setMapLog] = useState<ActivityLog | null>(null);
  const [editing, setEditing] = useState<ActivityLog | "new" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Dashboard · Toph";
  }, []);

  // Menus stop click propagation, so any click that reaches the window is
  // outside the open menu.
  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("click", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const month = thisMonth && stats ? stats.asOf.slice(0, 7) : null;
  const visible = useMemo(
    () =>
      sortLogs(
        filterLogs(logs, { query, activity, month, includeReviewed, timeZone }),
        sort,
      ),
    [logs, query, activity, month, includeReviewed, timeZone, sort],
  );
  const visibleIds = new Set(visible.map((log) => log.id));
  const selectedVisible = selected.filter((id) => visibleIds.has(id));
  const selectedLogs = visible.filter((log) => selected.includes(log.id));
  const toReview = selectedLogs.filter((log) => !log.reviewedAt);
  const toReopen = selectedLogs.filter((log) => log.reviewedAt);
  const filtersActive =
    query !== "" || activity !== null || thisMonth || !includeReviewed;

  function toggleRow(id: string) {
    setExpanded(expanded === id ? null : id);
    setMenu(null);
  }

  function clearFilters() {
    setQuery("");
    setActivity(null);
    setThisMonth(false);
    setIncludeReviewed(true);
  }

  async function addTag(logId: string, name: string) {
    try {
      const tag = await api.addTag(logId, name);
      setLogs((current) =>
        current.map((log) =>
          log.id === logId && !log.tags.some((t) => t.id === tag.id)
            ? {
                ...log,
                tags: [...log.tags, tag].sort((a, b) =>
                  a.name.localeCompare(b.name),
                ),
              }
            : log,
        ),
      );
      setMenu(null);
    } catch (caught) {
      notify(`Couldn't add tag: ${message(caught)}`, "error");
    }
  }

  async function removeTag(logId: string, tagId: string) {
    setLogs((current) =>
      current.map((log) =>
        log.id === logId
          ? { ...log, tags: log.tags.filter((t) => t.id !== tagId) }
          : log,
      ),
    );
    try {
      await api.removeTag(logId, tagId);
    } catch (caught) {
      notify(`Couldn't remove tag: ${message(caught)}`, "error");
      void refresh();
    }
  }

  async function saveLog(input: LogInput) {
    if (editing === "new") {
      await api.createLog(input);
      notify("Log created.");
    } else if (editing) {
      await api.updateLog(editing.id, input, editing.reviewedAt);
      notify("Log updated.");
    }
    setEditing(null);
    await refresh();
  }

  async function deleteLogs(ids: string[]) {
    setBusy(true);
    try {
      await api.deleteLogs(ids);
      setSelected((current) => current.filter((id) => !ids.includes(id)));
      if (expanded && ids.includes(expanded)) setExpanded(null);
      setConfirmDelete(null);
      setEditing(null);
      notify(ids.length === 1 ? "Log deleted." : `${ids.length} logs deleted.`);
      await refresh();
    } catch (caught) {
      notify(`Couldn't delete: ${message(caught)}`, "error");
    } finally {
      setBusy(false);
    }
  }

  async function setReviewed(ids: string[], reviewed: boolean) {
    try {
      await api.setReviewed(ids, reviewed);
      setSelected([]);
      const state = reviewed ? "reviewed" : "new";
      notify(
        ids.length === 1
          ? `Log marked as ${state}.`
          : `${ids.length} logs marked as ${state}.`,
      );
      await refresh();
    } catch (caught) {
      notify(`Couldn't update: ${message(caught)}`, "error");
    }
  }

  const metric = (value: number | null | undefined) =>
    loading && !stats ? "–" : (value ?? "–");

  return (
    <>
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
        <section
          className="metrics"
          aria-label="Farm overview"
          aria-busy={loading}
        >
          <div className="metric">
            <div className="metric-label">
              <Icon name="calendar" />
              Todays Recordings
            </div>
            <div className="metric-value">
              {metric(stats?.todaysRecordings)}
              {stats && stats.todaysNew > 0 && (
                <span>{stats.todaysNew} New</span>
              )}
            </div>
          </div>
          <div className="metric">
            <div className="metric-label">
              <Icon name="worker" />
              Active Workers
            </div>
            <div className="metric-value">{metric(stats?.activeWorkers)}</div>
          </div>
          <div className="metric">
            <div className="metric-label">
              <Icon name="percent" />
              Response Accuracy
            </div>
            <div className="metric-value">
              {metric(stats?.responseAccuracy)}
            </div>
          </div>
        </section>

        <section className="logs-panel" aria-label="Employee activity logs">
          <div className="logs-toolbar">
            <h2>
              <Icon name="audio" />
              {includeReviewed ? "Employee Logs" : "New Employee Logs"}{" "}
              <span>({visible.length})</span>
            </h2>
            {selectedVisible.length > 0 ? (
              <div className="table-controls">
                <span className="selection-count">
                  {selectedVisible.length} selected
                </span>
                {toReview.length > 0 && (
                  <button
                    className="pill"
                    onClick={() =>
                      void setReviewed(
                        toReview.map((log) => log.id),
                        true,
                      )
                    }
                  >
                    <Icon name="check" size={14} />
                    Mark Reviewed
                  </button>
                )}
                {toReopen.length > 0 && (
                  <button
                    className="pill"
                    onClick={() =>
                      void setReviewed(
                        toReopen.map((log) => log.id),
                        false,
                      )
                    }
                  >
                    <Icon name="audio" size={14} />
                    Mark New
                  </button>
                )}
                <button
                  className="pill danger-pill"
                  onClick={() => setConfirmDelete(selectedVisible)}
                >
                  <Icon name="trash" size={14} />
                  Delete
                </button>
                <button className="pill" onClick={() => setSelected([])}>
                  <Icon name="close" size={13} />
                  Clear
                </button>
              </div>
            ) : (
              <div className="table-controls">
                {sort && (
                  <button
                    className="pill selected-pill"
                    onClick={() => setSort(null)}
                    aria-label={`Remove ${SORT_LABELS[sort.key].toLowerCase()} sorting`}
                  >
                    <Icon name="close" size={13} />
                    {SORT_LABELS[sort.key]}
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
                      <p>Sort by</p>
                      {SORT_OPTIONS.map((option) => (
                        <button
                          key={option.label}
                          onClick={() => {
                            setSort({
                              key: option.key,
                              descending: option.descending,
                            });
                            setMenu(null);
                          }}
                        >
                          {option.label}
                          {sort?.key === option.key &&
                            sort.descending === option.descending && (
                              <Icon name="check" size={14} />
                            )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {thisMonth && (
                  <button
                    className="pill selected-pill"
                    onClick={() => setThisMonth(false)}
                    aria-label="Remove this month filter"
                  >
                    <Icon name="close" size={13} />
                    This Month
                    {expanded === null ? ` (${visible.length})` : ""}
                  </button>
                )}
                <div className="popover-anchor">
                  <button
                    className={`pill ${activity || includeReviewed ? "filter-applied" : ""}`}
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
                      className="popover filter-popover"
                      onClick={(event) => event.stopPropagation()}
                    >
                      <p>Activity</p>
                      {[null, ...api.ACTIVITY_TYPES].map((type) => (
                        <button
                          key={type ?? "all"}
                          onClick={() => {
                            setActivity(type);
                            setMenu(null);
                          }}
                        >
                          {type ?? "All activities"}
                          {activity === type && (
                            <Icon name="check" size={14} />
                          )}
                        </button>
                      ))}
                      <p>Show</p>
                      <button onClick={() => setIncludeReviewed(!includeReviewed)}>
                        Reviewed logs
                        {includeReviewed && <Icon name="check" size={14} />}
                      </button>
                      <button onClick={() => setThisMonth(!thisMonth)}>
                        This month only
                        {thisMonth && <Icon name="check" size={14} />}
                      </button>
                    </div>
                  )}
                </div>
                <button
                  className="pill"
                  onClick={() => setEditing("new")}
                  disabled={!profile}
                >
                  <Icon name="plus" size={14} />
                  New Log
                </button>
              </div>
            )}
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
                        visible.length > 0 &&
                        selectedVisible.length === visible.length
                      }
                      onChange={(event) =>
                        setSelected(
                          event.target.checked
                            ? visible.map((log) => log.id)
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
                {loading && logs.length === 0 && !error
                  ? Array.from({ length: 4 }, (_, index) => (
                      <tr key={index} className="skeleton-row">
                        <td colSpan={7}>
                          <span />
                        </td>
                      </tr>
                    ))
                  : visible.map((log, index) => (
                      <Fragment key={log.id}>
                        <tr
                          className={`log-row ${expanded === log.id || (expanded === null && index === 0) ? "highlighted" : ""}`}
                          onClick={() => toggleRow(log.id)}
                        >
                          <td onClick={(event) => event.stopPropagation()}>
                            <input
                              type="checkbox"
                              aria-label={`Select ${log.employeeName}'s log`}
                              checked={selected.includes(log.id)}
                              onChange={() =>
                                setSelected((current) =>
                                  current.includes(log.id)
                                    ? current.filter((id) => id !== log.id)
                                    : [...current, log.id],
                                )
                              }
                            />
                          </td>
                          <td>{log.employeeName}</td>
                          <td>{log.activity}</td>
                          <td>{formatDate(log.startedAt, timeZone)}</td>
                          <td className="field-cell">{log.fieldName}</td>
                          <td>
                            {formatTimeRange(log.startedAt, log.endedAt, timeZone)}
                          </td>
                          <td>
                            <button
                              className="view-button"
                              aria-expanded={expanded === log.id}
                              aria-label={`${expanded === log.id ? "Close" : "View"} ${log.employeeName}'s log`}
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
                              <LogDetails
                                key={log.id}
                                log={log}
                                tagMenuOpen={menu === "tag"}
                                onToggleTagMenu={() =>
                                  setMenu(menu === "tag" ? null : "tag")
                                }
                                onAddTag={(name) => addTag(log.id, name)}
                                onRemoveTag={(tagId) =>
                                  void removeTag(log.id, tagId)
                                }
                                onEdit={() => setEditing(log)}
                                onOpenMap={() => setMapLog(log)}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                {error && (
                  <tr>
                    <td colSpan={7} className="empty-state" role="alert">
                      Couldn't load logs: {error}
                      <button onClick={() => void refresh()}>Try again</button>
                    </td>
                  </tr>
                )}
                {!loading && !error && visible.length === 0 && (
                  <tr>
                    <td colSpan={7} className="empty-state">
                      {logs.length === 0
                        ? "No logs yet. Create one to get started."
                        : "No logs match your filters."}
                      {logs.length > 0 && filtersActive && (
                        <button onClick={clearFilters}>
                          Show all logs
                        </button>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {mapLog && (
        <Modal
          title={mapLog.fieldName}
          onClose={() => setMapLog(null)}
          className="map-modal"
        >
          <img
            src="/reference/field-map.png"
            alt={`Expanded satellite map of ${mapLog.fieldName}`}
          />
          {mapLog.latitude !== null && mapLog.longitude !== null && (
            <p className="map-caption">
              Recorded at {mapLog.latitude.toFixed(4)},{" "}
              {mapLog.longitude.toFixed(4)} ·{" "}
              {formatDate(mapLog.startedAt, timeZone)}
            </p>
          )}
        </Modal>
      )}

      {editing && profile && (
        <LogFormDialog
          log={editing === "new" ? null : editing}
          employees={data.employees}
          fields={data.fields}
          timeZone={timeZone}
          defaultDate={stats?.asOf ?? new Date().toISOString().slice(0, 10)}
          onSave={saveLog}
          onDelete={
            editing === "new" ? null : () => setConfirmDelete([editing.id])
          }
          onClose={() => setEditing(null)}
        />
      )}

      {confirmDelete && (
        <ConfirmDialog
          title="Delete logs"
          message={
            confirmDelete.length === 1
              ? "Delete this log? Its tags will be removed too. This can't be undone."
              : `Delete ${confirmDelete.length} logs? Their tags will be removed too. This can't be undone.`
          }
          confirmLabel="Delete"
          busy={busy}
          onConfirm={() => void deleteLogs(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}
