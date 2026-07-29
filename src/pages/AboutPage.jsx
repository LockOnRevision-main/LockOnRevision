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
  MapPin,
  Medal,
  MessageCircle,
  Rocket,
  Route,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

const features = [
  {
    icon: Trophy,
    title: "XP Scoring",
    copy: "Every completed lesson awards XP, giving students a clear measure of their revision volume.",
  },
  {
    icon: Zap,
    title: "Energy System",
    copy: "Energy rewards high-quality performance and unit completion. Each Energy point is worth 100 XP on the leaderboard.",
  },
  {
    icon: Medal,
    title: "Leaderboard",
    copy: "Students are ranked by total score, making consistency visible and motivating healthy competition.",
  },
  {
    icon: Hammer,
    title: "Forge",
    copy: "An AI-powered learning path generator that turns uploaded notes into structured lessons and revision units.",
  },
  {
    icon: CalendarDays,
    title: "Timetable",
    copy: "Plan and track revision sessions with an integrated timetable that adapts to your workload.",
  },
  {
    icon: ShieldCheck,
    title: "Admin Controls",
    copy: "Cohort management, score audits, Energy rule tuning, and access controls for authorised teams.",
  },
];

const aiCapabilities = [
  {
    icon: Brain,
    title: "Lesson Generation",
    copy: "Upload your notes and Forge generates structured lessons with explanations, examples, and key takeaways.",
  },
  {
    icon: Bot,
    title: "AI Tutor Chat",
    copy: "Ask questions about any topic and receive contextual responses based on your revision material.",
  },
  {
    icon: Sparkles,
    title: "Wrong Answer Explanations",
    copy: "When you answer incorrectly, the AI explains why and reinforces the correct concept.",
  },
  {
    icon: Route,
    title: "Smart Curriculum Design",
    copy: "Forge structures your notes into a coherent learning path, identifying prerequisites and logical progressions.",
  },
  {
    icon: Eye,
    title: "Question Hinting",
    copy: "Stuck on a question? The AI provides targeted hints to guide you toward the answer without giving it away.",
  },
  {
    icon: Rocket,
    title: "Timetable Optimisation",
    copy: "AI-assisted timetable generation helps plan your revision sessions based on your available time and goals.",
  },
];

const techStack = [
  { label: "Frontend", value: "React 18, Vite 6, Tailwind CSS 3" },
  { label: "Backend", value: "Firebase Auth, Firestore, Cloud Functions" },
  { label: "AI / ML", value: "Google Gemini API via Vercel serverless functions" },
  { label: "Icons", value: "Lucide React" },
  { label: "Markdown", value: "react-markdown, KaTeX, rehype-highlight" },
  { label: "Deployment", value: "Vercel (frontend + serverless functions), Firebase (backend)" },
];

const roadmap = [
  { phase: "Alpha 1", status: "Complete", items: ["Core XP and Energy systems", "Leaderboard infrastructure", "Forge lesson generation", "AI Tutor Chat", "User authentication and profiles"] },
  { phase: "Alpha 2", status: "In Progress", items: ["Timetable optimisation", "Wrong answer explanations", "Admin dashboard", "Push notifications", "Calendar sync"] },
  { phase: "Beta", status: "Planned", items: ["Cohort management", "Achievement and badge system", "Activity heatmap", "Enhanced analytics", "Team and classroom accounts"] },
  { phase: "V1", status: "Future", items: ["Mobile applications", "Offline mode", "Third-party integrations", "Marketplace for shared curricula", "Advanced gamification"] },
];

const teamMembers = [
  { name: "Founder & Lead Developer", role: "", placeholder: true },
];

