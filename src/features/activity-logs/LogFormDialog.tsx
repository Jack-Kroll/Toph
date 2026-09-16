import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { LazySatelliteMap } from "../../components/LazySatelliteMap";
import { Modal } from "../../components/Modal";
import type { LatLng } from "../../components/SatelliteMap";
import { localDate, localTime, zonedToIso } from "../../lib/time";
import {
  ACTIVITY_TYPES,
  type ActivityLog,
  type ActivityType,
  type FieldOption,
  type LogInput,
  type Option,
} from "./api";

type Props = {
  log: ActivityLog | null;
  employees: Option[];
  fields: FieldOption[];
  timeZone: string;
  defaultDate: string;
  /** Show a satellite picker for the log's location. */
  liveMap: boolean;
  onSave: (input: LogInput) => Promise<void>;
  onDelete: (() => void) | null;
  onClose: () => void;
};

function fieldPoint(field: FieldOption | undefined): LatLng | null {
  return field?.latitude != null && field.longitude != null
    ? { latitude: field.latitude, longitude: field.longitude }
    : null;
}

// Select value that reveals a name box for a new employee or field.
const NEW = "__new__";
// Center of the contiguous US, for farms with no locations yet.
const COUNTRY_VIEW: LatLng = { latitude: 39.5, longitude: -98.35 };

