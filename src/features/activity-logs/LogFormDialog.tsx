import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Modal } from "../../components/Modal";
import { localDate, localTime, zonedToIso } from "../../lib/time";
import {
  ACTIVITY_TYPES,
  type ActivityLog,
  type ActivityType,
  type LogInput,
  type Option,
} from "./api";

type Props = {
  log: ActivityLog | null;
  employees: Option[];
  fields: Option[];
  timeZone: string;
  defaultDate: string;
  onSave: (input: LogInput) => Promise<void>;
  onDelete: (() => void) | null;
  onClose: () => void;
};

export function LogFormDialog({
  log,
  employees,
  fields,
  timeZone,
  defaultDate,
  onSave,
  onDelete,
  onClose,
}: Props) {
  const [form, setForm] = useState({
    employeeId: log?.employeeId ?? employees[0]?.id ?? "",
    fieldId: log?.fieldId ?? fields[0]?.id ?? "",
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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set =
    (key: keyof typeof form) =>
    (
      event: ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) =>
      setForm({
        ...form,
        [key]:
          event.target instanceof HTMLInputElement &&
          event.target.type === "checkbox"
            ? event.target.checked
            : event.target.value,
      });

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
    setSaving(true);
    setError(null);
    try {
      await onSave({
        employeeId: form.employeeId,
        fieldId: form.fieldId,
        activity: form.activity,
        startedAt: zonedToIso(form.date, form.start, timeZone),
        endedAt: zonedToIso(form.date, form.end, timeZone),
        productName: form.productName.trim() || null,
        applicationRate: rate ? Number(rate) : null,
        rateUnit: form.rateUnit.trim() || null,
        transcript: form.transcript.trim() || null,
        reviewed: form.reviewed,
      });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not save.");
      setSaving(false);
    }
  }

  return (
    <Modal
      title={log ? "Edit Log" : "New Log"}
      onClose={onClose}
      className="form-modal"
    >
      <form className="log-form" onSubmit={submit}>
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
          </select>
        </label>
        <label>
          Activity
          <select value={form.activity} onChange={set("activity")}>
            {ACTIVITY_TYPES.map((type) => (
              <option key={type}>{type}</option>
            ))}
          </select>
        </label>
        <label>
          Field
          <select required value={form.fieldId} onChange={set("fieldId")}>
            {fields.map((field) => (
              <option key={field.id} value={field.id}>
                {field.name}
              </option>
            ))}
          </select>
        </label>
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
            <button
              type="button"
              className="danger-link"
              onClick={onDelete}
            >
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
