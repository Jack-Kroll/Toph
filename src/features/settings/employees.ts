import type { ActivityLog, EmployeeOption } from "../activity-logs/api";

/** Settings shows workers represented in the farm's log history, regardless
 * of dashboard filters. Keep the records available for future log entry. */
export function employeesWithLogs(
  employees: EmployeeOption[],
  logs: Pick<ActivityLog, "employeeId">[],
) {
  const ids = new Set(logs.map((log) => log.employeeId));
  return employees.filter((employee) => ids.has(employee.id));
}
