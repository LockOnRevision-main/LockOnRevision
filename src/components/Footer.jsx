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
    <footer className="border-t border-border bg-surface text-text-primary">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          <div>
            <Logo theme="light" className="h-9 w-auto" />
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-text-secondary">
              {t("footer.description")}
            </p>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">{t("footer.quick_links")}</h3>
            <ul className="mt-3 space-y-2">
              {quickLinks.map((link) => (
                <li key={link.to}>
                  <Link
                    to={link.to}
                    className="text-sm font-semibold text-text-secondary transition-colors hover:text-primary"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-text-muted">{t("footer.connect")}</h3>
            <div className="mt-3 flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className="btn-ghost !min-h-[44px] !min-w-[44px] !px-0"
                >
                  <social.icon size={17} />
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-5 text-center text-[13px] text-text-muted">
          {t("footer.copyright", { year })}
        </div>
      </div>
    </footer>
  );
}
