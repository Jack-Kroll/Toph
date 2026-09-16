import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router";
import type { Session } from "@supabase/supabase-js";
import { ConfirmDialog } from "./Modal";
import { Sidebar } from "./Sidebar";
import { useDashboardData } from "../hooks/useDashboardData";
import { supabase } from "../lib/supabase";
import { resetDemoData } from "../features/activity-logs/api";
import { errorMessage, type LayoutContext, type ToastTone } from "./layoutContext";

type Toast = { message: string; tone: ToastTone };

/** Sidebar, farm data, and notifications shared by every signed-in page. */
export function AppLayout({ session }: { session: Session }) {
  const data = useDashboardData(session.user.id);
  const [toast, setToast] = useState<Toast | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const notify = useCallback(
    (message: string, tone: ToastTone = "success") =>
      setToast({ message, tone }),
    [],
  );

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  async function resetDemo() {
    setResetting(true);
    try {
      await resetDemoData();
      setConfirmReset(false);
      notify("Demo data restored.");
      await data.refresh();
    } catch (caught) {
      notify(`Couldn't reset: ${errorMessage(caught)}`, "error");
    } finally {
      setResetting(false);
    }
  }

  return (
    <div className="app-shell">
      <Sidebar
        profile={data.profile}
        email={session.user.is_anonymous ? null : (session.user.email ?? null)}
        newCount={data.stats?.todaysNew ?? 0}
        onSignOut={() => void supabase.auth.signOut()}
        onResetDemo={() => setConfirmReset(true)}
      />
      <Outlet context={{ session, data, notify } satisfies LayoutContext} />

      {confirmReset && (
        <ConfirmDialog
          title="Reset demo data"
          message="Restore the original Bays Ranch employees, fields, and logs? Your changes will be lost."
          confirmLabel="Reset"
          busy={resetting}
          onConfirm={() => void resetDemo()}
          onCancel={() => setConfirmReset(false)}
        />
      )}

      {toast && (
        <div className={`toast ${toast.tone}`} role="status">
          {toast.message}
        </div>
      )}
    </div>
  );
}
