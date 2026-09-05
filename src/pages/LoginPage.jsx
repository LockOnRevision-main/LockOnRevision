import { ArrowLeft, LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Logo } from "../components/Logo.jsx";
import { Footer } from "../components/Footer.jsx";
import { PasswordInput } from "../components/PasswordInput.jsx";
import { useTranslation } from "react-i18next";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

export function LoginPage() {
  const { isFirebaseConfigured, login, register, resetPassword, signInWithGoogle, completeGoogleLinkWithPassword, user } = useAuth();
  const { t } = useTranslation();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  // account-exists-with-different-credential link flow
  const [linkState, setLinkState] = useState(null); // { email, credential, password }
  const [linkPassword, setLinkPassword] = useState("");
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkError, setLinkError] = useState("");

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

  async function handleGoogle() {
    setError("");
    setLinkError("");
    setGoogleBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      if (err?.code === "auth/account-exists-with-different-credential" && err.credential) {
        setLinkState({ email: err.email || form.email, credential: err.credential });
        setError("");
      } else {
        const msg = (err.message || "").replace(/^Firebase:\s*/i, "");
        setError(msg);
      }
    } finally {
      setGoogleBusy(false);
    }
  }

  async function handleLinkWithPassword(e) {
    e.preventDefault();
    if (!linkState) return;
    if (linkPassword.length < 6) { setLinkError("Password must be at least 6 characters."); return; }
    setLinkBusy(true);
    setLinkError("");
    try {
      const email = linkState.email || form.email;
      await completeGoogleLinkWithPassword(email, linkPassword, linkState.credential);
      setLinkState(null);
      setLinkPassword("");
    } catch (err) {
      setLinkError((err.message || "").replace(/^Firebase:\s*/i, ""));
    } finally {
      setLinkBusy(false);
    }
  }

  function switchMode(newMode) {
    setMode(newMode);
    setError("");
    setResetSent(false);
    setLinkState(null);
  }

  return (
    <>
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-background via-surface to-secondary px-4 text-text-primary">
      <section className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-2xl shadow-primary/20 backdrop-blur">
        <div className="mb-6 flex flex-col items-center">
          <Logo variant="horizontal" theme="light" className="mb-4 scale-90" />
          <h1 className="mt-2 text-3xl font-black tracking-tight text-text-primary">
            {mode === "register" ? t("auth.create_account") : mode === "reset" ? t("auth.reset_password") : t("auth.welcome_back")}
          </h1>
          <p className="mt-2 text-sm text-text-secondary text-center">
            {mode === "reset"
              ? t("auth.reset_subtitle")
              : isFirebaseConfigured
                ? t("auth.login_subtitle")
                : t("auth.config_missing")}
          </p>
        </div>

        {/* Link-with-password flow – Firebase best practice for account-exists */}
        {linkState ? (
          <form className="grid gap-4 rounded-2xl border border-warning/30 bg-warning/10 p-4 mb-4" onSubmit={handleLinkWithPassword}>
            <p className="text-sm font-bold text-text-primary">
              An account already exists for <span className="text-primary">{linkState.email}</span> with email/password.
              Enter your password to link Google — your progress, uploads, and UID will be preserved.
            </p>
            <label className="grid gap-2 text-sm font-bold text-text-primary">
              Password for {linkState.email}
              <span className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3">
                <LockKeyhole size={17} className="text-text-muted" />
                <input
                  required
                  type="password"
                  className="min-w-0 flex-1 py-3 outline-none bg-transparent"
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  placeholder="Enter your existing password"
                />
              </span>
            </label>
            {linkError ? <p className="rounded-xl bg-status-error/20 p-3 text-sm font-bold text-status-error">{linkError}</p> : null}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={linkBusy}
                className="flex-1 rounded-xl bg-primary px-4 py-3 font-black text-white disabled:opacity-50"
              >
                {linkBusy ? t("common.loading") : "Link Google to existing account"}
              </button>
              <button type="button" onClick={() => setLinkState(null)} className="rounded-xl border border-border px-4 py-3 font-bold text-text-secondary">Cancel</button>
            </div>
          </form>
        ) : null}

        <form className="grid gap-4" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label className="grid gap-2 text-sm font-bold text-text-primary">
              {t("profile.display_name")}
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
            {t("auth.email")}
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
                {t("auth.password")}
                <PasswordInput
                  id="register-password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  showValidation={true}
                />
              </label>
            ) : (
              <label className="grid gap-2 text-sm font-bold text-text-primary">
                {t("auth.password")}
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
              {t("auth.reset_sent")}
            </p>
          ) : null}

          {error ? <p className="rounded-xl bg-status-error/20 p-3 text-sm font-bold text-status-error">{error}</p> : null}

          <button
            disabled={busy || (mode === "reset" && resetSent)}
            className="rounded-xl bg-primary px-4 py-3 font-black text-white disabled:bg-surface transition-all hover:bg-primary-active active:scale-95"
          >
            {busy ? t("common.loading") : mode === "register" ? t("auth.create_account") : mode === "reset" ? t("auth.send_reset") : t("nav.login")}
          </button>
        </form>

        {/* Google Sign-In – Firebase best practice */}
        {mode !== "reset" && (
          <>
            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-border" />
              <span className="text-xs font-bold uppercase tracking-widest text-text-muted">or</span>
              <span className="h-px flex-1 bg-border" />
            </div>
            <button
              type="button"
              onClick={handleGoogle}
              disabled={googleBusy || !isFirebaseConfigured}
              className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 font-black text-text-primary hover:bg-background transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title={!isFirebaseConfigured ? "Configure Firebase to enable Google Sign-In" : "Continue with Google"}
            >
              <GoogleIcon />
              {googleBusy ? t("common.loading") : "Continue with Google"}
            </button>
            {!isFirebaseConfigured && (
              <p className="mt-2 text-center text-xs text-text-muted">Google Sign-In requires Firebase configuration.</p>
            )}
          </>
        )}

        <div className="mt-5 flex flex-col items-center gap-3">
          {mode === "reset" ? (
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="flex items-center gap-1 text-sm font-bold text-primary"
            >
              <ArrowLeft size={16} /> {t("auth.back_to_login")}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className="w-full text-sm font-bold text-primary"
              >
                {mode === "register" ? t("auth.has_account") : t("auth.no_account")}
              </button>
              <button
                type="button"
                onClick={() => switchMode("reset")}
                className="text-xs font-bold text-text-muted hover:text-primary transition-colors"
              >
                {t("auth.forgot_password")}
              </button>
            </>
          )}
        </div>
      </section>
    </main>
      <Footer />
    </>
  );
}
