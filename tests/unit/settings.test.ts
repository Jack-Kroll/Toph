import { describe, expect, it } from "vitest";
import { employeesWithLogs } from "../../src/features/settings/employees";
import { timeZoneOptions } from "../../src/features/settings/timeZones";

describe("settings employees", () => {
  const employees = [
    { id: "a", name: "A", active: true },
    { id: "b", name: "B", active: false },
    { id: "c", name: "C", active: true },
  ];
  it("hides employees only after their last log disappears, including old/reviewed logs", () => {
    const logs = [{ employeeId: "a" }, { employeeId: "a" }, { employeeId: "b" }];
    expect(employeesWithLogs(employees, logs).map((e) => e.id)).toEqual(["a", "b"]);
    expect(employeesWithLogs(employees, logs.slice(1)).map((e) => e.id)).toEqual(["a", "b"]);
    expect(employeesWithLogs(employees, logs.slice(2)).map((e) => e.id)).toEqual(["b"]);
    expect(employeesWithLogs(employees, [])).toEqual([]);
    expect(employees).toHaveLength(3);
  });
});
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
