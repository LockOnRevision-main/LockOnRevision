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
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { Logo } from "../components/Logo.jsx";

function IsoStack({ variant = "blue" }) {
  const palette =
    variant === "amber"
      ? "from-accent via-primary to-secondary"
      : variant === "green"
        ? "from-success via-primary to-secondary"
        : "from-primary via-accent to-secondary";

  return (
    <div className="relative mx-auto h-72 w-full max-w-md [perspective:900px]" aria-hidden="true">
      <div className="absolute inset-x-10 top-12 h-44 rotate-[-8deg] skew-y-[-16deg] rounded-xl bg-gradient-to-br from-surface to-background shadow-2xl shadow-primary/20" />
      <div className={`absolute left-20 top-4 h-28 w-44 rotate-[-8deg] skew-y-[-16deg] rounded-xl bg-gradient-to-br ${palette} shadow-xl shadow-accent/20`} />
      <div className="absolute right-16 top-24 h-24 w-36 rotate-[-8deg] skew-y-[-16deg] rounded-xl border border-text-primary/60 bg-surface/85 shadow-xl" />
      <div className="absolute left-28 top-28 grid h-20 w-20 rotate-[-8deg] skew-y-[-16deg] place-items-center rounded-xl bg-secondary text-text-primary shadow-xl">
        <Zap size={30} />
      </div>
      <div className="absolute right-24 top-9 grid h-14 w-14 rotate-[-8deg] skew-y-[-16deg] place-items-center rounded-lg bg-surface text-primary shadow-lg">
        <Trophy size={24} />
      </div>
      <div className="absolute bottom-8 left-16 h-6 w-64 rounded-full bg-primary/10 blur-xl" />
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
    <main className="min-h-screen bg-background text-text-primary">
      <section className="relative overflow-hidden bg-gradient-to-br from-background via-surface to-secondary">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_50%_0%,var(--color-primary),transparent_60%)] opacity-20" />
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-5 py-5">
          <Link to="/" className="flex items-center gap-3 font-black">
            <Logo variant="horizontal" className="scale-110" />
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/leaderboard" className="hidden rounded-lg px-3 py-2 text-sm font-bold text-text-secondary sm:inline-flex">
              Leaderboard
            </Link>
            <button
              type="button"
              onClick={getStarted}
              disabled={loading}
              className="rounded-lg bg-secondary px-4 py-2 text-sm font-black text-text-primary transition-all duration-150 active:scale-95 disabled:opacity-60"
            >
              Get Started
            </button>
          </div>
        </nav>

        <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-3 py-2 text-sm font-bold text-primary shadow-sm">
                <GraduationCap size={16} />
                Competitive revision for students
            </p>
            <h1 className="text-5xl font-black tracking-tight sm:text-7xl text-text-primary">LockOn Revision</h1>
            <p className="mt-5 max-w-2xl text-xl font-medium leading-8 text-text-secondary">Smarter revision starts here.</p>
            <p className="mt-4 max-w-2xl text-text-secondary">
              LockOn Revision turns study consistency into a visible scoring system. Students complete units, attempt
              mock tests, gain XP, earn Energy, and compare progress through a focused leaderboard.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={getStarted}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-primary to-secondary px-6 py-3 font-black text-text-primary shadow-xl shadow-primary/20 transition-all duration-300 hover:-translate-y-0.5 active:scale-95 disabled:opacity-60"
              >
                Get Started
                <ArrowRight size={18} />
              </button>
              <Link to="/leaderboard" className="rounded-lg border border-border bg-surface px-6 py-3 font-black text-text-primary shadow-sm">
                View Leaderboard
              </Link>
            </div>
          </div>
          <IsoStack />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-[0.8fr_1.2fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Why LockOn</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-text-primary">Revision needs feedback, not just effort.</h2>
          <p className="mt-4 text-text-secondary">
            Students often study without knowing whether the work is compounding. LockOn makes progress measurable and
            encourages better habits through simple, visible scoring.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
           {featureCards.map((feature) => (
             <article key={feature.title} className="rounded-xl border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
               <feature.icon className="text-primary" size={24} />
               <h3 className="mt-4 text-lg font-black tracking-tight text-text-primary">{feature.title}</h3>
               <p className="mt-2 text-sm leading-6 text-text-secondary">{feature.copy}</p>
             </article>
           ))}

        </div>
      </section>

      <section className="bg-surface py-20">
        <div className="mx-auto max-w-7xl px-5">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Features</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight text-text-primary">A revision platform built around action.</h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
             {[
               ["XP", "Tracks learning progress from completed work.", BookOpenCheck],
               ["Energy", "Rewards high-quality performance and unit completion.", Zap],
               ["Leaderboard", "Ranks students by total score, not vanity activity.", Medal],
             ].map(([title, copy, Icon]) => (
               <article key={title} className="rounded-xl border border-border bg-card p-6 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1">
                 <Icon className="text-primary" size={28} />
                 <h3 className="mt-5 text-2xl font-black tracking-tight text-text-primary">{title}</h3>
                 <p className="mt-2 leading-7 text-text-secondary">{copy}</p>
               </article>
             ))}

          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-20 lg:grid-cols-2">
        <IsoStack variant="green" />
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary">How It Works</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-text-primary">XP + Energy creates a clearer score.</h2>
          <div className="mt-6 grid gap-3">
             {steps.map((step, index) => (
               <div key={step} className="flex gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-all duration-200 hover:bg-surface">
                 <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-sm font-black text-primary">
                   {index + 1}
                 </span>
                 <p className="font-bold text-text-primary">{step}</p>
               </div>
             ))}

          </div>
          <p className="mt-5 rounded-xl bg-gradient-to-r from-surface to-card p-4 font-black text-text-primary">
            Total Score = XP + (Energy x 100)
          </p>
        </div>
      </section>

      <section className="bg-gradient-to-br from-background to-secondary py-20 text-text-primary">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 lg:grid-cols-[1fr_0.9fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Leaderboard Overview</p>
            <h2 className="mt-3 text-4xl font-black tracking-tight">Competition that rewards consistency.</h2>
            <p className="mt-4 leading-7 text-text-secondary">
              The leaderboard is intentionally simple: students are ranked by total score. XP shows learning volume,
              Energy highlights high-value performance, and the formula keeps the system easy to understand.
            </p>
            <p className="mt-5 inline-flex items-center gap-2 rounded-lg bg-surface/50 px-4 py-3 font-black text-text-primary">
              <Zap size={18} />
              1 Energy = 100 XP
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface/50 p-5 shadow-2xl shadow-secondary/40 backdrop-blur">
            {["Rank", "Name", "Total Score"].map((item) => (
              <span key={item} className="mr-6 text-xs font-bold uppercase tracking-widest text-text-muted">
                {item}
              </span>
            ))}
            <div className="mt-4 grid gap-3">
              {["Student profile", "XP breakdown", "Energy bonus"].map((item, index) => (
                <div key={item} className="flex items-center justify-between rounded-lg bg-surface/50 p-4">
                  <span className="font-black text-text-primary">{index + 1}. {item}</span>
                  <span className="text-primary">Firestore</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Admin Capabilities</p>
          <h2 className="mt-3 text-4xl font-black tracking-tight text-text-primary">Designed for cohorts, moderation, and insight.</h2>
          <p className="mt-4 text-text-secondary">
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
            <article key={title} className="rounded-xl border border-border bg-surface p-5 shadow-sm">
              <Icon className="text-primary" />
              <h3 className="mt-4 font-black text-text-primary">{title}</h3>
              <p className="mt-2 text-sm text-text-muted">Available through the authenticated admin workspace.</p>
            </article>
          ))}
        </div>
      </section>
    </section>
    <section className="px-5 pb-20">
      <div className="mx-auto max-w-5xl rounded-2xl bg-gradient-to-r from-primary to-secondary p-10 text-center text-text-primary shadow-2xl shadow-primary/20">
        <CheckCircle2 className="mx-auto" size={36} />
        <h2 className="mt-4 text-4xl font-black tracking-tight">Ready to lock in better revision?</h2>
        <p className="mx-auto mt-3 max-w-2xl text-text-secondary">
          Create an account, upload your notes, generate lessons, and keep momentum visible as you revise.
        </p>
        <button
          type="button"
          onClick={getStarted}
          className="mt-7 rounded-lg bg-text-primary px-6 py-3 font-black text-primary shadow-sm"
        >
          Get Started
        </button>
      </div>
    </section>
    </main>
  );
}
