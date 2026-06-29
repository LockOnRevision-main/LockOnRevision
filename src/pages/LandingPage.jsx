import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  CheckCircle2,
  Gauge,
  GraduationCap,
  Lock,
  Medal,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

function IsoStack({ variant = "blue" }) {
  const palette =
    variant === "amber"
      ? "from-amber-300 via-blue-400 to-indigo-500"
      : variant === "green"
        ? "from-emerald-300 via-amber-400 to-indigo-500"
        : "from-blue-400 via-amber-300 to-sky-500";

  return (
    <div className="relative mx-auto h-72 w-full max-w-md [perspective:900px]" aria-hidden="true">
      <div className="absolute inset-x-10 top-12 h-44 rotate-[-8deg] skew-y-[-16deg] rounded-xl bg-gradient-to-br from-white to-slate-100 shadow-2xl shadow-blue-200" />
      <div className={`absolute left-20 top-4 h-28 w-44 rotate-[-8deg] skew-y-[-16deg] rounded-xl bg-gradient-to-br ${palette} shadow-xl shadow-amber-200`} />
      <div className="absolute right-16 top-24 h-24 w-36 rotate-[-8deg] skew-y-[-16deg] rounded-xl border border-white/60 bg-white/85 shadow-xl" />
      <div className="absolute left-28 top-28 grid h-20 w-20 rotate-[-8deg] skew-y-[-16deg] place-items-center rounded-xl bg-slate-950 text-white shadow-xl">
        <Zap size={30} />
      </div>
      <div className="absolute right-24 top-9 grid h-14 w-14 rotate-[-8deg] skew-y-[-16deg] place-items-center rounded-lg bg-white text-indigo-600 shadow-lg">
        <Trophy size={24} />
      </div>
      <div className="absolute bottom-8 left-16 h-6 w-64 rounded-full bg-blue-900/10 blur-xl" />
    </div>
  );
}

const featureCards = [
  {
    icon: Brain,
    title: "Revision With Momentum",
    copy: "Students earn progress through focused tasks instead of passive rereading.",
  },
  {
    icon: Zap,
    title: "Energy That Matters",
    copy: "Energy is scarce, earned, and worth 100 XP on the leaderboard.",
  },
  {
    icon: Trophy,
    title: "Healthy Competition",
    copy: "Leaderboards make consistent revision visible and motivating.",
  },
  {
    icon: ShieldCheck,
    title: "Admin Ready",
    copy: "The product architecture leaves space for moderation, cohorts, and analytics.",
  },
];

const steps = [
  "Create an account when Firebase is re-enabled.",
  "Complete mock tests and revision units.",
  "Earn XP and Energy under controlled rules.",
  "Climb a leaderboard powered by total score.",
];

