import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../components/Icon";
import { supabase } from "../lib/supabase";

export function LoginPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [farmName, setFarmName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function signIn(address: string, secret: string) {
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: address,
      password: secret,
    });
    if (authError) throw authError;
  }

  // Each browser gets its own anonymous account, and the signup trigger gives
  // that account a private copy of the demo farm.
  async function startDemo() {
    setBusy(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInAnonymously();
    if (authError) {
      setError(
        authError.message.includes("disabled")
          ? "The demo is unavailable right now. Please create an account instead."
          : authError.message,
      );
      setBusy(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "sign-in") {
        await signIn(email, password);
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
              farm_name: farmName.trim(),
              // The farm's "today" follows this zone; the server validates it.
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            },
          },
        });
        if (authError) throw authError;
        if (!data.session)
          setNotice("Check your email to confirm your account, then sign in.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  const signingUp = mode === "sign-up";

  useEffect(() => {
    document.title = signingUp ? "Create your farm · Toph" : "Sign in · Toph";
  }, [signingUp]);

  return (
    <main className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="auth-logo">
            <Icon name="audio" size={18} />
          </span>
          Toph
        </div>
        <h1>{signingUp ? "Create your farm" : "Welcome back"}</h1>
        <p className="auth-subtitle">
          {signingUp
            ? "Set up your farm. You'll add employees, fields, and logs as you go."
            : "Sign in to review your farm and employee activity."}
        </p>

        <button
          type="button"
          className="primary-button demo-button"
          onClick={() => void startDemo()}
          disabled={busy}
        >
          Try the demo
        </button>
        <p className="demo-note">
          Opens a private demo farm in this browser. Your changes are saved, and
          no one else sees them.
        </p>
        <div className="auth-divider">
          <span>or</span>
        </div>

        <form onSubmit={submit} className="auth-form">
          {signingUp && (
            <>
              <label>
                Your name
                <input
                  required
                  autoComplete="name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                />
              </label>
              <label>
                Farm name
                <input
                  required
                  maxLength={120}
                  placeholder="e.g. Prairie Creek Farm"
                  value={farmName}
                  onChange={(event) => setFarmName(event.target.value)}
                />
              </label>
            </>
          )}
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              required
              minLength={8}
              autoComplete={signingUp ? "new-password" : "current-password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {notice && (
            <p className="form-notice" role="status">
              {notice}
            </p>
          )}
          <button type="submit" className="secondary-button" disabled={busy}>
            {busy ? "Please wait…" : signingUp ? "Create account" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">
          {signingUp ? "Already have an account?" : "New to Toph?"}{" "}
          <button
            type="button"
            onClick={() => {
              setMode(signingUp ? "sign-in" : "sign-up");
              setError(null);
              setNotice(null);
            }}
          >
            {signingUp ? "Sign in" : "Create a farm"}
          </button>
        </p>
      </div>
    </main>
  );
}
