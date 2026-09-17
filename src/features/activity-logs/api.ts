import { supabase } from "../../lib/supabase";

export const ACTIVITY_TYPES = [
  "Spraying",
  "Fertilizing",
  "Planting",
  "Irrigation",
  "Harvesting",
  "Scouting",
  "Pruning",
  "Soil Work",
  "Equipment Maintenance",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export type Tag = { id: string; name: string };

export type ActivityLog = {
  id: string;
  employeeId: string;
  employeeName: string;
  fieldId: string;
  fieldName: string;
  activity: ActivityType;
  startedAt: string;
  endedAt: string;
  productName: string | null;
  applicationRate: number | null;
  rateUnit: string | null;
  transcript: string | null;
  audioPath: string | null;
  latitude: number | null;
  longitude: number | null;
  responseAccuracy: number | null;
  reviewedAt: string | null;
  createdAt: string;
  tags: Tag[];
};

export type LogInput = {
  employeeId: string;
  fieldId: string;
  activity: ActivityType;
  startedAt: string;
  endedAt: string;
  productName: string | null;
  applicationRate: number | null;
  rateUnit: string | null;
  transcript: string | null;
  latitude: number | null;
  longitude: number | null;
  reviewed: boolean;
  /** Set to create the employee or field along with the log. */
  newEmployeeName: string | null;
  newFieldName: string | null;
};

export type Option = { id: string; name: string };
/** Inactive employees stay on their old logs but aren't offered for new ones. */
export type EmployeeOption = Option & { active: boolean };
export type FieldOption = Option & {
  latitude: number | null;
  longitude: number | null;
};

export type DashboardStats = {
  asOf: string;
  todaysRecordings: number;
  todaysNew: number;
  activeWorkers: number;
  responseAccuracy: number | null;
};

type Result<T> = { data: T | null; error: { message: string } | null };

// Surfaces PostgREST errors as thrown exceptions so callers can use try/catch.
function check<T>(result: Result<T>) {
  if (result.error) throw new Error(result.error.message);
}

function unwrap<T>(result: Result<T>): T {
  check(result);
  if (result.data === null) throw new Error("No data returned.");
  return result.data;
}

const LOG_COLUMNS = `
  id, employee_id, field_id, activity_type, started_at, ended_at,
  product_name, application_rate, rate_unit, transcript, audio_path,
  latitude, longitude, response_accuracy, reviewed_at, created_at,
  employee:employees(full_name),
  field:fields(name),
  log_tags:activity_log_tags(tag:tags(id, name))
`;

export async function fetchLogs(): Promise<ActivityLog[]> {
  // PostgREST caps each response; read all pages so filters and employee
  // visibility still use the full history on larger farms.
  const pageSize = 1000;
  const readPage = (offset: number) =>
    supabase
      .from("activity_logs")
      .select(LOG_COLUMNS)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + pageSize - 1);
  const rows = unwrap(await readPage(0));
  let pageLength = rows.length;
  while (pageLength === pageSize) {
    const page = unwrap(await readPage(rows.length));
    pageLength = page.length;
    rows.push(...page);
  }
  return rows.map((row) => ({
    id: row.id,
    employeeId: row.employee_id,
    employeeName: row.employee?.full_name ?? "Unknown employee",
    fieldId: row.field_id,
    fieldName: row.field?.name ?? "Unknown field",
    activity: row.activity_type as ActivityType,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    productName: row.product_name,
    applicationRate: row.application_rate,
    rateUnit: row.rate_unit,
    transcript: row.transcript,
    audioPath: row.audio_path,
    latitude: row.latitude,
    longitude: row.longitude,
    responseAccuracy: row.response_accuracy,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    tags: row.log_tags
      .flatMap(({ tag }) => (tag ? [tag] : []))
      .sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

export async function fetchStats(): Promise<DashboardStats | null> {
  const [row] = unwrap(await supabase.rpc("dashboard_stats"));
  if (!row) return null;
  return {
    asOf: row.as_of,
    todaysRecordings: row.todays_recordings,
    todaysNew: row.todays_new,
    activeWorkers: row.active_workers,
    responseAccuracy: row.response_accuracy,
  };
}

export async function fetchOptions() {
  const [employees, fields] = await Promise.all([
    supabase
      .from("employees")
      .select("id, full_name, is_active")
      .order("full_name"),
    supabase
      .from("fields")
      .select("id, name, latitude, longitude")
      .order("name"),
  ]);
  return {
    employees: unwrap(employees).map((e): EmployeeOption => ({
      id: e.id,
      name: e.full_name,
      active: e.is_active,
    })),
    fields: unwrap(fields) as FieldOption[],
  };
}

// 23505 is Postgres's unique-violation code.
function friendlyInsertError(
  error: { code: string; message: string },
  label: string,
) {
  return new Error(
    error.code === "23505"
      ? `A ${label} with that name already exists.`
      : error.message,
  );
}

export async function createEmployee(fullName: string): Promise<Option> {
  const { data, error } = await supabase
    .from("employees")
    .insert({ full_name: fullName })
    .select("id, full_name")
    .single();
  if (error) throw friendlyInsertError(error, "employee");
  return { id: data.id, name: data.full_name };
}

export async function createField(
  name: string,
  latitude: number | null,
  longitude: number | null,
): Promise<FieldOption> {
  const { data, error } = await supabase
    .from("fields")
    .insert({ name, latitude, longitude })
    .select("id, name, latitude, longitude")
    .single();
  if (error) throw friendlyInsertError(error, "field");
  return data;
}

/** Creates any employee or field the form asked for and returns their ids. */
async function resolveOptions(input: LogInput) {
  const employeeId = input.newEmployeeName
    ? (await createEmployee(input.newEmployeeName)).id
    : input.employeeId;
  const fieldId = input.newFieldName
    ? (await createField(input.newFieldName, input.latitude, input.longitude))
        .id
    : input.fieldId;
  return { ...input, employeeId, fieldId };
}

function toRow(input: LogInput) {
  return {
    employee_id: input.employeeId,
    field_id: input.fieldId,
    activity_type: input.activity,
    started_at: input.startedAt,
    ended_at: input.endedAt,
    product_name: input.productName,
    application_rate: input.applicationRate,
    rate_unit: input.rateUnit,
    transcript: input.transcript,
    latitude: input.latitude,
    longitude: input.longitude,
  };
}

export async function createLog(form: LogInput) {
  const input = await resolveOptions(form);
  check(
    await supabase.from("activity_logs").insert({
      ...toRow(input),
      reviewed_at: input.reviewed ? new Date().toISOString() : null,
    }),
  );
}

export async function updateLog(
  id: string,
  form: LogInput,
  previousReviewedAt: string | null,
) {
  const input = await resolveOptions(form);
  // Keep the original review time when the reviewed state is unchanged.
  const reviewedAt = input.reviewed
    ? (previousReviewedAt ?? new Date().toISOString())
    : null;
  check(
    await supabase
      .from("activity_logs")
      .update({ ...toRow(input), reviewed_at: reviewedAt })
      .eq("id", id),
  );
}

export async function deleteLogs(ids: string[]) {
  check(await supabase.from("activity_logs").delete().in("id", ids));
}

export async function setReviewed(ids: string[], reviewed: boolean) {
  const query = supabase
    .from("activity_logs")
    .update({ reviewed_at: reviewed ? new Date().toISOString() : null })
    .in("id", ids);
  // Only touch rows whose state changes, so review times are preserved.
  check(
    await (reviewed
      ? query.is("reviewed_at", null)
      : query.not("reviewed_at", "is", null)),
  );
}

async function createTag(name: string): Promise<Tag> {
  const { data, error } = await supabase
    .from("tags")
    .insert({ name })
    .select("id, name")
    .single();
  if (error) throw new Error(error.message);
  return data;
}

export async function addTag(logId: string, name: string): Promise<Tag> {
  // Tag names are unique per farm (case-insensitive), so reuse a match.
  const pattern = name.replace(/[\\%_]/g, (char) => `\\${char}`);
  const existing = unwrap(
    await supabase.from("tags").select("id, name").ilike("name", pattern),
  );
  const tag: Tag = existing[0] ?? (await createTag(name));
  const { error } = await supabase
    .from("activity_log_tags")
    .insert({ activity_log_id: logId, tag_id: tag.id });
  // 23505: the tag is already on this log, which is the desired end state.
  if (error && error.code !== "23505") throw new Error(error.message);
  return tag;
}

export async function removeTag(logId: string, tagId: string) {
  check(
    await supabase
      .from("activity_log_tags")
      .delete()
      .eq("activity_log_id", logId)
      .eq("tag_id", tagId),
  );
}

export async function recordingUrl(path: string) {
  const data = unwrap(
    await supabase.storage.from("recordings").createSignedUrl(path, 60 * 60),
  );
  return data.signedUrl;
}

export async function resetDemoData() {
  check(await supabase.rpc("reset_demo_data"));
}
