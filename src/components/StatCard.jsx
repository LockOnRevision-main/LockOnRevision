export function StatCard({ label, value, helper, tone = "bg-surface" }) {
  return (
    <article className={`group rounded-xl border border-border ${tone} p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-1`}>
      <p className="text-xs font-bold uppercase tracking-widest text-text-secondary transition-colors duration-300 group-hover:text-primary">{label}</p>
      <strong className="mt-2 block text-3xl font-black tracking-tighter text-text-primary">{value}</strong>
      {helper ? <p className="mt-1 text-xs font-medium text-text-muted">{helper}</p> : null}
    </article>
  );
}
