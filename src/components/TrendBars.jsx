/**
 * Minimal accessible bar chart for Beta 1.8 analytics surfaces.
 * Data: [{ label, count }]. No dependencies, theme-aware via CSS vars.
 */
export function TrendBars({ data = [], ariaLabel = "Trend chart", emptyText = "No data yet." }) {
  if (!data.length || data.every((d) => !d.count)) {
    return <p className="py-6 text-center text-sm text-text-muted">{emptyText}</p>;
  }
  const max = Math.max(1, ...data.map((d) => d.count));
  const W = 560;
  const H = 180;
  const PAD = 28;
  const bw = (W - PAD * 2) / data.length;
  return (
    <div role="img" aria-label={ariaLabel}>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="presentation">
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={PAD}
            x2={W - PAD}
            y1={H - PAD - (H - PAD * 2) * f}
            y2={H - PAD - (H - PAD * 2) * f}
            stroke="var(--color-border)"
            strokeWidth="1"
          />
        ))}
        {data.map((w, i) => {
          const h = Math.max(4, ((H - PAD * 2) * w.count) / max);
          const x = PAD + i * bw + bw * 0.22;
          return (
            <g key={`${w.label}-${i}`}>
              <title>{`${w.label}: ${w.count}`}</title>
              <rect
                x={x}
                y={H - PAD - h}
                width={bw * 0.56}
                height={h}
                rx="5"
                fill={i === data.length - 1 ? "var(--color-primary)" : "color-mix(in srgb, var(--color-primary) 45%, transparent)"}
              />
              <text x={x + (bw * 0.56) / 2} y={H - 10} textAnchor="middle" fontSize="10" fill="var(--color-text-muted)">
                {w.label}
              </text>
            </g>
          );
        })}
      </svg>
      <ul className="sr-only">
        {data.map((w, i) => (
          <li key={`${w.label}-${i}`}>{`${w.label}: ${w.count}`}</li>
        ))}
      </ul>
    </div>
  );
}
