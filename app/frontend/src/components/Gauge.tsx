import { SC } from "@/lib/colors";
import styles from "./Gauge.module.css";

const RADIUS = 31;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function gaugeColor(value: number, threshold: number): string {
  if (value >= threshold) return SC.red;
  if (value >= threshold - 12) return SC.orange;
  return SC.green;
}

interface GaugeProps {
  value: number;
  threshold: number;
  label: string;
}

export function Gauge({ value, threshold, label }: GaugeProps) {
  const clamped = Math.min(100, Math.max(0, Math.round(value)));
  const color = gaugeColor(clamped, threshold);
  const dash = `${((clamped / 100) * CIRCUMFERENCE).toFixed(1)} ${CIRCUMFERENCE.toFixed(1)}`;

  return (
    <div className={styles.gauge}>
      <div className={styles.ring}>
        <svg width={58} height={58} viewBox="0 0 78 78" className={styles.svg}>
          <circle cx={39} cy={39} r={RADIUS} fill="none" stroke="var(--ts-sepf)" strokeWidth={7} />
          <circle
            cx={39}
            cy={39}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={dash}
            transform="rotate(-90 39 39)"
          />
        </svg>
        <div className={styles.center}>
          <span className={styles.value} style={{ color }}>
            {clamped}
          </span>
        </div>
      </div>
      <span className={styles.label}>{label}</span>
    </div>
  );
}
