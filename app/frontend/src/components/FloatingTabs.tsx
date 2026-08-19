import { Icon } from "@/components/Icon/Icon";
import type { GlyphName } from "@/components/Icon/glyphs";
import { cx } from "@/lib/cx";
import { tick } from "@/lib/telegram";
import { type KeyboardEvent, useEffect } from "react";
import styles from "./FloatingTabs.module.css";

const DOCK_SPACE = "74px";

interface FloatingTab<T extends string> {
  key: T;
  label: string;
  glyph: GlyphName;
}

interface FloatingTabsProps<T extends string> {
  tabs: readonly FloatingTab<T>[];
  tab: T;
  progress: number;
  onSelect: (tab: T) => void;
}

export function FloatingTabs<T extends string>({ tabs, tab, progress, onSelect }: FloatingTabsProps<T>) {
  const activeIndex = Math.max(
    0,
    tabs.findIndex((item) => item.key === tab),
  );
  const thumb = Math.min(Math.max(progress, 0), tabs.length - 1);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--ts-dock-space", DOCK_SPACE);
    return () => {
      root.style.removeProperty("--ts-dock-space");
    };
  }, []);

  const select = (next: T) => {
    if (next !== tab) tick();
    onSelect(next);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = tabs[Math.min(Math.max(activeIndex + step, 0), tabs.length - 1)];
    if (next) select(next.key);
  };

  return (
    <div className={styles.dock}>
      <div className={styles.bar} role="tablist" aria-orientation="horizontal" onKeyDown={onKeyDown}>
        <span
          className={styles.thumb}
          style={{
            width: `calc((100% - 8px) / ${tabs.length})`,
            transform: `translateX(${thumb * 100}%)`,
          }}
        />
        {tabs.map((item) => {
          const active = item.key === tab;
          return (
            <button
              key={item.key}
              type="button"
              role="tab"
              id={`tab-${item.key}`}
              aria-controls={`pane-${item.key}`}
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              className={cx(styles.tab, active && styles.active)}
              onClick={() => select(item.key)}
            >
              <Icon glyph={item.glyph} size={22} filled={active} />
              <span className={styles.label}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
