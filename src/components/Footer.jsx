import { Github, MessageCircle, Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "Leaderboard", to: "/leaderboard" },
  { label: "Login", to: "/login" },
];

const socialLinks = [
  { label: "GitHub", href: "https://github.com/LockOnRevision/LockOnRevision", icon: Github },
  { label: "Discord", href: "https://discord.gg/efDwq2XhS7", icon: MessageCircle },
  { label: "Instagram", href: "https://www.instagram.com/lockonrevision?igsh=bHMzd25kM2pydzdh", icon: Instagram },
];

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-secondary text-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Logo theme="dark" className="h-10 w-auto" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              LockOnRevision turns study consistency into a visible scoring system. Students complete lessons, gain XP,
              earn Energy, and compare progress through a focused leaderboard.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Quick Links</h3>
            <ul className="mt-4 space-y-3">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm font-semibold text-white/70 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">Connect</h3>
            <div className="mt-4 flex gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="grid h-10 w-10 place-items-center rounded-xl bg-white/10 text-white/70 transition-all hover:bg-white/20 hover:text-white"
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-center text-sm text-white/50">
          &copy; {year} LockOnRevision. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
