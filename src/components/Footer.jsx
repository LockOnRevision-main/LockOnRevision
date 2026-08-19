import { Github, MessageCircle, Instagram } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Logo } from "./Logo";

const socialLinks = [
  { label: "GitHub", href: "https://github.com/LockOnRevision/LockOnRevision", icon: Github },
  { label: "Discord", href: "https://discord.gg/efDwq2XhS7", icon: MessageCircle },
  { label: "Instagram", href: "https://www.instagram.com/lockonrevision?igsh=bHMzd25kM2pydzdh", icon: Instagram },
];

export function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const quickLinks = [
    { label: t("nav.home"), to: "/" },
    { label: t("nav.leaderboard"), to: "/leaderboard" },
    { label: t("nav.login"), to: "/login" },
  ];

  return (
    <footer className="bg-secondary text-white">
      <div className="mx-auto max-w-7xl px-6 py-12 lg:py-16">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <Logo theme="dark" className="h-10 w-auto" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/70">
              {t("footer.description")}
            </p>
          </div>

          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">{t("footer.quick_links")}</h3>
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
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/50">{t("footer.connect")}</h3>
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
          {t("footer.copyright", { year })}
        </div>
      </div>
    </footer>
  );
}
