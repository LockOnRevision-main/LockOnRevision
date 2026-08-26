import {
  Atom,
  Bot,
  Brain,
  CalendarDays,
  Eye,
  Globe,
  GraduationCap,
  Hammer,
  HeartHandshake,
  Lock,
  Mail,
  Medal,
  MessageCircle,
  Rocket,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { Footer } from "../components/Footer";
import { Logo } from "../components/Logo";
import { useAuth } from "../context/AuthContext.jsx";

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

export function AboutPage() {
  const { t } = useTranslation();
  const { loading, user } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: Trophy,
      title: t("about.feature_xp_scoring"),
      copy: t("about.feature_xp_scoring_desc"),
    },
    {
      icon: Zap,
      title: t("about.feature_energy_system"),
      copy: t("about.feature_energy_system_desc"),
    },
    {
      icon: Medal,
      title: t("about.feature_leaderboard"),
      copy: t("about.feature_leaderboard_desc"),
    },
    {
      icon: Hammer,
      title: t("about.feature_forge"),
      copy: t("about.feature_forge_desc"),
    },
    {
      icon: CalendarDays,
      title: t("about.feature_timetable"),
      copy: t("about.feature_timetable_desc"),
    },
    {
      icon: ShieldCheck,
      title: t("about.feature_admin"),
      copy: t("about.feature_admin_desc"),
    },
  ];

  const aiCapabilities = [
    {
      icon: Brain,
      title: t("about.ai_lesson_gen"),
      copy: t("about.ai_lesson_gen_desc"),
    },
    {
      icon: Bot,
      title: t("about.ai_tutor_chat"),
      copy: t("about.ai_tutor_chat_desc"),
    },
    {
      icon: Sparkles,
      title: t("about.ai_wrong_answer"),
      copy: t("about.ai_wrong_answer_desc"),
    },
    {
      icon: Route,
      title: t("about.ai_curriculum"),
      copy: t("about.ai_curriculum_desc"),
    },
    {
      icon: Eye,
      title: t("about.ai_hinting"),
      copy: t("about.ai_hinting_desc"),
    },
    {
      icon: Rocket,
      title: t("about.ai_timetable"),
      copy: t("about.ai_timetable_desc"),
    },
  ];

  const techStack = [
    { label: t("about.tech_stack_frontend"), value: "React 18, Vite 6, Tailwind CSS 3" },
    { label: t("about.tech_stack_backend"), value: "Firebase Auth, Firestore, Cloud Functions" },
    { label: t("about.tech_stack_ai"), value: "Google Gemini API via Vercel serverless functions" },
    { label: t("about.tech_stack_icons"), value: "Lucide React" },
    { label: t("about.tech_stack_markdown"), value: "react-markdown, KaTeX, rehype-highlight" },
    { label: t("about.tech_stack_deployment"), value: "Vercel (frontend + serverless functions), Firebase (backend)" },
  ];

  const roadmap = [
    { phase: t("about.roadmap_alpha1"), statusKey: "complete", status: t("about.roadmap_complete"), items: [t("about.roadmap_alpha1_item1"), t("about.roadmap_alpha1_item2"), t("about.roadmap_alpha1_item3"), t("about.roadmap_alpha1_item4"), t("about.roadmap_alpha1_item5")] },
    { phase: t("about.roadmap_alpha2"), statusKey: "in_progress", status: t("about.roadmap_in_progress"), items: [t("about.roadmap_alpha2_item1"), t("about.roadmap_alpha2_item2"), t("about.roadmap_alpha2_item3"), t("about.roadmap_alpha2_item4"), t("about.roadmap_alpha2_item5")] },
    { phase: t("about.roadmap_beta"), statusKey: "planned", status: t("about.roadmap_planned"), items: [t("about.roadmap_beta_item1"), t("about.roadmap_beta_item2"), t("about.roadmap_beta_item3"), t("about.roadmap_beta_item4"), t("about.roadmap_beta_item5")] },
    { phase: t("about.roadmap_v1"), statusKey: "future", status: t("about.roadmap_future"), items: [t("about.roadmap_v1_item1"), t("about.roadmap_v1_item2"), t("about.roadmap_v1_item3"), t("about.roadmap_v1_item4"), t("about.roadmap_v1_item5")] },
  ];

  function getStarted() {
    navigate(user ? "/app" : "/login");
  }

  return (
    <>
    <main className="min-h-screen bg-background text-text-primary overflow-x-hidden">
      {/* ───── NAV ───── */}
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6 sm:py-5">
        <Link
          to="/"
          className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 rounded-lg"
        >
          <Logo theme="light" className="h-9 w-auto sm:h-10" />
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/leaderboard"
            className="hidden rounded-xl px-3 py-2 text-sm font-bold text-text-secondary transition-colors hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:inline-flex"
          >
            {t("nav.leaderboard")}
          </Link>
          <button
            type="button"
            onClick={getStarted}
            disabled={loading}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-white transition-all duration-200 hover:bg-secondary-hover active:scale-95 disabled:opacity-60 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:px-5 sm:py-2.5"
          >
            {t("landing.cta_start")}
          </button>
        </div>
      </nav>

      {/* ───── HERO ───── */}
      <Section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(circle_at_50%_0%,var(--color-primary),transparent_70%)] opacity-15" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-2 text-sm font-bold text-primary shadow-sm backdrop-blur-sm">
            <GraduationCap size={16} />
            {t("about.badge")}
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-tight leading-[1.1] text-text-primary sm:text-5xl md:text-6xl">
            {t("about.hero_title")}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
            {t("about.hero_desc")}
          </p>
          <div className="mt-8 inline-flex flex-col items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1 text-xs font-bold text-primary shadow-sm">
              <span className="flex h-2 w-2 rounded-full bg-primary" />
              {t("about.beta_badge")}
            </span>
            <p className="max-w-md text-xs leading-relaxed text-text-muted">
              {t("about.beta_desc")}
            </p>
          </div>
        </div>
      </Section>

      {/* ───── ABOUT ───── */}
      <Section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">{t("about.section")}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
            {t("about.what_title")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-text-secondary sm:text-lg">
            {t("about.what_desc")}
          </p>
        </div>
      </Section>

      {/* ───── MISSION & VISION ───── */}
      <Section className="border-y border-border bg-surface/50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12">
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
            <Target className="text-primary" size={28} />
            <h3 className="mt-4 text-2xl font-black tracking-tight text-text-primary">{t("about.mission_title")}</h3>
            <p className="mt-3 leading-relaxed text-text-secondary">
              {t("about.mission_desc")}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
            <Eye className="text-primary" size={28} />
            <h3 className="mt-4 text-2xl font-black tracking-tight text-text-primary">{t("about.vision_title")}</h3>
            <p className="mt-3 leading-relaxed text-text-secondary">
              {t("about.vision_desc")}
            </p>
          </div>
        </div>
      </Section>

      {/* ───── WHY LOCKONREVISION ───── */}
      <Section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">{t("about.why_section")}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
            {t("about.why_title")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-text-secondary sm:text-lg">
            {t("about.why_desc")}
          </p>
        </div>
      </Section>

      {/* ───── MAJOR FEATURES ───── */}
      <Section className="border-y border-border bg-surface/50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">{t("about.features_section")}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
              {t("about.features_heading")}
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <article
                key={feature.title}
                className="group rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
              >
                <feature.icon className="text-primary" size={24} />
                <h3 className="mt-4 text-lg font-bold tracking-tight text-text-primary">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{feature.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </Section>

      {/* ───── AI CAPABILITIES ───── */}
      <Section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">{t("about.ai_section")}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
            {t("about.ai_heading")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-text-secondary sm:text-lg">
            {t("about.ai_desc")}
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {aiCapabilities.map((cap) => (
            <article
              key={cap.title}
              className="group rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
            >
              <cap.icon className="text-primary" size={24} />
              <h3 className="mt-4 text-lg font-bold tracking-tight text-text-primary">{cap.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-text-secondary">{cap.copy}</p>
            </article>
          ))}
        </div>
      </Section>

      {/* ───── PLATFORM HIGHLIGHTS ───── */}
      <Section className="border-y border-border bg-gradient-to-br from-background via-surface to-secondary/10 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">{t("about.highlights_section")}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
              {t("about.highlights_heading")}
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: GraduationCap, title: t("about.highlight_student_first"), copy: t("about.highlight_student_first_desc") },
              { icon: Trophy, title: t("about.highlight_gamified"), copy: t("about.highlight_gamified_desc") },
              { icon: Bot, title: t("about.highlight_ai_native"), copy: t("about.highlight_ai_native_desc") },
              { icon: Lock, title: t("about.highlight_privacy"), copy: t("about.highlight_privacy_desc") },
              { icon: Globe, title: t("about.highlight_cross_platform"), copy: t("about.highlight_cross_platform_desc") },
              { icon: HeartHandshake, title: t("about.highlight_community"), copy: t("about.highlight_community_desc") },
            ].map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
              >
                <item.icon className="text-primary" size={24} />
                <h3 className="mt-4 text-lg font-bold tracking-tight text-text-primary">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">{item.copy}</p>
              </article>
            ))}
          </div>
        </div>
      </Section>

      {/* ───── TECHNOLOGY ───── */}
      <Section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">{t("about.tech_section")}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
            {t("about.tech_heading")}
          </h2>
        </div>
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {techStack.map((tech) => (
            <div
              key={tech.label}
              className="flex items-start gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <Atom className="mt-0.5 shrink-0 text-primary" size={20} />
              <div>
                <p className="font-bold text-text-primary">{tech.label}</p>
                <p className="mt-1 text-sm text-text-secondary">{tech.value}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* ───── ROADMAP ───── */}
      <Section className="border-y border-border bg-surface/50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">{t("about.roadmap_section")}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
              {t("about.roadmap_heading")}
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {roadmap.map((phase) => (
              <div
                key={phase.phase}
                className="rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all hover:shadow-lg"
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-xl font-black tracking-tight text-text-primary">{phase.phase}</h3>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${
                      phase.statusKey === "complete"
                        ? "bg-success/20 text-success"
                        : phase.statusKey === "in_progress"
                          ? "bg-primary/20 text-primary"
                          : "bg-text-muted/20 text-text-muted"
                    }`}
                  >
                    {phase.status}
                  </span>
                </div>
                <ul className="mt-4 space-y-2">
                  {phase.items.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-sm text-text-secondary">
                      <span className="mt-1 block h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </Section>

      {/* ───── FOUNDERS ───── */}
      <Section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">{t("about.team_section")}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
            {t("about.team_heading")}
          </h2>
        </div>
        <div className="mt-12 grid gap-8 md:grid-cols-2">
          {/* ── Abhijay Jalagari ── */}
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary/30">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
              <GraduationCap size={28} />
            </div>
            <h3 className="mt-5 text-xl font-black tracking-tight text-text-primary">{t("about.team_abhijay_name")}</h3>
            <p className="mt-1 text-sm font-semibold text-primary">{t("about.team_abhijay_role")}</p>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              {t("about.team_abhijay_bio1")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {t("about.team_abhijay_bio2")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {t("about.team_abhijay_bio3")}
            </p>
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">{t("about.team_abhijay_strengths_label")}</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {[t("about.team_abhijay_strength1"),t("about.team_abhijay_strength2"),t("about.team_abhijay_strength3"),t("about.team_abhijay_strength4"),t("about.team_abhijay_strength5"),t("about.team_abhijay_strength6")].map((skill) => (
                  <li key={skill} className="rounded-md bg-primary/5 px-2.5 py-1 text-xs font-semibold text-text-secondary">
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">{t("about.team_abhijay_mission_label")}</p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {t("about.team_abhijay_mission_desc")}
              </p>
            </div>
          </div>

          {/* ── Mayank Ghosh ── */}
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary/30">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
              <GraduationCap size={28} />
            </div>
            <h3 className="mt-5 text-xl font-black tracking-tight text-text-primary">{t("about.team_mayank_name")}</h3>
            <p className="mt-1 text-sm font-semibold text-primary">{t("about.team_mayank_role")}</p>
            <p className="mt-4 text-sm leading-relaxed text-text-secondary">
              {t("about.team_mayank_bio1")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {t("about.team_mayank_bio2")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {t("about.team_mayank_bio3")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {t("about.team_mayank_bio4")}
            </p>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary">
              {t("about.team_mayank_bio5")}
            </p>
            <div className="mt-5">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">{t("about.team_mayank_skills_label")}</p>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {[t("about.team_mayank_skill1"),t("about.team_mayank_skill2"),t("about.team_mayank_skill3"),t("about.team_mayank_skill4"),t("about.team_mayank_skill5"),t("about.team_mayank_skill6"),t("about.team_mayank_skill7"),t("about.team_mayank_skill8")].map((skill) => (
                  <li key={skill} className="rounded-md bg-primary/5 px-2.5 py-1 text-xs font-semibold text-text-secondary">
                    {skill}
                  </li>
                ))}
              </ul>
            </div>
            <div className="mt-4 border-t border-border pt-4">
              <p className="text-xs font-bold uppercase tracking-widest text-primary">{t("about.team_mayank_vision_label")}</p>
              <p className="mt-1 text-sm leading-relaxed text-text-secondary">
                {t("about.team_mayank_vision_desc")}
              </p>
            </div>
          </div>
        </div>
      </Section>

      {/* ───── BUILT BY STUDENTS ───── */}
      <Section className="border-y border-border bg-surface/50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">{t("about.built_by_section")}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
              {t("about.built_by_heading")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-text-secondary sm:text-lg">
              {t("about.built_by_desc")}
            </p>
          </div>
        </div>
      </Section>

      {/* ───── CONTACT ───── */}
      <Section className="border-t border-border bg-gradient-to-br from-background via-surface to-secondary/10 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">{t("about.contact_section")}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
              {t("about.contact_heading")}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-text-secondary">
              {t("about.contact_desc")}
            </p>
          </div>
          <div className="mt-12 flex flex-wrap justify-center gap-4">
            <a
              href="https://discord.gg/efDwq2XhS7"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-4 font-bold text-text-primary shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
            >
              <MessageCircle className="text-primary" size={22} />
              {t("about.contact_discord")}
            </a>
            <a
              href="https://github.com/LockOnRevision/LockOnRevision"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-4 font-bold text-text-primary shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary" width="22" height="22">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              {t("about.contact_github")}
            </a>
            <a
              href="https://www.instagram.com/lockonrevision?igsh=bHMzd25kM2pydzdh"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-4 font-bold text-text-primary shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary" width="22" height="22">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
              </svg>
              {t("about.contact_instagram")}
            </a>
            <a
              href="mailto:lockonrevision@gmail.com"
              className="inline-flex items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-4 font-bold text-text-primary shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
            >
              <Mail className="text-primary" size={22} />
              {t("about.contact_email")}
            </a>
          </div>

        </div>
      </Section>
    </main>
      <Footer />
    </>
  );
}