const formatPoint = (point: LatLng) =>
  `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;

export function LogFormDialog({
  log,
  employees,
  fields,
  timeZone,
  defaultDate,
  liveMap,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [form, setForm] = useState({
    employeeId: log?.employeeId ?? employees[0]?.id ?? NEW,
    fieldId: log?.fieldId ?? fields[0]?.id ?? NEW,
    newEmployeeName: "",
    newFieldName: "",
    activity: log?.activity ?? ("Spraying" as ActivityType),
    date: log ? localDate(log.startedAt, timeZone) : defaultDate,
    start: log ? localTime(log.startedAt, timeZone) : "08:00",
    end: log ? localTime(log.endedAt, timeZone) : "10:00",
    productName: log?.productName ?? "",
    applicationRate: log?.applicationRate?.toString() ?? "",
    rateUnit: log?.rateUnit ?? "",
    transcript: log?.transcript ?? "",
    reviewed: log ? log.reviewedAt !== null : false,
  });
  const logPoint =
    log?.latitude != null && log.longitude != null
      ? { latitude: log.latitude, longitude: log.longitude }
      : null;
  // A new log follows its field's location until someone picks a spot.
  const [point, setPoint] = useState<LatLng | null>(
    () => logPoint ?? fieldPoint(fields.find((f) => f.id === form.fieldId)),
  );
  const [followField, setFollowField] = useState(!logPoint);
  // Where the map is centered; changes only on deliberate moves, not clicks.
  const [view, setView] = useState<LatLng | null>(point);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (key: keyof typeof form) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const { target } = event;
      const value =
        target instanceof HTMLInputElement && target.type === "checkbox"
          ? target.checked
          : target.value;
      setForm((current) => ({ ...current, [key]: value }));
    };

  function moveTo(next: LatLng | null, follow: boolean) {
    setPoint(next);
    setView(next);
    setFollowField(follow);
  }

  function changeField(event: ChangeEvent<HTMLSelectElement>) {
    set("fieldId")(event);
    // A new field takes whatever spot is pinned, so leave the pin alone.
    if (event.target.value === NEW) {
      setFollowField(false);
      return;
    }
    // Without a live map there is no way to pick, so always follow the field.
    if (followField || !liveMap) {
      moveTo(fieldPoint(fields.find((f) => f.id === event.target.value)), true);
    }
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setError("This browser can't share its location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        setError(null);
        moveTo(
          {
            latitude: Number(position.coords.latitude.toFixed(6)),
            longitude: Number(position.coords.longitude.toFixed(6)),
          },
          false,
        );
      },
      (failure) => {
        setLocating(false);
        setError(
          failure.code === failure.PERMISSION_DENIED
            ? "Location access was denied. Click the map to choose a spot instead."
            : "Couldn't get your location. Click the map to choose a spot instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (form.end <= form.start) {
      setError("End time must be after the start time.");
      return;
    }
    const rate = form.applicationRate.trim();
    if (rate && (Number.isNaN(Number(rate)) || Number(rate) < 0)) {
      setError("Application rate must be a positive number.");
      return;
    }
    const newEmployeeName =
      form.employeeId === NEW ? form.newEmployeeName.trim() : null;
    const newFieldName = form.fieldId === NEW ? form.newFieldName.trim() : null;
    if (newEmployeeName === "" || newFieldName === "") {
      setError("Enter a name for the new employee or field.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({
        employeeId: form.employeeId,
        fieldId: form.fieldId,
        newEmployeeName,
        newFieldName,
        activity: form.activity,
        startedAt: zonedToIso(form.date, form.start, timeZone),
        endedAt: zonedToIso(form.date, form.end, timeZone),
        productName: form.productName.trim() || null,
        applicationRate: rate ? Number(rate) : null,
        rateUnit: form.rateUnit.trim() || null,
        transcript: form.transcript.trim() || null,
        latitude: point?.latitude ?? null,
        longitude: point?.longitude ?? null,
        reviewed: form.reviewed,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
      setSaving(false);
    }
  }

  const selectedField = fields.find((f) => f.id === form.fieldId);
  const selectedFieldPoint = fieldPoint(selectedField);
  // Something sensible to look at before any location exists.
  const nearbyView =
    view ?? selectedFieldPoint ?? fields.map(fieldPoint).find(Boolean) ?? null;
  const addingField = form.fieldId === NEW;

  return (
    <Modal
      title={log ? "Edit Log" : "New Log"}
      onClose={onClose}
      className="form-modal"
    >
      <form className="log-form" onSubmit={submit}>
        <div className="form-stack">
          <label>
            Employee
            <select
              required
              value={form.employeeId}
              onChange={set("employeeId")}
            >
              {employees.map((employee) => (
                <option key={employee.id} value={employee.id}>
                  {employee.name}
                </option>
              ))}
              <option value={NEW}>+ Add new employee…</option>
            </select>
          </label>
          {form.employeeId === NEW && (
            <input
              required
              autoFocus={employees.length > 0}
              maxLength={120}
              placeholder="Employee name"
              aria-label="New employee name"
              value={form.newEmployeeName}
              onChange={set("newEmployeeName")}
            />
          )}
        </div>
        <label>
          Activity
          <select value={form.activity} onChange={set("activity")}>
            {ACTIVITY_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <div className="form-stack">
          <label>
            Field
            <select required value={form.fieldId} onChange={changeField}>
              {fields.map((field) => (
                <option key={field.id} value={field.id}>
                  {field.name}
                </option>
              ))}
              <option value={NEW}>+ Add new field…</option>
            </select>
          </label>
          {addingField && (
            <input
              required
              maxLength={60}
              placeholder="Field name"
              aria-label="New field name"
              value={form.newFieldName}
              onChange={set("newFieldName")}
            />
          )}
        </div>
        <label>
          Date
          <input
            type="date"
            required
            value={form.date}
            onChange={set("date")}
          />
        </label>
        <label>
          Start time
          <input
            type="time"
            required
            value={form.start}
            onChange={set("start")}
          />
        </label>
        <label>
          End time
          <input type="time" required value={form.end} onChange={set("end")} />
        </label>
        <label>
          Product applied
          <input
            placeholder="e.g. Glyphosate 41%"
            value={form.productName}
            onChange={set("productName")}
          />
        </label>
        <label>
          Rate
          <input
            inputMode="decimal"
            placeholder="32"
            value={form.applicationRate}
            onChange={set("applicationRate")}
          />
        </label>
        <label>
          Unit
          <input
            placeholder="fl oz/ac"
            value={form.rateUnit}
            onChange={set("rateUnit")}
          />
        </label>

        {liveMap && (
          <div className="location-field span-3">
            <div className="location-header">
              <span>Location</span>
              <span className="location-coords">
                {point
                  ? `${formatPoint(point)}${
                      addingField
                        ? " · saved as the new field's location"
                        : followField
                          ? " · field location"
                          : ""
                    }`
                  : addingField
                    ? "Click the map to place the new field"
                    : "Not set"}
              </span>
            </div>
            <LazySatelliteMap
              className="picker-map"
              center={nearbyView ?? COUNTRY_VIEW}
              marker={point}
              zoom={nearbyView ? 16 : 4}
              onPick={(next) => {
                setPoint(next);
                setFollowField(false);
              }}
              label="Map for choosing where the work happened. Click to move the pin."
            />
            <div className="location-actions">
              <span className="location-hint">
                Click the map to move the pin.
              </span>
              <button
                type="button"
                className="text-button"
                disabled={!selectedFieldPoint}
                onClick={() => moveTo(selectedFieldPoint, true)}
              >
                Use field location
              </button>
              <button
                type="button"
                className="text-button"
                disabled={locating}
                onClick={locateMe}
              >
                {locating ? "Locating…" : "Use my current location"}
              </button>
            </div>
          </div>
        )}

        <label className="span-3">
          Transcript
          <textarea
            rows={4}
            value={form.transcript}
            onChange={set("transcript")}
          />
        </label>
        <label className="checkbox-label span-3">
          <input
            type="checkbox"
            checked={form.reviewed}
            onChange={set("reviewed")}
          />
          Reviewed (hides the log from New Employee Logs)
        </label>
        {error && (
          <p className="form-error span-3" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions span-3">
          {onDelete && (
            <button type="button" className="danger-link" onClick={onDelete}>
              Delete log
            </button>
          )}
          <button type="button" className="secondary-button" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Saving…" : log ? "Save changes" : "Create log"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
