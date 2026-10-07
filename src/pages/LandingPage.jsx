import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  Gauge,
  GraduationCap,
  Lock,
  Medal,
  ShieldCheck,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Logo } from "../components/Logo";
import { Footer } from "../components/Footer";
import { useAuth } from "../context/AuthContext.jsx";

function IsoStack({ variant = "blue" }) {
  const palette =
    variant === "amber"
      ? "from-warning/80 via-primary to-secondary"
      : variant === "green"
        ? "from-success/80 via-primary to-secondary"
        : "from-primary via-accent to-secondary";

  return (
    <div className="relative mx-auto h-72 w-full max-w-md [perspective:900px]" aria-hidden="true">
      <div className="absolute inset-x-10 top-12 h-44 rotate-[-8deg] skew-y-[-16deg] rounded-xl bg-gradient-to-br from-surface to-background shadow-2xl shadow-primary/20" />
      <div className={`absolute left-20 top-4 h-28 w-44 rotate-[-8deg] skew-y-[-16deg] rounded-xl bg-gradient-to-br ${palette} shadow-xl shadow-primary/20`} />
      <div className="absolute right-16 top-24 h-24 w-36 rotate-[-8deg] skew-y-[-16deg] rounded-xl border border-text-primary/10 bg-surface/85 shadow-xl backdrop-blur" />
      <div className="absolute left-28 top-28 grid h-20 w-20 rotate-[-8deg] skew-y-[-16deg] place-items-center rounded-xl bg-secondary text-white shadow-xl">
        <Zap size={30} />
      </div>
      <div className="absolute right-24 top-9 grid h-14 w-14 rotate-[-8deg] skew-y-[-16deg] place-items-center rounded-lg bg-surface text-primary shadow-lg">
        <Trophy size={24} />
      </div>
      <div className="absolute bottom-8 left-16 h-6 w-64 rounded-full bg-primary/10 blur-xl" />
    </div>
  );
}

function useReveal() {
  const ref = useRef(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, revealed];
}

function Section({ children, className = "" }) {
  const [ref, revealed] = useReveal();
  return (
    <section
      ref={ref}
      className={`transition-all duration-700 ${
        revealed ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      } ${className}`}
    >
      {children}
    </section>
  );
}

