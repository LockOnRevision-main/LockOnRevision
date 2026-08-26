import { Logo } from "./Logo.jsx";

export function EmptyState({ title, copy, action }) {
  return (
    <div className="rounded-3xl border-2 border-dashed border-border bg-surface/50 p-12 text-center transition-colors hover:bg-surface">
      <div className="flex justify-center mb-6">
        <Logo variant="stacked" className="scale-75 opacity-30" />
      </div>
      <h3 className="text-xl font-black text-text-primary">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-text-secondary">{copy}</p>
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}
