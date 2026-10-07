import { BarChart3, CalendarDays, KeyRound, LogOut, Hammer, Trophy, User, X, Menu } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { AiSidebar } from "./AiSidebar.jsx";
import { Logo } from "./Logo.jsx";
import { PasswordInput } from "./PasswordInput.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { canAccessAdmin } from "../utils/permissions.js";

export function AppShell({ children }) {
  const { t } = useTranslation();
  const { isFirebaseConfigured, changePassword, logout, profile, user } = useAuth();
  const showAdmin = canAccessAdmin(profile, user?.email);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showChangePw, setShowChangePw] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  async function handleChangePassword(e) {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");
    if (newPassword.length < 8) { setPwError(t("app_shell.password_min_error")); return; }
    setPwBusy(true);
    try {
      await changePassword(newPassword);
      setPwSuccess(t("app_shell.password_changed"));
      setNewPassword("");
    } catch (err) {
      setPwError(err.message);
    } finally {
      setPwBusy(false);
    }
  }

  const pill = ({ isActive }) => `nav-pill whitespace-nowrap ${isActive ? "nav-pill-active" : ""}`;
  return (
    <main className="min-h-screen bg-background text-text-primary">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
            <NavLink to="/app" className="group flex shrink-0 items-center gap-3">
              <div className="h-9 w-9 overflow-hidden rounded-xl bg-secondary">
                <Logo variant="icon" className="h-full w-full" />
              </div>
              <div className="hidden flex-col sm:flex">
                <p className="text-sm font-extrabold leading-none tracking-tight text-text-primary">{t("app.name")}</p>
                <p className="mt-1 text-xs font-medium text-text-secondary">{profile?.name || t("app_shell.local_learner")}</p>
              </div>
            </NavLink>

            {/* Desktop nav – pills need ~950px; drawer below lg to prevent horizontal scroll */}
            <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
              <NavLink to="/app" className={pill}>{t("nav.dashboard")}</NavLink>
              <NavLink to="/forge" className={pill}><Hammer size={15} /><span>{t("nav.forge")}</span></NavLink>
              <NavLink to="/analytics" className={pill}><BarChart3 size={15} /><span>{t("nav.analytics")}</span></NavLink>
              <NavLink to="/timetable" className={pill}><CalendarDays size={15} /><span>{t("nav.timetable")}</span></NavLink>
              <NavLink to="/leaderboard" className={pill}><Trophy size={15} /><span>{t("nav.leaderboard")}</span></NavLink>
              <NavLink to="/profile" className={pill}><User size={15} /><span>{t("nav.profile")}</span></NavLink>
              {showAdmin ? <NavLink to="/admin" className={pill}>{t("nav.admin")}</NavLink> : null}
              {isFirebaseConfigured ? (<><button type="button" onClick={() => { setShowChangePw(true); setPwError(""); setPwSuccess(""); setNewPassword(""); }} className="btn-ghost ml-1 !px-3" aria-label={t("profile.change_password")}><KeyRound size={16} /></button><button type="button" onClick={logout} className="btn-ghost !px-3" aria-label={t("nav.logout")}><LogOut size={16} /></button></>) : null}
            </nav>
            {/* Mobile hamburger – prevents horizontal scroll, ensures tappable 44px */}
            <button type="button" onClick={() => setMobileOpen(v=>!v)} className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-border bg-surface p-2 text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 lg:hidden" aria-label="Open navigation" aria-expanded={mobileOpen} aria-controls="mobile-nav">
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
        </div>
        {/* Mobile drawer – fluid, no horizontal scroll */}
        {mobileOpen ? (
          <nav id="mobile-nav" className="flex flex-col gap-2 border-t border-border bg-surface px-4 py-4 lg:hidden" role="navigation" aria-label="Mobile">
            <NavLink to="/app" onClick={()=>setMobileOpen(false)} className={({isActive})=>`rounded-xl px-4 py-3 min-h-[44px] text-sm font-bold ${isActive ? "bg-primary text-white" : "bg-background text-text-secondary"}`}>{t("nav.dashboard")}</NavLink>
            <NavLink to="/forge" onClick={()=>setMobileOpen(false)} className={({isActive})=>`rounded-xl px-4 py-3 min-h-[44px] text-sm font-bold flex items-center gap-2 ${isActive ? "bg-primary text-white" : "bg-background text-text-secondary"}`}><Hammer size={16}/>{t("nav.forge")}</NavLink>
            <NavLink to="/analytics" onClick={()=>setMobileOpen(false)} className={({isActive})=>`rounded-xl px-4 py-3 min-h-[44px] text-sm font-bold flex items-center gap-2 ${isActive ? "bg-primary text-white" : "bg-background text-text-secondary"}`}><BarChart3 size={16}/>{t("nav.analytics")}</NavLink>
            <NavLink to="/timetable" onClick={()=>setMobileOpen(false)} className={({isActive})=>`rounded-xl px-4 py-3 min-h-[44px] text-sm font-bold flex items-center gap-2 ${isActive ? "bg-primary text-white" : "bg-background text-text-secondary"}`}><CalendarDays size={16}/>{t("nav.timetable")}</NavLink>
            <NavLink to="/leaderboard" onClick={()=>setMobileOpen(false)} className={({isActive})=>`rounded-xl px-4 py-3 min-h-[44px] text-sm font-bold flex items-center gap-2 ${isActive ? "bg-primary text-white" : "bg-background text-text-secondary"}`}><Trophy size={16}/>{t("nav.leaderboard")}</NavLink>
            <NavLink to="/profile" onClick={()=>setMobileOpen(false)} className={({isActive})=>`rounded-xl px-4 py-3 min-h-[44px] text-sm font-bold flex items-center gap-2 ${isActive ? "bg-primary text-white" : "bg-background text-text-secondary"}`}><User size={16}/>{t("nav.profile")}</NavLink>
            {showAdmin ? <NavLink to="/admin" onClick={()=>setMobileOpen(false)} className={({isActive})=>`rounded-xl px-4 py-3 min-h-[44px] text-sm font-bold ${isActive ? "bg-primary text-white" : "bg-background text-text-secondary"}`}>{t("nav.admin")}</NavLink> : null}
            {isFirebaseConfigured ? (
              <div className="flex gap-2 pt-2 border-t border-border mt-2">
                <button type="button" onClick={()=>{setMobileOpen(false); setShowChangePw(true);}} className="flex-1 rounded-xl border border-border bg-background py-3 min-h-[44px] text-sm font-bold flex items-center justify-center gap-2"><KeyRound size={16}/>{t("profile.change_password")}</button>
                <button type="button" onClick={()=>{setMobileOpen(false); logout();}} className="flex-1 rounded-xl bg-primary py-3 min-h-[44px] text-sm font-black text-white flex items-center justify-center gap-2"><LogOut size={16}/>{t("nav.logout")}</button>
              </div>
            ) : null}
          </nav>
        ) : null}
      </header>

      <section className="page-shell">{children}</section>
      <AiSidebar />

      {showChangePw ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4" onClick={() => setShowChangePw(false)}>
          <div className="w-full max-w-md rounded-3xl border border-border bg-surface p-8 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-black tracking-tight text-text-primary">{t("profile.change_password")}</h2>
              <button
                type="button"
                onClick={() => setShowChangePw(false)}
                className="rounded-xl border border-border bg-surface p-2 text-text-secondary transition-colors hover:bg-primary hover:text-white"
                aria-label={t("common.close")}
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleChangePassword} className="grid gap-4">
              <label className="grid gap-2 text-sm font-bold text-text-primary">
                {t("profile.new_password")}
                <PasswordInput
                  id="change-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  showValidation={true}
                />
              </label>
              {pwSuccess ? (
                <p className="rounded-xl p-3 text-sm font-bold text-success" style={{ backgroundColor: "rgba(16, 185, 129, 0.2)" }}>{pwSuccess}</p>
              ) : null}
              {pwError ? (
                <p className="rounded-xl p-3 text-sm font-bold text-error" style={{ backgroundColor: "rgba(239, 68, 68, 0.2)" }}>{pwError}</p>
              ) : null}
              <button
                type="submit"
                disabled={pwBusy || newPassword.length < 8}
                className="rounded-xl bg-primary px-4 py-3 font-black text-white transition-all hover:bg-primary-active active:scale-95 disabled:opacity-50"
              >
                {pwBusy ? t("common.saving") : t("profile.change_password")}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </main>
  );
}
