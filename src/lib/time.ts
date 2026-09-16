// Farms record work in their own local time, which may differ from the
// browser's. These helpers convert through the farm's IANA time zone.

function zonedParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);
  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

function offsetMs(date: Date, timeZone: string) {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** "2026-04-19" + "06:00" in America/Chicago -> ISO instant. */
export function zonedToIso(date: string, time: string, timeZone: string) {
  const wall = new Date(`${date}T${time}:00Z`);
  // A second pass settles the offset on days that cross a DST change.
  const first = new Date(wall.getTime() - offsetMs(wall, timeZone));
  return new Date(wall.getTime() - offsetMs(first, timeZone)).toISOString();
}

/** ISO instant -> local date ("2026-04-19") in the farm's time zone. */
export function localDate(iso: string, timeZone: string) {
  const p = zonedParts(new Date(iso), timeZone);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** ISO instant -> local time ("06:00") in the farm's time zone. */
export function localTime(iso: string, timeZone: string) {
  const p = zonedParts(new Date(iso), timeZone);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatDate(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function formatTimeRange(start: string, end: string, timeZone: string) {
  const format = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
  });
  // Newer ICU versions put a narrow no-break space before AM/PM.
  const time = (iso: string) =>
    format.format(new Date(iso)).replace(/ /g, " ");
  return `${time(start)} - ${time(end)}`;
}
