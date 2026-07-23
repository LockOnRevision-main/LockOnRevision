import { ArrowLeft, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Logo } from "../components/Logo.jsx";
import { PasswordInput } from "../components/PasswordInput.jsx";

export function LoginPage() {
  const { isFirebaseConfigured, login, register, resetPassword, user } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setResetSent(false);
    try {
      if (mode === "register") {
        await register(form.name, form.email, form.password);
      } else if (mode === "reset") {
        await resetPassword(form.email);
        setResetSent(true);
      } else {
        await login(form.email, form.password);
      }
    } catch (err) {
      const msg = err.message || "";
      setError(msg.replace(/^Firebase:\s*/i, ""));
    } finally {
      setBusy(false);
    }
  }

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
    setResetSent(false);
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-background via-surface to-secondary px-4 text-text-primary">
      <section className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-2xl shadow-primary/20 backdrop-blur">
        <div className="mb-6 flex flex-col items-center">
          <Logo variant="horizontal" theme="light" className="mb-4 scale-90" />
          <h1 className="mt-2 text-3xl font-black tracking-tight text-text-primary">
            {mode === "register" ? "Create account" : mode === "reset" ? "Reset password" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-text-secondary text-center">
            {mode === "reset"
              ? "Enter your email and we'll send you a reset link."
              : isFirebaseConfigured
                ? "Sign in with your email and password."
                : "Firebase config is missing."}
          </p>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label className="grid gap-2 text-sm font-bold text-text-primary">
              Name
                <span className="flex items-center gap-2 rounded-xl border border-border px-3 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50">
                   <UserRound size={17} className="text-text-muted" />
                  <input
                    required
                    className="min-w-0 flex-1 py-3 outline-none bg-transparent text-text-primary"
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                  />
                </span>
            </label>
          ) : null}

          <label className="grid gap-2 text-sm font-bold text-text-primary">
            Email
                <span className="flex items-center gap-2 rounded-xl border border-border px-3 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50">
                   <Mail size={17} className="text-text-muted" />
                  <input
                    required
                    type="email"
                    className="min-w-0 flex-1 py-3 outline-none bg-transparent text-text-primary"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                  />
                </span>
          </label>

          {mode !== "reset" ? (
            mode === "register" ? (
              <label className="grid gap-2 text-sm font-bold text-text-primary">
                Password
                <PasswordInput
                  id="register-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  showValidation={true}
                />
              </label>
            ) : (
              <label className="grid gap-2 text-sm font-bold text-text-primary">
                Password
                <div className="flex items-center gap-2 rounded-xl border border-border px-3 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50">
                  <LockKeyhole size={17} className="shrink-0 text-text-muted" />
                  <input
                    required
                    type="password"
                    className="min-w-0 flex-1 py-3 outline-none bg-transparent text-text-primary"
                    value={form.password}
                    onChange={(event) => setForm({ ...form, password: event.target.value })}
                  />
                </div>
              </label>
            )
          ) : null}

          {resetSent ? (
            <p className="rounded-xl bg-status-success/20 p-3 text-sm font-bold text-status-success">
              Reset link sent. Check your email.
            </p>
          ) : null}

          {error ? <p className="rounded-xl bg-status-error/20 p-3 text-sm font-bold text-status-error">{error}</p> : null}

          <button
            disabled={busy || !isFirebaseConfigured || (mode === "reset" && resetSent)}
            className="rounded-xl bg-primary px-4 py-3 font-black text-white disabled:bg-surface transition-all hover:bg-primary-active active:scale-95"
          >
            {busy ? "Working..." : mode === "register" ? "Create account" : mode === "reset" ? "Send reset link" : "Log in"}
          </button>
        </form>

        <div className="mt-5 flex flex-col items-center gap-3">
          {mode === "reset" ? (
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="flex items-center gap-1 text-sm font-bold text-primary"
            >
              <ArrowLeft size={16} /> Back to login
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="w-full text-sm font-bold text-primary"
              >
                {mode === "register" ? "Already have an account? Log in" : "New here? Create an account"}
              </button>
              <button
                type="button"
                onClick={() => switchMode("reset")}
                className="text-xs font-bold text-text-muted hover:text-primary transition-colors"
              >
                Forgot your password?
              </button>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
