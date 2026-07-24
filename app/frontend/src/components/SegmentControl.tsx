import { tick } from "@/lib/telegram";
import { cx } from "@/lib/cx";
import styles from "./SegmentControl.module.css";

interface SegmentOption<T> {
  value: T;
  label: string;
}

interface SegmentControlProps<T> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  height?: number;
  fontSize?: number;
}

export function SegmentControl<T>({
  options,
  value,
  onChange,
  height = 38,
  fontSize = 14,
}: SegmentControlProps<T>) {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => Object.is(option.value, value)),
  );

  return (
    <div className={styles.box} style={{ height }}>
      <span
        className={styles.thumb}
        style={{
          width: `calc((100% - 4px) / ${options.length})`,
          transform: `translateX(${activeIndex * 100}%)`,
        }}
      />
      {options.map((option, index) => (
        <button
          key={String(option.value)}
          type="button"
          className={cx(styles.option, index === activeIndex && styles.active)}
          style={{ fontSize }}
          onClick={() => {
            if (option.value !== value) tick();
            onChange(option.value);
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
