interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
}

export function ProgressBar({ value, max = 100, label, showValue = false }: ProgressBarProps) {
  const percent = max > 0 ? Math.min(100, Math.max(0, Math.round((value / max) * 100))) : 0;
  return (
    <div className="progress-block">
      {(label || showValue) && (
        <div className="progress-block__label">
          <span>{label}</span>
          {showValue && <strong>{percent}%</strong>}
        </div>
      )}
      <div
        className="progress-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
      >
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}
