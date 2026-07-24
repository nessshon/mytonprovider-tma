import { cx } from "@/lib/cx";
import { tick } from "@/lib/telegram";
import { type PointerEvent as ReactPointerEvent, useId, useRef, useState } from "react";
import styles from "./Chart.module.css";

const WIDTH = 300;
const HEIGHT = 64;
const PAD = 4;
const TWO_DAYS_SEC = 172800;

interface ChartProps {
  values: number[];
  times: number[];
  threshold: number | null;
  unit: string;
  label: string;
  current: string;
  loading?: boolean;
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

function timeLabel(unixSec: number, spanSec: number): string {
  const date = new Date(unixSec * 1000);
  const clock = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  if (spanSec <= TWO_DAYS_SEC) return clock;
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)} ${clock}`;
}

export function Chart({ values, times, threshold, unit, label, current, loading }: ChartProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const clipId = useId();
  const [scrub, setScrub] = useState<number | null>(null);

  if (loading || !values.length) {
    return (
      <div className={styles.chart}>
        <div className={styles.head}>
          <span className={styles.label}>{label}</span>
          <span className={styles.skelValue} />
        </div>
        <div className={styles.skelBody} />
      </div>
    );
  }

  const count = values.length;
  const x = (i: number) => PAD + (count > 1 ? (i / (count - 1)) * (WIDTH - 2 * PAD) : (WIDTH - 2 * PAD) / 2);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const lo = threshold != null ? Math.min(min, threshold) : min;
  const hi = threshold != null ? Math.max(max, threshold) : max;
  const span = hi - lo || 1;
  const y = (v: number) => HEIGHT - PAD - ((v - lo) / span) * (HEIGHT - 2 * PAD);

  const points = values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
  const areaPath = `M${points[0]} ${points
    .slice(1)
    .map((point) => `L${point}`)
    .join(" ")} L${(WIDTH - PAD).toFixed(1)},${HEIGHT} L${PAD.toFixed(1)},${HEIGHT} Z`;

  const thresholdY = threshold != null ? y(threshold) : 0;
  const thresholdLine =
    threshold != null
      ? `M${PAD.toFixed(1)},${thresholdY.toFixed(1)} L${(WIDTH - PAD).toFixed(1)},${thresholdY.toFixed(1)}`
      : "";

  const indexFromEvent = (event: ReactPointerEvent<HTMLDivElement>): number | null => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect || count < 2) return null;
    const ratio = (event.clientX - rect.left) / rect.width;
    return Math.max(0, Math.min(count - 1, Math.round(ratio * (count - 1))));
  };

  const moveScrub = (event: ReactPointerEvent<HTMLDivElement>) => {
    const next = indexFromEvent(event);
    if (next !== scrub) {
      if (next !== null) tick();
      setScrub(next);
    }
  };
  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    moveScrub(event);
  };
  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (scrub !== null) moveScrub(event);
  };
  const endScrub = () => setScrub(null);

  const spanSec = count > 1 ? times[count - 1] - times[0] : 0;
  const scrubValue =
    scrub !== null && values[scrub] !== undefined
      ? `${values[scrub]}${unit} · ${timeLabel(times[scrub], spanSec)}`
      : null;

  return (
    <div className={styles.chart}>
      <div className={styles.head}>
        <span className={styles.label}>{label}</span>
        <span className={scrubValue ? styles.scrubValue : styles.current}>{scrubValue ?? current}</span>
      </div>
      <div
        ref={wrapRef}
        className={styles.plot}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endScrub}
        onPointerCancel={endScrub}
      >
        <svg width="100%" height={60} viewBox="0 0 300 64" preserveAspectRatio="none" className={styles.svg}>
          {threshold != null && (
            <defs>
              <clipPath id={`${clipId}-below`}>
                <rect x={0} y={thresholdY} width={WIDTH} height={HEIGHT - thresholdY} />
              </clipPath>
              <clipPath id={`${clipId}-above`}>
                <rect x={0} y={-HEIGHT} width={WIDTH} height={HEIGHT + thresholdY} />
              </clipPath>
            </defs>
          )}
          <path d={areaPath} fill="rgba(0, 152, 234, 0.1)" />
          {thresholdLine && (
            <path d={thresholdLine} fill="none" stroke="#ff3b30" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
          )}
          <polyline
            points={points.join(" ")}
            fill="none"
            stroke="var(--ts-accent)"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath={threshold != null ? `url(#${clipId}-below)` : undefined}
          />
          {threshold != null && (
            <polyline
              points={points.join(" ")}
              fill="none"
              stroke="#ff3b30"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              clipPath={`url(#${clipId}-above)`}
            />
          )}
          {scrub === null && count > 0 && (
            <circle
              cx={x(count - 1)}
              cy={y(values[count - 1])}
              r={3}
              fill="var(--ts-accent)"
              stroke="var(--ts-card)"
              strokeWidth={1.5}
            />
          )}
          {scrub !== null && (
            <g>
              <line x1={x(scrub)} x2={x(scrub)} y1={0} y2={HEIGHT} stroke="var(--ts-hint)" strokeWidth={1} opacity={0.6} />
              <circle cx={x(scrub)} cy={y(values[scrub])} r={3.5} fill="var(--ts-accent)" stroke="var(--ts-card)" strokeWidth={1.5} />
            </g>
          )}
        </svg>
        {threshold != null && (
          <span
            className={cx(styles.thresholdLabel, thresholdY <= 14 && styles.thresholdLabelBelow)}
            style={{ top: `${(thresholdY / HEIGHT) * 100}%` }}
          >
            {`${threshold}${unit}`}
          </span>
        )}
      </div>
    </div>
  );
}