function LandingPageContent() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const featureCards = [
    {
      icon: Brain,
      title: t("landing.feature_revision_title"),
      copy: t("landing.feature_revision_desc"),
    },
    {
      icon: Zap,
      title: t("landing.feature_energy_title"),
      copy: t("landing.feature_energy_desc"),
    },
    {
      icon: Trophy,
      title: t("landing.feature_competition_title"),
      copy: t("landing.feature_competition_desc"),
    },
    {
      icon: ShieldCheck,
      title: t("landing.feature_admin_title"),
      copy: t("landing.feature_admin_desc"),
    },
  ];

  const steps = [
    t("landing.step1"),
    t("landing.step2"),
    t("landing.step3"),
    t("landing.step4"),
  ];

  function getStarted() {
    navigate("/login");
  }

  return (
    <>
    <main className="min-h-screen bg-background text-text-primary overflow-x-hidden">
      {/* ───── HERO ───── */}
      <Section className="relative overflow-hidden bg-background text-text-primary">
        <div className="absolute inset-x-0 top-0 h-[600px] bg-[radial-gradient(circle_at_50%_0%,var(--color-primary),transparent_70%)] opacity-20" />
        <nav className="relative mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
          <Link
            to="/"
            className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
          >
            <Logo theme="light" className="h-10 w-auto" />
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/about"
              className="hidden rounded-xl px-4 py-2.5 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:inline-flex"
            >
              {t("nav.about")}
            </Link>
            <Link
              to="/leaderboard"
              className="hidden rounded-xl px-4 py-2.5 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:inline-flex"
            >
              {t("nav.leaderboard")}
            </Link>
            <button
              type="button"
              onClick={getStarted}
              className="rounded-xl bg-secondary px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:bg-secondary-hover active:scale-95 disabled:opacity-60 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
            >
              {t("landing.cta_start")}
            </button>
          </div>
        </nav>

        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-20">
          <div className="flex flex-col gap-5">
            <p className="badge badge-primary w-fit">
              <GraduationCap size={14} />
              {t("landing.badge")}
            </p>
            <h1 className="text-text-primary">
              {t("app.name")}
            </h1>
            <p className="max-w-xl text-lg font-semibold leading-relaxed text-text-secondary">
              {t("landing.hero_subtitle")}
            </p>
            <p className="max-w-xl text-[15px] leading-relaxed text-text-secondary">
              {t("landing.hero_desc")}
            </p>
            <div className="mt-1 flex flex-wrap gap-3">
              <button type="button" onClick={getStarted} className="btn-primary !px-7 !py-3.5">
                {t("landing.cta_start")}
                <ArrowRight size={17} />
              </button>
              <Link to="/leaderboard" className="btn-ghost !px-7 !py-3.5">
                {t("landing.view_leaderboard")}
              </Link>
            </div>
          </div>
          <IsoStack />
        </div>
      </Section>

      {/* ───── WHY LOCKON ───── */}
      <Section className="mx-auto grid max-w-7xl gap-12 px-6 py-20 lg:grid-cols-[0.8fr_1.2fr] lg:py-28">
        <div className="flex flex-col gap-4">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">{t("landing.why")}</p>
          <h2 className="text-3xl font-black tracking-tight text-text-primary leading-tight sm:text-4xl">
            {t("landing.why_title")}
          </h2>
          <p className="text-base leading-relaxed text-text-secondary sm:text-lg">
            {t("landing.why_desc")}
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          {featureCards.map((feature, i) => (
            <article
              key={feature.title}
              className="group rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
              style={{ transitionDelay: `${i * 60}ms` }}
            >
              <feature.icon className="text-primary" size={24} />
              <h3 className="mt-4 text-lg font-bold tracking-tight text-text-primary">
                {feature.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{feature.copy}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* ───── FEATURES ───── */}
      <Section className="border-y border-border bg-surface py-20 lg:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">{t("landing.features_section")}</p>
            <h2 className="text-3xl font-black tracking-tight text-text-primary leading-tight sm:text-4xl">
              {t("landing.features_subtitle")}
            </h2>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              [t("landing.xp_title"), t("landing.xp_desc"), BookOpenCheck],
              [t("landing.energy_title"), t("landing.energy_desc"), Zap],
              [t("landing.leaderboard_card_title"), t("landing.leaderboard_card_desc"), Medal],
            ].map(([title, copy, Icon]) => (
              <article
                key={title}
                className="group rounded-2xl border border-border bg-card p-8 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
              >
                <Icon className="text-primary" size={32} />
                <h3 className="mt-6 text-2xl font-black tracking-tight text-text-primary">{title}</h3>
                <p className="mt-3 leading-relaxed text-text-secondary">{copy}</p>
              </article>
            ))}
          </div>
        </div>
      </Section>

      {/* ───── HOW IT WORKS ───── */}
      <Section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
        <IsoStack variant="green" />
        <div className="flex flex-col gap-6">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">{t("landing.how_it_works")}</p>
          <h2 className="text-3xl font-black tracking-tight text-text-primary leading-tight sm:text-4xl">
            {t("landing.how_title")}
          </h2>
          <div className="grid gap-4">
            {steps.map((step, index) => (
              <div
                key={step}
                className="group flex gap-4 rounded-xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:bg-surface hover:border-primary/20"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface text-sm font-bold text-primary shadow-sm transition-colors group-hover:bg-primary group-hover:text-white">
                  {index + 1}
                </span>
                <p className="font-semibold text-text-primary leading-snug">{step}</p>
              </div>
            ))}
          </div>
          <p className="badge mt-4 !px-4 !py-2.5 !text-[13px]">
            {t("landing.score_formula")}
          </p>
        </div>
      </Section>

      {/* ───── LEADERBOARD OVERVIEW ───── */}
      <Section className="border-y border-border bg-surface py-16 lg:py-20">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 lg:grid-cols-[1fr_0.9fr] lg:gap-16">
          <div className="flex flex-col gap-6">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">{t("landing.leaderboard_overview")}</p>
            <h2 className="text-3xl font-black tracking-tight leading-tight text-text-primary sm:text-4xl">
              {t("landing.leaderboard_section_title")}
            </h2>
            <p className="text-base leading-relaxed text-text-secondary sm:text-lg">
              {t("landing.leaderboard_section_desc")}
            </p>
            <p className="inline-flex w-fit items-center gap-2 rounded-lg bg-surface/50 px-5 py-3 font-black text-text-primary shadow-sm backdrop-blur-sm border border-border">
              <Zap size={18} className="text-warning" />
              {t("landing.energy_equals")}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface/50 p-6 shadow-xl shadow-secondary/20 backdrop-blur">
            <div className="grid grid-cols-3 gap-3 border-b border-border px-6 py-4 text-[11px] font-bold uppercase tracking-[0.1em] text-text-muted">
              <span>{t("leaderboard.rank")}</span>
              <span>{t("leaderboard.name")}</span>
              <span className="text-right">{t("leaderboard.total_score")}</span>
            </div>
            <div className="mt-4 grid gap-3">
              {[
                [t("landing.preview_student"), "2,480"],
                [t("landing.preview_xp"), "1,920"],
                [t("landing.preview_energy"), "1,450"],
              ].map(([item, score], index) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-xl border border-border bg-surface p-4"
                >
                  <span className="font-bold text-text-primary tabular-nums">{index + 1}. {item}</span>
                  <span className="font-bold tabular-nums text-primary">{score}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Section>

      {/* ───── ADMIN CAPABILITIES ───── */}
      <Section className="mx-auto grid max-w-7xl gap-8 px-6 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:py-28">
        <div>
          <p className="text-sm font-bold uppercase tracking-widest text-primary">{t("landing.admin_capabilities")}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary leading-tight sm:text-4xl">
            {t("landing.admin_title")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-text-secondary sm:text-lg">
            {t("landing.admin_desc")}
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            [t("landing.admin_cohort"), Users],
            [t("landing.admin_audits"), BarChart3],
            [t("landing.admin_energy_rules"), Gauge],
            [t("landing.admin_access"), Lock],
          ].map(([title, Icon]) => (
            <article
              key={title}
              className="group rounded-2xl border border-border bg-surface p-5 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
            >
              <Icon className="text-primary" size={24} />
              <h3 className="mt-4 font-bold text-text-primary">{title}</h3>
              <p className="mt-2 text-sm text-text-muted">{t("landing.admin_workspace")}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* ───── CTA ───── */}
      <Section className="px-4 pb-20 sm:px-6 lg:pb-24">
        <div className="card mx-auto max-w-5xl !border-secondary/20 p-8 text-center sm:p-12" style={{ background: "var(--color-secondary)", borderColor: "transparent" }}>
          <GraduationCap className="mx-auto text-white/90" size={32} />
          <h2 className="mx-auto mt-5 max-w-2xl text-white">
            {t("landing.cta_title")}
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-[15px] leading-relaxed text-white/75">
            {t("landing.cta_desc")}
          </p>
          <button
            type="button"
            onClick={getStarted}
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-sm font-bold text-secondary"
          >
            {t("landing.cta_start")}
            <ArrowRight size={17} />
          </button>
        </div>
      </Section>
    </main>
      <Footer />
    </>
  );
}

export function LandingPage() {
  const { loading, user } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;

  return <LandingPageContent />;
}

export function PublicLandingPage() {
  return <LandingPageContent />;
}
