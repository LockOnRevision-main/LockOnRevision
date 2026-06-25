import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export function LoginPage() {
  const { isFirebaseConfigured, login, register, user } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to="/app" replace />;

  async function handleSubmit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") {
        await register(form.name, form.email, form.password);
      } else {
        await login(form.email, form.password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-blue-50 via-white to-cyan-100 px-4 text-slate-950">
      <section className="w-full max-w-md rounded-xl border border-white/80 bg-white/90 p-6 shadow-2xl shadow-blue-100 backdrop-blur">
        <div className="mb-6">
          <p className="text-sm font-bold uppercase tracking-widest text-blue-600">LockOn Revision</p>
          <h1 className="mt-2 text-3xl font-black">{mode === "register" ? "Create account" : "Welcome back"}</h1>
          <p className="mt-2 text-sm text-slate-500">
            {isFirebaseConfigured ? "Sign in with your email and password." : "Firebase config is missing."}
          </p>
        </div>

        <form className="grid gap-4" onSubmit={handleSubmit}>
          {mode === "register" ? (
            <label className="grid gap-2 text-sm font-bold">
              Name
              <span className="flex items-center gap-2 rounded-lg border border-slate-200 px-3">
                <UserRound size={17} className="text-slate-400" />
                <input
                  required
                  className="min-w-0 flex-1 py-3 outline-none"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                />
              </span>
            </label>
          ) : null}

          <label className="grid gap-2 text-sm font-bold">
            Email
            <span className="flex items-center gap-2 rounded-lg border border-slate-200 px-3">
              <Mail size={17} className="text-slate-400" />
              <input
                required
                type="email"
                className="min-w-0 flex-1 py-3 outline-none"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </span>
          </label>

          <label className="grid gap-2 text-sm font-bold">
            Password
            <span className="flex items-center gap-2 rounded-lg border border-slate-200 px-3">
              <LockKeyhole size={17} className="text-slate-400" />
              <input
                required
                minLength={8}
                type="password"
                className="min-w-0 flex-1 py-3 outline-none"
                value={form.password}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            </span>
          </label>

          {error ? <p className="rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p> : null}

          <button
            disabled={busy || !isFirebaseConfigured}
            className="rounded-lg bg-slate-950 px-4 py-3 font-black text-white disabled:bg-slate-300"
          >
            {busy ? "Working..." : mode === "register" ? "Create account" : "Log in"}
          </button>
        </form>

        <button
          type="button"
          onClick={() => setMode(mode === "register" ? "login" : "register")}
          className="mt-5 w-full text-sm font-bold text-blue-700"
        >
          {mode === "register" ? "Already have an account? Log in" : "New here? Create an account"}
        </button>
      </section>
    </main>
  );
}