export function AboutPage() {
  const { loading, user } = useAuth();
  const navigate = useNavigate();

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
            Leaderboard
          </Link>
          <button
            type="button"
            onClick={getStarted}
            disabled={loading}
            className="rounded-xl bg-secondary px-4 py-2 text-sm font-bold text-white transition-all duration-200 hover:bg-secondary-hover active:scale-95 disabled:opacity-60 shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 sm:px-5 sm:py-2.5"
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* ───── HERO ───── */}
      <Section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-x-0 top-0 h-[400px] bg-[radial-gradient(circle_at_50%_0%,var(--color-primary),transparent_70%)] opacity-15" />
        <div className="relative mx-auto max-w-6xl px-4 py-16 text-center sm:px-6 sm:py-24">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/80 px-4 py-2 text-sm font-bold text-primary shadow-sm backdrop-blur-sm">
            <GraduationCap size={16} />
            About LockOnRevision
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-tight leading-[1.1] text-text-primary sm:text-5xl md:text-6xl">
            Built to make revision measurable.
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-text-secondary sm:text-lg">
            LockOnRevision transforms the way students approach study by turning consistency into a visible,
            competitive scoring system.
          </p>
        </div>
      </Section>

      {/* ───── ABOUT ───── */}
      <Section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">About</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
            What is LockOnRevision?
          </h2>
          <p className="mt-4 text-base leading-relaxed text-text-secondary sm:text-lg">
            LockOnRevision is a competitive revision platform designed for students who want to study smarter,
            stay consistent, and see their progress in real time. Instead of relying on passive rereading, students
            complete structured lessons, earn XP, collect Energy, and compete on a leaderboard that rewards genuine
            effort. The platform combines AI-powered tools — from lesson generation to intelligent tutoring — with
            a clean, focused interface that eliminates distractions.
          </p>
        </div>
      </Section>

      {/* ───── MISSION & VISION ───── */}
      <Section className="border-y border-border bg-surface/50">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-2 lg:gap-12">
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
            <Target className="text-primary" size={28} />
            <h3 className="mt-4 text-2xl font-black tracking-tight text-text-primary">Mission</h3>
            <p className="mt-3 leading-relaxed text-text-secondary">
              To make every study session count by giving students immediate, visible feedback on their effort.
              We believe consistency, not cramming, is the foundation of real learning — and we build tools that
              make consistent revision feel rewarding.
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-8 shadow-sm">
            <Eye className="text-primary" size={28} />
            <h3 className="mt-4 text-2xl font-black tracking-tight text-text-primary">Vision</h3>
            <p className="mt-3 leading-relaxed text-text-secondary">
              A world where every student has access to a personal revision ecosystem that adapts to their needs,
              celebrates their progress, and connects them with a community of learners striving for excellence.
            </p>
          </div>
        </div>
      </Section>

      {/* ───── WHY LOCKONREVISION ───── */}
      <Section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Why LockOnRevision?</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
            Because revision needs feedback.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-text-secondary sm:text-lg">
            Most study tools treat revision as a solo, invisible activity. Students put in hours without knowing
            whether the work is compounding. LockOnRevision changes that by making progress measurable, visible,
            and socially engaging. We exist to replace the question &ldquo;Did I study enough?&rdquo; with
            &ldquo;What do I need to do next?&rdquo;
          </p>
        </div>
      </Section>

      {/* ───── MAJOR FEATURES ───── */}
      <Section className="border-y border-border bg-surface/50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Major Features</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
              Everything you need to revise effectively.
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
          <p className="text-sm font-bold uppercase tracking-widest text-primary">AI Capabilities</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
            Intelligent tools that adapt to you.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-text-secondary sm:text-lg">
            LockORevision leverages Google Gemini AI to power a suite of smart features that make revision
            more efficient, personalised, and interactive.
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
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Platform Highlights</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
              Designed for focus and momentum.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: GraduationCap, title: "Student-First Design", copy: "Every feature is built around the student experience, from onboarding to daily revision." },
              { icon: Trophy, title: "Gamified Progression", copy: "XP, Energy, and leaderboards turn study into a rewarding game without losing academic focus." },
              { icon: Bot, title: "AI-Native Experience", copy: "AI is not an add-on — it is woven into lesson generation, tutoring, and timetable planning." },
              { icon: Lock, title: "Privacy Conscious", copy: "User data is protected through Firebase security rules and authentication." },
              { icon: Globe, title: "Cross-Platform Ready", copy: "Built as a responsive web application that works on desktop, tablet, and mobile browsers." },
              { icon: HeartHandshake, title: "Community Driven", copy: "Discord and leaderboard features foster a supportive community of learners." },
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
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Technology</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
            Built on modern infrastructure.
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
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Roadmap</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
              What&rsquo;s next for LockOnRevision.
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
                      phase.status === "Complete"
                        ? "bg-success/20 text-success"
                        : phase.status === "In Progress"
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

      {/* ───── TEAM ───── */}
      <Section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-widest text-primary">Team</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
            The people behind LockOn.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-text-secondary">
            LockOnRevision is being built by a small, dedicated team committed to improving how students revise.
            More team information will be added here as the project grows.
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {teamMembers.map((member, i) => (
            <div
              key={i}
              className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-surface/50 p-8 text-center shadow-sm"
            >
              <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-dashed border-text-muted/30 bg-surface">
                <Users className="text-text-muted" size={28} />
              </div>
              <p className="mt-4 font-bold text-text-muted">{member.name}</p>
              <p className="mt-1 text-xs text-text-muted/70">Awaiting team details</p>
            </div>
          ))}
        </div>
      </Section>

      {/* ───── CONTACT ───── */}
      <Section className="border-t border-border bg-gradient-to-br from-background via-surface to-secondary/10 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-bold uppercase tracking-widest text-primary">Contact</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-4xl">
              Get in touch.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-text-secondary">
              Have questions, feedback, or interested in contributing? Reach out to us through any of the
              channels below.
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
              Join us on Discord
            </a>
            <a
              href="https://github.com/LockOnRevision"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-4 font-bold text-text-primary shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="text-primary" width="22" height="22">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              View on GitHub
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
              Follow on Instagram
            </a>
            <a
              href="mailto:contact@lockonrevision.com"
              className="inline-flex items-center gap-3 rounded-2xl border border-border bg-surface px-6 py-4 font-bold text-text-primary shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 hover:border-primary/30"
            >
              <Mail className="text-primary" size={22} />
              Email us
            </a>
          </div>
          <div className="mt-8 flex items-center justify-center gap-2 text-sm text-text-muted">
            <MapPin size={14} />
            <span>Gaza Sky Geeks, Palestine</span>
          </div>
        </div>
      </Section>
    </main>
      <Footer />
    </>
  );
}