export function LandingPage() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();

  function getStarted() {
    navigate(user ? "/app" : "/login");
  }

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-amber-100">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_50%_0%,rgba(34,211,238,.28),transparent_60%)]" />
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link to="/" className="flex items-center gap-3 font-black">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-amber-400 text-white">
              <Sparkles size={20} />
            </span>
            LockOn Revision
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/leaderboard" className="hidden rounded-lg px-3 py-2 text-sm font-bold text-slate-600 sm:inline-flex">
              Leaderboard
            </Link>
            <button
              type="button"
              onClick={getStarted}
              disabled={loading}
              className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-black text-white disabled:opacity-60"
            >
              Get Started
            </button>
          </div>
        </nav>

        <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-3 py-2 text-sm font-bold text-blue-700 shadow-sm">
              <GraduationCap size={16} />
              Competitive revision for students
            </p>
            <h1 className="text-5xl font-black tracking-tight sm:text-7xl">LockOn Revision</h1>
            <p className="mt-5 max-w-2xl text-xl font-medium leading-8 text-slate-600">Smarter revision starts here.</p>
            <p className="mt-4 max-w-2xl text-slate-600">
              LockOn Revision turns study consistency into a visible scoring system. Students complete units, attempt
              mock tests, gain XP, earn Energy, and compare progress through a focused leaderboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={getStarted}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-amber-500 px-6 py-3 font-black text-white shadow-xl shadow-amber-100 transition hover:-translate-y-0.5 disabled:opacity-60"
              >
                Get Started
                <ArrowRight size={18} />
              </button>
              <Link to="/leaderboard" className="rounded-lg border border-slate-200 bg-white px-6 py-3 font-black text-slate-700 shadow-sm">
                View Leaderboard
              </Link>
            </div>
          </div>
          <IsoStack />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">Why LockOn</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">Revision needs feedback, not just effort.</h2>
          <p className="mt-4 text-slate-600">
            Students often study without knowing whether the work is compounding. LockOn makes progress measurable and
            encourages better habits through simple, visible scoring.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {featureCards.map((feature) => (
            <article key={feature.title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <feature.icon className="text-indigo-600" size={24} />
              <h3 className="mt-4 text-lg font-black">{feature.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">Features</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">A revision platform built around action.</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {[
              ["XP", "Tracks learning progress from completed work.", BookOpenCheck],
              ["Energy", "Rewards high-quality performance and unit completion.", Zap],
              ["Leaderboard", "Ranks students by total score, not vanity activity.", Medal],
            ].map(([title, copy, Icon]) => (
              <article key={title} className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <Icon className="text-amber-500" size={28} />
                <h3 className="mt-5 text-2xl font-black">{title}</h3>
                <p className="mt-2 leading-7 text-slate-600">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 lg:grid-cols-2">
        <IsoStack variant="green" />
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">How It Works</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">XP + Energy creates a clearer score.</h2>
          <div className="mt-6 grid gap-3">
            {steps.map((step, index) => (
              <div key={step} className="flex gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-sm font-black text-blue-700">
                  {index + 1}
                </span>
                <p className="font-bold text-slate-700">{step}</p>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-xl bg-gradient-to-r from-indigo-50 to-amber-50 p-4 font-black text-blue-800">
            Total Score = XP + (Energy x 100)
          </p>
        </div>
      </section>

      <section className="bg-gradient-to-br from-slate-950 to-blue-950 py-20 text-white">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-amber-300">Leaderboard Overview</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">Competition that rewards consistency.</h2>
            <p className="mt-4 leading-7 text-white/70">
              The leaderboard is intentionally simple: students are ranked by total score. XP shows learning volume,
              Energy highlights high-value performance, and the formula keeps the system easy to understand.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-lg bg-white/10 px-4 py-3 font-black text-amber-100">
              <Zap size={18} />
              1 Energy = 100 XP
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-amber-950/40 backdrop-blur">
            {["Rank", "Name", "Total Score"].map((item) => (
              <span key={item} className="mr-6 text-xs font-bold uppercase tracking-widest text-white/45">
                {item}
              </span>
            ))}
            <div className="mt-4 grid gap-3">
              {["Student profile", "XP breakdown", "Energy bonus"].map((item, index) => (
                <div key={item} className="flex items-center justify-between rounded-lg bg-white/10 p-4">
                  <span className="font-black">{index + 1}. {item}</span>
                  <span className="text-amber-200">Firestore</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-indigo-600">Admin Capabilities</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight">Designed for cohorts, moderation, and insight.</h2>
          <p className="mt-4 text-slate-600">
            Admin tooling gives authorized teams a focused place to review users, rewards, Forge content, and access
            decisions.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["Cohort controls", Users],
            ["Score audits", BarChart3],
            ["Energy rule tuning", Gauge],
            ["Access management", Lock],
          ].map(([title, Icon]) => (
            <article key={title} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <Icon className="text-indigo-600" />
              <h3 className="mt-4 font-black">{title}</h3>
              <p className="mt-2 text-sm text-slate-500">Available through the authenticated admin workspace.</p>
            </article>
          ))}
        </div>
      </section>

      <section className="px-5 pb-20">
        <div className="mx-auto max-w-5xl rounded-2xl bg-gradient-to-r from-indigo-600 to-amber-500 p-10 text-center text-white shadow-2xl shadow-amber-100">
          <CheckCircle2 className="mx-auto" size={36} />
          <h2 className="mt-4 text-4xl font-black tracking-tight">Ready to lock in better revision?</h2>
          <p className="mx-auto mt-3 max-w-2xl text-white/80">
            Create an account, upload your notes, generate lessons, and keep momentum visible as you revise.
          </p>
          <button
            type="button"
            onClick={getStarted}
            className="mt-7 rounded-lg bg-white px-6 py-3 font-black text-blue-700 shadow-sm"
          >
            Get Started
          </button>
        </div>
      </section>
    </main>
  );
}
