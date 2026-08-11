import { useTranslation } from "react-i18next";
import { AlertCircle, BookOpen, ChevronRight, Flame, Hammer, Sparkles, Trophy } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { updateUserProfile } from "../services/userService.js";

const PLACEHOLDER_NAME = "Lock-on Learner";

const REFERRAL_OPTIONS = [
  "Friend", "School", "Teacher", "Discord",
  "GitHub", "Instagram", "YouTube", "Google Search", "Other",
];

const WELCOME_FEATURES = [
  {
    icon: Hammer,
    titleKey: "forge.title",
    descKey: "onboarding.feature_forge_desc",
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    icon: Trophy,
    titleKey: "leaderboard.title",
    descKey: "onboarding.feature_leaderboard_desc",
    color: "text-warning",
    bg: "bg-warning/10",
  },
  {
    icon: BookOpen,
    titleKey: "onboarding.feature_generated_subjects",
    descKey: "onboarding.feature_generated_subjects_desc",
    color: "text-status-success",
    bg: "bg-status-success/10",
  },
  {
    icon: Flame,
    titleKey: "onboarding.feature_daily_progress",
    descKey: "onboarding.feature_daily_progress_desc",
    color: "text-status-error",
    bg: "bg-status-error/10",
  },
];

export function OnboardingWizard() {
  const { t } = useTranslation();
  const { profile, user } = useAuth();
  const [step, setStep] = useState("name");
  const [name, setName] = useState("");
  const [referral, setReferral] = useState("");
  const [saving, setSaving] = useState(false);
  const [welcomeVisible, setWelcomeVisible] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    const emailPrefix = user?.email?.split('@')[0] || "";
    const isPlaceholder = profile?.name === PLACEHOLDER_NAME;
    const existingName = profile?.name && !isPlaceholder ? profile.name : "";
    setName(existingName || emailPrefix);
  }, [profile?.name, user?.email]);

  useEffect(() => {
    if (step === "welcome") {
      window.setTimeout(() => setWelcomeVisible(true), 50);
    }
  }, [step]);

  async function saveToProfile(updates) {
    setSaving(true);
    try {
      await updateUserProfile(user.uid, updates);
    } catch {
      // Silently fail — onboarding should not block the user
    } finally {
      setSaving(false);
    }
  }

  async function handleContinue() {
    if (step === "name") {
      const displayName = name.trim() || user?.email?.split('@')[0] || "Learner";
      if (displayName === PLACEHOLDER_NAME) {
        setNameError(t("onboarding.name_error_placeholder"));
        return;
      }
      setNameError("");
      await saveToProfile({ name: displayName });
      setStep("referral");
    } else if (step === "referral") {
      if (referral) {
        await saveToProfile({ referralSource: referral });
      }
      setStep("welcome");
    }
  }

  async function handleSkip() {
    const displayName = profile?.name || name.trim() || user?.email?.split('@')[0] || "";
    if (displayName === PLACEHOLDER_NAME) {
      const fallbackName = user?.email?.split('@')[0] || "Learner";
      await saveToProfile({ name: fallbackName, onboardingCompleted: true });
      return;
    }
    await saveToProfile({ onboardingCompleted: true });
  }

  async function handleStart() {
    const displayName = profile?.name || name.trim() || user?.email?.split('@')[0] || "";
    if (displayName === PLACEHOLDER_NAME) {
      const fallbackName = user?.email?.split('@')[0] || "Learner";
      await saveToProfile({ name: fallbackName, onboardingCompleted: true });
      return;
    }
    await saveToProfile({ onboardingCompleted: true });
  }

  const emailPrefix = user?.email?.split('@')[0] || "Learner";

  return (
    <main className="fixed inset-0 z-50 grid place-items-center bg-gradient-to-br from-background via-surface to-secondary overflow-y-auto">
      <div className="w-full max-w-lg px-4 py-8">
        {/* Header branding */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary shadow-lg shadow-secondary/20">
            <Sparkles size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-text-primary">{t("app.name")}</h1>
        </div>

        {/* Step indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {["name", "referral", "welcome"].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-black transition-all duration-300 ${
                  step === s
                    ? "bg-primary text-white shadow-md shadow-primary/30 scale-110"
                    : ["name", "referral", "welcome"].indexOf(step) > i
                      ? "bg-status-success/20 text-status-success"
                      : "bg-background text-text-muted border border-border"
                }`}
              >
                {["name", "referral", "welcome"].indexOf(step) > i ? <Sparkles size={14} /> : i + 1}
              </div>
              {i < 2 && (
                <div
                  className={`h-0.5 w-8 rounded transition-all duration-300 ${
                    ["name", "referral", "welcome"].indexOf(step) > i ? "bg-status-success" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Name */}
        {step === "name" && (
          <div className="animate-fadeIn rounded-3xl border border-border bg-surface p-8 shadow-2xl shadow-primary/10">
            <h2 className="text-2xl font-black tracking-tight text-text-primary">{t("onboarding.name_title")}</h2>
            <p className="mt-2 text-sm text-text-secondary">{t("onboarding.name_desc")}</p>

            <div className="mt-6">
              <label className="sr-only" htmlFor="onboarding-name">{t("profile.display_name")}</label>
              <input
                id="onboarding-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={emailPrefix}
                className="w-full rounded-xl border border-border bg-background px-4 py-3 text-lg font-bold text-text-primary outline-none transition-all focus:border-primary focus:ring-1 focus:ring-primary/50"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && !saving && handleContinue()}
              />
              {nameError ? (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-status-error">
                  <AlertCircle size={12} /> {nameError}
                </p>
              ) : (
                <p className="mt-2 text-xs text-text-muted">
                  {t("onboarding.name_empty_hint", { emailPrefix })}
                </p>
              )}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSkip}
                disabled={saving}
                className="text-sm font-bold text-text-muted transition-colors hover:text-text-primary"
              >
                {t("onboarding.skip")}
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-black text-white shadow-lg transition-all hover:bg-primary-active active:scale-95 disabled:opacity-50"
              >
                {saving ? t("common.saving") : t("lesson.continue")}
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Referral */}
        {step === "referral" && (
          <div className="animate-fadeIn rounded-3xl border border-border bg-surface p-8 shadow-2xl shadow-primary/10">
            <h2 className="text-2xl font-black tracking-tight text-text-primary">{t("onboarding.referral_title")}</h2>
            <p className="mt-2 text-sm text-text-secondary">{t("onboarding.referral_desc")}</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              {REFERRAL_OPTIONS.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setReferral(option)}
                  className={`rounded-xl border px-4 py-3 text-sm font-bold text-left transition-all ${
                    referral === option
                      ? "border-primary bg-primary/10 text-primary shadow-sm"
                      : "border-border bg-background text-text-secondary hover:border-primary/50 hover:text-text-primary"
                  }`}
                >
                  {["Discord", "GitHub", "Instagram", "YouTube"].includes(option) ? option : t(`onboarding.referral_${(option ?? "").toLowerCase().replace(/\s+/g, "_")}`)}
                </button>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSkip}
                disabled={saving}
                className="text-sm font-bold text-text-muted transition-colors hover:text-text-primary"
              >
                {t("onboarding.skip")}
              </button>
              <button
                type="button"
                onClick={handleContinue}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-6 py-3 font-black text-white shadow-lg transition-all hover:bg-primary-active active:scale-95 disabled:opacity-50"
              >
                {saving ? t("common.saving") : t("lesson.continue")}
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Welcome */}
        {step === "welcome" && (
          <div className="animate-fadeIn">
            <div className="mb-6 text-center">
              <h2 className="text-3xl font-black tracking-tight text-text-primary">
                {t("onboarding.welcome_user", { name: (profile?.name && profile.name !== PLACEHOLDER_NAME ? profile.name : name) || emailPrefix })}
              </h2>
              <p className="mt-2 text-text-secondary">{t("onboarding.welcome_desc")}</p>
            </div>

            <div className="grid gap-4">
              {WELCOME_FEATURES.map((feature, i) => (
                <div
                  key={feature.titleKey}
                  className={`rounded-3xl border border-border bg-surface p-6 shadow-sm transition-all duration-500 hover:shadow-md hover:-translate-y-0.5 ${
                    welcomeVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
                  }`}
                  style={{ transitionDelay: `${i * 120}ms` }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${feature.bg}`}>
                      <feature.icon size={24} className={feature.color} />
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-text-primary">{t(feature.titleKey)}</h3>
                      <p className="mt-1 text-sm text-text-secondary leading-relaxed">{t(feature.descKey)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center justify-between">
              <button
                type="button"
                onClick={handleSkip}
                disabled={saving}
                className="text-sm font-bold text-text-muted transition-colors hover:text-text-primary"
              >
                {t("onboarding.skip")}
              </button>
              <button
                type="button"
                onClick={handleStart}
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-3 font-black text-white shadow-lg transition-all hover:bg-primary-active active:scale-95 disabled:opacity-50"
              >
                {saving ? t("onboarding.almost_there") : t("onboarding.start_learning")}
                <Sparkles size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
