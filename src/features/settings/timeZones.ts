const COMMON_ZONES = [
  { value: "America/New_York", label: "Eastern Time" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Phoenix", label: "Arizona Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Anchorage", label: "Alaska Time" },
  { value: "Pacific/Honolulu", label: "Hawaii Time" },
  { value: "UTC", label: "UTC" },
];

/** A short menu without losing an existing farm's international time zone. */
export function timeZoneOptions(current: string, local: string) {
  const options = [...COMMON_ZONES];
  for (const value of [current, local]) {
    if (value && !options.some((option) => option.value === value)) {
      options.push({ value, label: value.replaceAll("_", " ") });
    }
  }
  return options;
}
