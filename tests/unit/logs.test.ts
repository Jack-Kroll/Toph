import { describe, expect, it } from "vitest";
import type { ActivityLog } from "../../src/features/activity-logs/api";
import {
  filterLogs,
  sortLogs,
  type LogFilters,
} from "../../src/features/activity-logs/filters";
import {
  formatDate,
  formatTimeRange,
  localDate,
  localTime,
  zonedToIso,
} from "../../src/lib/time";

const TZ = "America/Chicago";

function log(overrides: Partial<ActivityLog>): ActivityLog {
  return {
    id: crypto.randomUUID(),
    employeeId: "e",
    employeeName: "Isaac Wang",
    fieldId: "f",
    fieldName: "Field A",
    activity: "Spraying",
    startedAt: "2026-04-19T11:00:00Z",
    endedAt: "2026-04-19T15:40:00Z",
    productName: null,
    applicationRate: null,
    rateUnit: null,
    transcript: null,
    audioPath: null,
    latitude: null,
    longitude: null,
    responseAccuracy: null,
    reviewedAt: null,
    createdAt: "2026-04-19T16:00:00Z",
    tags: [],
    ...overrides,
  };
}

const defaults: LogFilters = {
  query: "",
  activity: null,
  month: null,
  includeReviewed: true,
  timeZone: TZ,
};

describe("time helpers", () => {
  it("converts farm wall time to UTC across DST", () => {
    expect(zonedToIso("2026-04-19", "06:00", TZ)).toBe(
      "2026-04-19T11:00:00.000Z",
    );
    expect(zonedToIso("2026-01-15", "06:00", TZ)).toBe(
      "2026-01-15T12:00:00.000Z",
    );
  });

  it("round-trips through local date and time", () => {
    const iso = zonedToIso("2026-11-01", "23:30", TZ);
    expect(localDate(iso, TZ)).toBe("2026-11-01");
    expect(localTime(iso, TZ)).toBe("23:30");
  });

  it("rejects nonexistent spring-forward times instead of shifting the log", () => {
    expect(() => zonedToIso("2026-03-08", "02:30", TZ)).toThrow("clocks change");
    expect(localTime(zonedToIso("2026-03-08", "03:30", TZ), TZ)).toBe("03:30");
  });

  it("formats like the design", () => {
    expect(formatDate("2026-04-19T11:00:00Z", TZ)).toBe("April 19, 2026");
    expect(
      formatTimeRange("2026-04-19T11:00:00Z", "2026-04-19T15:40:00Z", TZ),
    ).toBe("6:00 AM - 10:40 AM");
  });

  it("uses the farm's date, not UTC, near midnight", () => {
    // 04:30 UTC on the 20th is still the evening of the 19th in Chicago.
    expect(localDate("2026-04-20T04:30:00Z", TZ)).toBe("2026-04-19");
  });
});

describe("filterLogs", () => {
  const logs = [
    log({ employeeName: "Isaac Wang", tags: [{ id: "t", name: "Drift" }] }),
    log({
      employeeName: "Maya Patel",
      activity: "Harvesting",
      reviewedAt: "2026-04-20T00:00:00Z",
    }),
    log({ employeeName: "Liam Johnson", startedAt: "2026-03-24T12:00:00Z" }),
  ];
  const names = (result: ActivityLog[]) => result.map((l) => l.employeeName);

  it("hides reviewed logs unless asked", () => {
    expect(names(filterLogs(logs, { ...defaults, includeReviewed: false })))
      .toEqual(["Isaac Wang", "Liam Johnson"]);
  });

  it("filters by month in the farm's time zone", () => {
    expect(names(filterLogs(logs, { ...defaults, month: "2026-03" }))).toEqual([
      "Liam Johnson",
    ]);
  });

  it("matches every search term across columns and tags", () => {
    expect(names(filterLogs(logs, { ...defaults, query: "drift isaac" })))
      .toEqual(["Isaac Wang"]);
    expect(names(filterLogs(logs, { ...defaults, query: "april 19" })))
      .toEqual(["Isaac Wang", "Maya Patel"]);
    expect(filterLogs(logs, { ...defaults, query: "drift maya" })).toEqual([]);
  });

  it("filters by activity", () => {
    expect(names(filterLogs(logs, { ...defaults, activity: "Harvesting" })))
      .toEqual(["Maya Patel"]);
  });
});

describe("sortLogs", () => {
  const logs = [
    log({ employeeName: "B", startedAt: "2026-04-21T00:00:00Z" }),
    log({ employeeName: "A", startedAt: "2026-04-22T00:00:00Z" }),
    log({ employeeName: "C", startedAt: "2026-04-19T00:00:00Z" }),
  ];
  const names = (result: ActivityLog[]) => result.map((l) => l.employeeName);

  it("sorts by date in either direction", () => {
    expect(names(sortLogs(logs, { key: "date", descending: false }))).toEqual([
      "C",
      "B",
      "A",
    ]);
    expect(names(sortLogs(logs, { key: "date", descending: true }))).toEqual([
      "A",
      "B",
      "C",
    ]);
  });

  it("keeps received order without a sort and never mutates input", () => {
    expect(sortLogs(logs, null)).toBe(logs);
    sortLogs(logs, { key: "employee", descending: false });
    expect(names(logs)).toEqual(["B", "A", "C"]);
  });
});
