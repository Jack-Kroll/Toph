import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

/** Undefined while the stored session is being restored. */
export function useSession() {
  const [session, setSession] = useState<Session | null | undefined>();
  useEffect(() => {
    // Supabase emits INITIAL_SESSION after restoring storage. One source of
    // truth avoids a stale getSession response undoing a newer sign-in/out.
    const { data } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession(next),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  return session;
}
