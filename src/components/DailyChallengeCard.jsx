import { Award, Brain, CheckCircle2, Clock, Flame, Sparkles, Target, Trophy, Zap } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "../context/AuthContext.jsx";
import { ensureDailyChallenge, subscribeDailyChallenge } from "../services/dailyChallengeService.js";

const DIFFICULTY_COLOR = {
  easy: "bg-status-success/15 text-status-success border-status-success/30",
  medium: "bg-warning/15 text-warning border-warning/30",
  hard: "bg-status-error/15 text-status-error border-status-error/30",
  mixed: "bg-primary/15 text-primary border-primary/30",
};

const TEMPLATE_LABELS = {
  mixedQuiz: "Mixed Quiz",
  weakTopicRecovery: "Weak Topic Recovery",
  explainConcept: "Explain a Concept",
  matchFollowing: "Match the Following",
  caseStudy: "Case Study",
  diagramLabeling: "Diagram Labeling",
  realLifeApplication: "Real-life Application",
  timedRecall: "Timed Recall",
  multiStepReasoning: "Multi-step Reasoning",
  examSprint: "Exam Sprint",
};

export function DailyChallengeCard() {
  const { user, profile } = useAuth();
  const { t } = useTranslation();
  const [challenge, setChallenge] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    setLoading(true);
    setError("");

    // Subscribe for real-time cached challenge
    const unsub = subscribeDailyChallenge(user.uid, (doc) => {
      if (!cancelled && doc) {
        setChallenge(doc);
        setLoading(false);
      }
    });

    // Ensure today's challenge exists (does NOT regenerate if cached)
    ensureDailyChallenge(user.uid, profile)
      .then((doc) => {
        if (!cancelled) {
          setChallenge(doc);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message || "Failed to load challenge");
          setLoading(false);
        }
      });

    // Re-check at local midnight: schedule next generation
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    const msUntilMidnight = midnight - now;
    let midnightTimer = null;
    if (msUntilMidnight > 0 && msUntilMidnight < 24 * 3600 * 1000) {
      midnightTimer = setTimeout(() => {
        ensureDailyChallenge(user.uid, profile).catch(() => {});
      }, msUntilMidnight + 1000);
    }

    return () => {
      cancelled = true;
      unsub?.();
      if (midnightTimer) clearTimeout(midnightTimer);
    };
  }, [user?.uid, profile?.xp, profile?.streak]);

  const handleGenerate = async () => {
    if (!user?.uid) return;
    setGenerating(true);
    setError("");
    try {
      const doc = await ensureDailyChallenge(user.uid, profile);
      setChallenge(doc);
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <article className="card card-pad" aria-label="Loading" role="status">
        <div className="flex items-center gap-3">
          <div className="skeleton h-10 w-10 !rounded-xl" />
          <div className="flex-1">
            <div className="skeleton h-3 w-32" />
            <div className="skeleton mt-2 h-5 w-48" />
          </div>
        </div>
        <div className="skeleton mt-4 h-2 w-full" />
        <div className="skeleton mt-4 h-11 w-full !rounded-xl" />
      </article>
    );
  }

  if (error && !challenge) {
    return (
      <article className="card card-pad">
        <div className="mb-3 flex items-center gap-3">
          <span className="icon-tile"><Brain size={19} /></span>
          <h3 className="font-bold text-text-primary">Daily Challenge</h3>
        </div>
        <p className="alert alert-error mb-3" role="alert">{error}</p>
        <button type="button" onClick={handleGenerate} disabled={generating} className="btn-primary !w-full sm:!w-auto">
          {generating ? "Preparing..." : "Try again"}
        </button>
      </article>
    );
  }

  if (!challenge) {
    return (
      <article className="card card-pad">
        <div className="mb-3 flex items-center gap-3">
          <span className="icon-tile"><Brain size={19} /></span>
          <div>
            <p className="eyebrow">Daily Challenge</p>
            <h3 className="mt-0.5 font-bold text-text-primary">Today's practice set</h3>
          </div>
        </div>
        <p className="mb-4 text-sm text-text-secondary">No challenge yet. Generate a short personalized set based on your recent work.</p>
        <button type="button" onClick={handleGenerate} disabled={generating} className="btn-primary !w-full sm:!w-auto">
          {generating ? "Preparing..." : "Generate today's challenge"}
        </button>
      </article>
    );
  }

  const difficulty = challenge.difficulty || "medium";
  const diffClass = DIFFICULTY_COLOR[difficulty] || DIFFICULTY_COLOR.medium;
  const templateLabel = TEMPLATE_LABELS[challenge.templateId] || challenge.templateId || "Challenge";
  const completed = !!challenge.completed;
  const progressPercent = completed ? 100 : 0;

  return (
    <article className="card overflow-hidden">
      <div className="border-b border-border bg-background/60 px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="icon-tile shrink-0">
              <Sparkles size={19} />
            </div>
            <div className="min-w-0">
              <p className="eyebrow flex items-center gap-2">
                <span>Today&apos;s challenge</span>
                {completed && <span className="badge !border-success/30 !bg-success/10 !text-success !text-[10px]"><CheckCircle2 size={10} /> Done</span>}
              </p>
              <h3 className="mt-1 truncate text-[1.05rem] font-bold tracking-tight text-text-primary">{challenge.title}</h3>
              <p className="text-xs text-text-secondary line-clamp-1">{challenge.description}</p>
            </div>
          </div>
          <div className={`hidden shrink-0 items-center gap-1 rounded-full border px-3 py-1 text-xs font-bold capitalize sm:inline-flex ${diffClass}`}>
            <Target size={12} /> {difficulty}
          </div>
        </div>
      </div>

      <div className="p-6">
        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background border border-border px-3 py-1 text-xs font-bold text-text-secondary">
            <Brain size={12} /> {challenge.subject || "General"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-background border border-border px-3 py-1 text-xs font-bold text-text-secondary">
            <Clock size={12} /> {challenge.estimatedTime || 10} min
          </span>
          <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-bold capitalize sm:hidden ${diffClass}`}>{difficulty}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-background border border-border px-3 py-1 text-xs font-bold text-text-secondary">
            {templateLabel}
          </span>
        </div>

        {/* Rewards */}
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-warning/10 border border-warning/20 px-3 py-1.5 text-xs font-black text-warning">
            <Zap size={14} /> {challenge.xpReward || 40} XP
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 text-xs font-black text-primary">
            <Flame size={14} /> {challenge.energyReward || 3} Energy
          </span>
          {challenge.challengeData?.timeLimitSeconds && (
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-surface border border-border px-3 py-1.5 text-xs font-bold text-text-secondary">
              ⏱️ {Math.round(challenge.challengeData.timeLimitSeconds / 60)}m timed
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="mb-5">
          <div className="flex justify-between text-xs font-bold uppercase tracking-widest text-text-muted mb-1.5">
            <span>Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-background border border-border">
            <div className={`h-full rounded-full transition-all duration-500 ${completed ? "bg-status-success" : "bg-primary"}`} style={{ width: `${progressPercent}%` }} />
          </div>
          {completed && challenge.completedAt && (
            <p className="mt-1.5 text-xs text-status-success font-medium">
              Completed {(() => { try { const d = challenge.completedAt?.toDate ? challenge.completedAt.toDate() : new Date(challenge.completedAt); return d.toLocaleString(); } catch { return ""; } })()} {challenge.perfect ? "• Perfect! +bonus" : ""}
            </p>
          )}
        </div>

        {/* CTA */}
        {completed ? (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm font-bold text-status-success">
              <CheckCircle2 size={18} /> Challenge completed
            </div>
            <Link to="/daily-challenge" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 py-2.5 text-sm font-black text-text-primary hover:bg-card transition-colors">
              Review
            </Link>
          </div>
        ) : (
          <Link to="/daily-challenge" className="btn-primary w-full">
            <Trophy size={17} />
            Start Challenge
          </Link>
        )}
      </div>
    </article>
  );
}
