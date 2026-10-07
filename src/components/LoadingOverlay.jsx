import { RefreshCw } from "lucide-react";

export function LoadingSpinner({ size = "default", className = "" }) {
  const sizeClass = size === "lg" ? "loading-spinner-lg" : "loading-spinner";
  return (
    <div
      className={`${sizeClass} animate-spin-slow rounded-full border-primary/20 border-t-primary ${className}`}
      role="status"
      aria-label="Loading"
      style={{ willChange: "transform", transform: "translateZ(0)" }}
    />
  );
}

export function LoadingOverlay({ progress = 0, stage = "Processing...", visible = true }) {
  if (!visible) return null;
  const pct = Math.round(Math.min(100, Math.max(0, progress)));
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4 backdrop-blur-[2px]">
      <div className="card loading-overlay-card flex flex-col items-center text-center animate-fadeIn" role="status" aria-live="polite">
        <div className="icon-tile" style={{ width: "3rem", height: "3rem" }}>
          <RefreshCw className="animate-spin-slow" size={22} aria-hidden="true" />
        </div>
        <div className="mt-3 space-y-1">
          <div className="loading-overlay-title font-bold text-text-primary leading-snug">{stage}</div>
          <div className="loading-overlay-subtitle font-medium tabular-nums text-text-secondary">{pct}% complete</div>
        </div>
        <div className="progress-track loading-progress-track mt-3">
          <div
            className="progress-fill"
            style={{ width: `${pct}%` }}
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
    </div>
  );
}

export default LoadingOverlay;
