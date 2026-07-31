import { Check, LockKeyhole, X } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

const RULE_KEYS = [
  { test: (pw) => pw.length >= 8, key: "min_chars" },
  { test: (pw) => /[a-z]/.test(pw), key: "has_lowercase" },
  { test: (pw) => /[A-Z]/.test(pw), key: "has_uppercase" },
  { test: (pw) => /\d/.test(pw), key: "has_digit" },
  { test: (pw) => /[^a-zA-Z0-9]/.test(pw), key: "has_special" },
];

export function PasswordInput({ value, onChange, id, placeholder, disabled, autoFocus, showValidation }) {
  const { t } = useTranslation();
  const rules = useMemo(() => RULE_KEYS.map((r) => ({ ...r, label: t(`password.${r.key}`) })), [t]);
  const results = useMemo(
    () => (showValidation ? rules.map((r) => r.test(value || "")) : []),
    [value, showValidation, rules],
  );

  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-border px-3 transition-all focus-within:border-primary focus-within:ring-1 focus-within:ring-primary/50">
        <LockKeyhole size={17} className="shrink-0 text-text-muted" />
        <input
          id={id}
          required
          minLength={8}
          type="password"
          disabled={disabled}
          autoFocus={autoFocus}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="min-w-0 flex-1 py-3 outline-none bg-transparent text-text-primary"
        />
      </div>
      {showValidation ? (
        <div className="grid gap-1.5">
          {rules.map((rule, i) => (
            <div key={rule.label} className="flex items-center gap-2 text-xs">
              {results[i] ? (
                <Check size={13} className="shrink-0 text-status-success" />
              ) : (
                <X size={13} className="shrink-0 text-status-error" />
              )}
              <span className={results[i] ? "text-text-secondary" : "text-text-muted"}>{rule.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
