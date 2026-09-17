import { describe, expect, it } from "vitest";
import { timeZoneOptions } from "../../src/features/settings/timeZones";

describe("time-zone options", () => {
  it("keeps a small menu and preserves international saved/local choices", () => {
    const zones = timeZoneOptions("Europe/London", "Asia/Tokyo");
    expect(zones).toHaveLength(10);
    expect(zones.map((zone) => zone.value)).toContain("Europe/London");
    expect(zones.map((zone) => zone.value)).toContain("Asia/Tokyo");
    expect(timeZoneOptions("America/Chicago", "America/Chicago")).toHaveLength(8);
    expect(new Set(zones.map((zone) => zone.value)).size).toBe(zones.length);
  });
});
