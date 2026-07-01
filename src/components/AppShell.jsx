import { LogOut, Hammer, Trophy } from "lucide-react";
import { NavLink } from "react-router-dom";
import { AiSidebar } from "./AiSidebar.jsx";
import { Logo } from "./Logo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { canAccessAdmin } from "../utils/permissions.js";

export function AppShell({ children }) {
  const { isFirebaseConfigured, logout, profile, user } = useAuth();
  const showAdmin = canAccessAdmin(profile, user?.email);

  return (
    <main className="min-h-screen bg-background text-text-primary">
      <header className="sticky top-0 z-20 border-b border-border bg-surface/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
            <NavLink to="/app" className="group flex items-center gap-3 transition-opacity hover:opacity-90">
              <div className="h-10 w-10 overflow-hidden rounded-xl bg-secondary shadow-lg shadow-secondary/20 transition-transform group-hover:scale-110">
                <Logo variant="icon" className="h-full w-full" />
              </div>
              <div>
                <p className="font-black tracking-tight text-text-primary">LockOn Revision</p>
                <p className="text-xs font-medium text-text-secondary">{profile?.name || "Local Learner"}</p>
              </div>
            </NavLink>

           <nav className="flex items-center gap-1">
              <NavLink
                to="/app"
                className={({ isActive }) =>
                  `rounded-lg px-4 py-2 text-sm font-bold transition-all duration-200 ${isActive ? "bg-primary text-white shadow-md" : "text-text-secondary hover:bg-surface hover:text-text-primary"}`
                }
              >
                Dashboard
              </NavLink>
               <NavLink
                to="/forge"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all duration-200 ${
                    isActive ? "bg-primary text-white shadow-md" : "text-text-secondary hover:bg-surface hover:text-text-primary"
                  }`
                }
              >
                <Hammer size={16} />
                Forge
              </NavLink>
              <NavLink
                to="/leaderboard"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-bold transition-all duration-200 ${
                    isActive ? "bg-primary text-white shadow-md" : "text-text-secondary hover:bg-surface hover:text-text-primary"
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
                    `rounded-lg px-4 py-2 text-sm font-bold transition-all duration-200 ${isActive ? "bg-primary text-white shadow-md" : "text-text-secondary hover:bg-surface hover:text-text-primary"}`
                  }
                >
                  Admin
                </NavLink>
              ) : null}

             {isFirebaseConfigured ? (
                <button
                  type="button"
                  onClick={logout}
                  className="ml-2 rounded-lg border border-border bg-surface p-2 text-text-secondary shadow-sm transition-all hover:bg-primary hover:text-white"
                  aria-label="Log out"
                >
                  <LogOut size={18} />
                </button>

             ) : null}
           </nav>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-8">{children}</section>
      <AiSidebar />
    </main>
  );
}
