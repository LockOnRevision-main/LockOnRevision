import { LogOut, Hammer, Trophy } from "lucide-react";
import { NavLink } from "react-router-dom";
import { AiSidebar } from "./AiSidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { canAccessAdmin } from "../utils/permissions.js";

export function AppShell({ children }) {
  const { isFirebaseConfigured, logout, profile, user } = useAuth();
  const showAdmin = canAccessAdmin(profile, user?.email);

  return (
    <main className="min-h-screen bg-background text-text-primary">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
           <NavLink to="/app" className="flex items-center gap-3">
             <div className="h-10 w-10 overflow-hidden rounded-lg bg-secondary">
               <img src="/assets/branding/logo-dark.svg" alt="LockOn Logo" className="h-full w-full object-contain" />
             </div>
             <div>
               <p className="font-black tracking-tight text-text-primary">LockOn Revision</p>
               <p className="text-xs text-text-secondary">{profile?.name || "Local Learner"}</p>
             </div>
           </NavLink>

          <nav className="flex items-center gap-2">
            <NavLink
              to="/app"
               className={({ isActive }) =>
                 `rounded-lg px-3 py-2 text-sm font-bold ${isActive ? "bg-accent text-primary" : "text-text-secondary"}`
               }
            >
              Dashboard
            </NavLink>
             <NavLink
               to="/forge"
               className={({ isActive }) =>
                 `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${
                   isActive ? "bg-accent text-primary" : "text-text-secondary"
                 }`
               }
            >
              <Hammer size={16} />
              Forge
            </NavLink>
            <NavLink
              to="/leaderboard"
              className={({ isActive }) =>
                `inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-bold ${
                  isActive ? "bg-accent text-primary" : "text-text-secondary"
                }`
              }
            >
              <Trophy size={16} />
              Leaderboard
            </NavLink>
            {showAdmin ? (
              <NavLink
                to="/admin"
                className={({ isActive }) =>
                  `rounded-lg px-3 py-2 text-sm font-bold ${isActive ? "bg-accent text-primary" : "text-text-secondary"}`
                }
              >
                Admin
              </NavLink>
            ) : null}
            {isFirebaseConfigured ? (
              <button
                type="button"
                onClick={logout}
                className="rounded-lg border border-border bg-surface p-2 text-text-secondary shadow-sm"
                aria-label="Log out"
              >
                <LogOut size={18} />
              </button>
            ) : null}
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-6">{children}</section>
      <AiSidebar />
    </main>
  );
}
