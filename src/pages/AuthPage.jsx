import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function AuthPage() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");

    try {
      if (mode === "signup") {
        if (password.length < 8) {
          throw new Error("Use a password with at least 8 characters.");
        }

        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (authError) throw authError;

        if (data.session) {
          setMessage("Account created! Welcome to WordStreak.");
        } else {
          setMessage(
            "Account created. Check your email to confirm your account, then sign in."
          );
          setMode("login");
        }
      } else if (mode === "login") {
        const { error: authError } =
          await supabase.auth.signInWithPassword({
            email: email.trim(),
            password,
          });

        if (authError) throw authError;
      } else {
        const { error: authError } =
          await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin,
          });

        if (authError) throw authError;
        setMessage("If the email is registered, a password reset link will be sent.");
      }
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <header className="auth-brand">
        <span className="brand-icon">W.</span>
        <span>wordstreak</span>
      </header>

      <section className="auth-card">
        <p className="eyebrow">YOUR WORD JOURNEY STARTS HERE</p>
        <h1>
          {mode === "signup"
            ? "Create your account."
            : mode === "reset"
              ? "Reset your password."
              : "Welcome back."}
        </h1>
        <p className="auth-description">
          {mode === "signup"
            ? "Start fresh. Your stats belong to you."
            : mode === "reset"
              ? "We'll send you a password reset link."
              : "Sign in to continue your streak."}
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          {mode !== "reset" && (
            <>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                autoComplete={
                  mode === "signup" ? "new-password" : "current-password"
                }
                placeholder={
                  mode === "signup"
                    ? "At least 8 characters"
                    : "Your password"
                }
                minLength={mode === "signup" ? 8 : undefined}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </>
          )}

          {error && <p className="auth-error">{error}</p>}
          {message && <p className="auth-message">{message}</p>}

          <button className="primary-button auth-submit" disabled={busy}>
            {busy
              ? "Please wait..."
              : mode === "signup"
                ? "Create account"
                : mode === "reset"
                  ? "Send reset link"
                  : "Sign in"}
          </button>
        </form>

        <div className="auth-links">
          {mode === "login" && (
            <>
              <button type="button" onClick={() => {
                setMode("signup");
                setMessage("");
                setError("");
              }}>
                Create an account
              </button>
              <button type="button" onClick={() => {
                setMode("reset");
                setMessage("");
                setError("");
              }}>
                Forgot password?
              </button>
            </>
          )}

          {mode !== "login" && (
            <button type="button" onClick={() => {
              setMode("login");
              setMessage("");
              setError("");
            }}>
              Back to sign in
            </button>
          )}
        </div>

        <p className="auth-footnote">
          Each account starts with its own fresh stats and game.
        </p>
      </section>
    </main>
  );
}
