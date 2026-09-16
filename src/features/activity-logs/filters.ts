import { formatDate, localDate } from "../../lib/time";
import type { ActivityLog } from "./api";

export type SortKey = "date" | "employee" | "activity" | "field";
export type Sort = { key: SortKey; descending: boolean } | null;

export const SORT_LABELS: Record<SortKey, string> = {
  date: "Date",
  employee: "Employee",
  activity: "Activity",
  field: "Field",
};

export type LogFilters = {
  query: string;
  activity: string | null;
  /** Month (YYYY-MM) to limit results to, or null for all time. */
  month: string | null;
  includeReviewed: boolean;
  timeZone: string;
};

export function filterLogs(logs: ActivityLog[], filters: LogFilters) {
  const terms = filters.query.toLowerCase().split(/\s+/).filter(Boolean);
  return logs.filter((log) => {
    if (!filters.includeReviewed && log.reviewedAt) return false;
    if (filters.activity && log.activity !== filters.activity) return false;
    if (
      filters.month &&
      !localDate(log.startedAt, filters.timeZone).startsWith(filters.month)
    )
      return false;
    if (terms.length === 0) return true;
    const haystack = [
      log.employeeName,
      log.activity,
      log.fieldName,
      formatDate(log.startedAt, filters.timeZone),
      log.productName,
      log.transcript,
      ...log.tags.map((tag) => tag.name),
    ]
      .join(" ")
      .toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });
}

const compare: Record<SortKey, (a: ActivityLog, b: ActivityLog) => number> = {
  date: (a, b) => a.startedAt.localeCompare(b.startedAt),
  employee: (a, b) => a.employeeName.localeCompare(b.employeeName),
  activity: (a, b) => a.activity.localeCompare(b.activity),
  field: (a, b) => a.fieldName.localeCompare(b.fieldName),
};

/** With no sort, logs keep the order they were received (newest first). */
export function sortLogs(logs: ActivityLog[], sort: Sort) {
  if (!sort) return logs;
  const direction = sort.descending ? -1 : 1;
  return [...logs].sort(
    (a, b) =>
      direction * compare[sort.key](a, b) ||
      a.startedAt.localeCompare(b.startedAt),
  );
}
