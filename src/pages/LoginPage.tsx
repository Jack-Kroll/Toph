import { useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "../components/Icon";
import { supabase } from "../lib/supabase";

// Shared reviewer account; see README. Safe to ship: it only reaches its own
// demo farm, and any user can reset that farm from the account menu.
const DEMO_EMAIL = "demo@toph.farm";
const DEMO_PASSWORD = "TophDemo2026!";

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
            data: { full_name: fullName.trim(), farm_name: farmName.trim() },
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

  async function signInDemo() {
    setBusy(true);
    setError(null);
    try {
      await signIn(DEMO_EMAIL, DEMO_PASSWORD);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Sign in failed.");
      setBusy(false);
    }
  }

  const signingUp = mode === "sign-up";

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
            ? "New farms start with sample employees, fields, and logs."
            : "Sign in to review your farm and employee activity."}
        </p>

        <button
          type="button"
          className="primary-button demo-button"
          onClick={() => void signInDemo()}
          disabled={busy}
        >
          Continue with demo account
        </button>
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
                  placeholder="Bays Ranch"
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
