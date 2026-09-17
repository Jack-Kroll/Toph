import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  fetchLogs,
  fetchOptions,
  fetchStats,
  type ActivityLog,
  type DashboardStats,
  type EmployeeOption,
  type FieldOption,
} from "../features/activity-logs/api";

export type Organization = {
  id: string;
  name: string;
  timezone: string;
  isDemo: boolean;
};

export type Profile = {
  id: string;
  fullName: string;
  /** Path in the avatars bucket, or null for no photo. */
  avatarPath: string | null;
  role: string;
  organization: Organization;
};

async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "id, full_name, role, avatar_path, organization:organizations(id, name, timezone, demo_as_of)",
    )
    .eq("id", userId)
    .single();
  if (error) throw new Error(error.message);
  if (!data.organization) throw new Error("Your account has no farm.");
  return {
    id: data.id,
    fullName: data.full_name,
    avatarPath: data.avatar_path,
    role: data.role,
    organization: {
      id: data.organization.id,
      name: data.organization.name,
      timezone: data.organization.timezone,
      isDemo: data.organization.demo_as_of !== null,
    },
  };
}

export function useDashboardData(userId: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [fields, setFields] = useState<FieldOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Drops responses from superseded requests so stale data never wins.
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    try {
      const [nextProfile, nextLogs, nextStats, options] = await Promise.all([
        fetchProfile(userId),
        fetchLogs(),
        fetchStats(),
        fetchOptions(),
      ]);
      if (id !== requestId.current) return;
      setProfile(nextProfile);
      setLogs(nextLogs);
      setStats(nextStats);
      setEmployees(options.employees);
      setFields(options.fields);
      setError(null);
    } catch (caught) {
      if (id !== requestId.current) return;
      setError(
        caught instanceof Error ? caught.message : "Something went wrong.",
      );
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // Async: state is set after the requests resolve, not synchronously.
    // oxlint-disable-next-line react/set-state-in-effect
    void refresh();
    const channel = supabase
      .channel("activity-logs")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_logs" },
        () => void refresh(),
      )
      .subscribe();
    return () => {
      // Invalidate the live request counter, not a captured DOM ref.
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      requestId.current++;
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return {
    profile,
    logs,
    setLogs,
    stats,
    employees,
    fields,
    loading,
    error,
    refresh,
  };
}
