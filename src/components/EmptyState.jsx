import { Inbox } from "lucide-react";

export function EmptyState({ title, copy, action, icon }) {
  const Icon = icon || Inbox;
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background/60 px-6 py-10 text-center">
      <div className="icon-tile mx-auto">
        <Icon size={20} aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-bold text-text-primary">{title}</h3>
      <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-text-secondary">{copy}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
