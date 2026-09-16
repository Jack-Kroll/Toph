import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  fetchLogs,
  fetchOptions,
  fetchStats,
  type ActivityLog,
  type DashboardStats,
  type FieldOption,
  type Option,
} from "../features/activity-logs/api";

export type Organization = {
  name: string;
  timezone: string;
  isDemo: boolean;
};

export type Profile = {
  fullName: string;
  role: string;
  organization: Organization;
};

async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, role, organization:organizations(name, timezone, demo_as_of)")
    .eq("id", userId)
    .single();
  if (error) throw new Error(error.message);
  if (!data.organization) throw new Error("Your account has no farm.");
  return {
    fullName: data.full_name,
    role: data.role,
    organization: {
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
  const [employees, setEmployees] = useState<Option[]>([]);
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
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
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
