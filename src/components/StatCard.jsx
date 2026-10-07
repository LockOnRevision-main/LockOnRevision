export function StatCard({ label, value, helper, tone = "bg-surface", icon }) {
  return (
    <article className={`card card-pad min-w-0 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <p className="min-w-0 text-[11px] font-bold uppercase tracking-[0.1em] text-text-secondary">{label}</p>
        {icon ? <span className="icon-tile shrink-0" style={{ width: "2rem", height: "2rem" }}>{icon}</span> : null}
      </div>
      <strong className="mt-2 block break-words text-[1.7rem] font-extrabold tabular-nums tracking-tight text-text-primary">{value}</strong>
      {helper ? <p className="mt-1 text-xs font-medium text-text-muted">{helper}</p> : null}
    </article>
  );
}
