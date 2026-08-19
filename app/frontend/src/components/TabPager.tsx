import { type MutableRefObject, type ReactNode, type UIEvent, useEffect, useLayoutEffect, useRef } from "react";
import styles from "./TabPager.module.css";

const SETTLE_MS = 140;

function reducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface TabPagerProps<T extends string> {
  tabs: readonly T[];
  tab: T;
  panes: MutableRefObject<Record<string, HTMLDivElement | null>>;
  onTabChange: (tab: T) => void;
  onProgress?: (progress: number) => void;
  onPaneScroll?: (tab: T, scrollTop: number) => void;
  children: (tab: T) => ReactNode;
}

export function TabPager<T extends string>({
  tabs,
  tab,
  panes,
  onTabChange,
  onProgress,
  onPaneScroll,
  children,
}: TabPagerProps<T>) {
  const trackRef = useRef<HTMLDivElement>(null);
  const settleTimer = useRef<ReturnType<typeof setTimeout>>();
  const settleRef = useRef<() => void>(() => {});
  const dragging = useRef(false);
  const ready = useRef(false);
  const indexRef = useRef(0);

  useEffect(() => () => clearTimeout(settleTimer.current), []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const handler = () => settleRef.current();
    track.addEventListener("scrollend", handler);
    return () => track.removeEventListener("scrollend", handler);
  }, []);

  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const index = tabs.indexOf(tab);
    if (index < 0) return;
    indexRef.current = index;
    const instant = !ready.current || dragging.current || reducedMotion();
    ready.current = true;
    const target = index * track.clientWidth;
    if (Math.abs(track.scrollLeft - target) < 1) return;
    track.scrollTo({ left: target, behavior: instant ? "auto" : "smooth" });
  }, [tab, tabs]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let width = track.clientWidth;
    const observer = new ResizeObserver(() => {
      if (track.clientWidth === width) return;
      width = track.clientWidth;
      track.scrollLeft = indexRef.current * width;
    });
    observer.observe(track);
    return () => observer.disconnect();
  }, []);

  const settle = () => {
    const track = trackRef.current;
    if (!track || !track.clientWidth) return;
    dragging.current = false;
    const index = Math.round(track.scrollLeft / track.clientWidth);
    const next = tabs[Math.min(Math.max(index, 0), tabs.length - 1)];
    if (next && next !== tab) onTabChange(next);
  };

  settleRef.current = settle;

  const onScroll = (event: UIEvent<HTMLDivElement>) => {
    const track = event.currentTarget;
    if (!track.clientWidth) return;
    onProgress?.(track.scrollLeft / track.clientWidth);
    clearTimeout(settleTimer.current);
    settleTimer.current = setTimeout(settle, SETTLE_MS);
  };

  return (
    <div
      ref={trackRef}
      className={styles.track}
      data-no-drag
      onScroll={onScroll}
      onPointerDown={() => {
        dragging.current = true;
      }}
      onPointerUp={() => {
        dragging.current = false;
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
    >
      {tabs.map((key) => (
        <div
          key={key}
          ref={(element) => {
            panes.current[key] = element;
          }}
          className={styles.pane}
          role="tabpanel"
          id={`pane-${key}`}
          aria-labelledby={`tab-${key}`}
          onScroll={(event) => onPaneScroll?.(key, event.currentTarget.scrollTop)}
        >
          {children(key)}
        </div>
      ))}
    </div>
  );
}
