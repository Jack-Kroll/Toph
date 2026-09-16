import { useOutletContext } from "react-router";
import type { Session } from "@supabase/supabase-js";
import type { useDashboardData } from "../hooks/useDashboardData";

export type ToastTone = "success" | "error";

export type LayoutContext = {
  session: Session;
  data: ReturnType<typeof useDashboardData>;
  notify: (message: string, tone?: ToastTone) => void;
};

export function useLayout() {
  return useOutletContext<LayoutContext>();
}

export function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}
