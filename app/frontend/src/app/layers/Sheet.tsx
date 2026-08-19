import { cx } from "@/lib/cx";
import { createContext, type ReactNode, useContext, useEffect, useRef } from "react";
import styles from "./Sheet.module.css";
import type { SheetHeight } from "./presentation";
import { useSheetDrag } from "./useSheetDrag";

const CLOSE_MS = 260;
const CLOSE_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

const SheetContext = createContext(false);

export function useInSheet(): boolean {
  return useContext(SheetContext);
}

interface SheetProps {
  height: SheetHeight;
  depth: number;
  top: boolean;
  closing: boolean;
  title?: string;
  subtitle?: ReactNode;
  onDismiss: () => void;
  onClosed: () => void;
  children: ReactNode;
}

export function Sheet({ height, depth, top, closing, title, subtitle, onDismiss, onClosed, children }: SheetProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const scrimRef = useRef<HTMLDivElement>(null);
  const { ref: dragRef, offset, dragging, handlers } = useSheetDrag(top && !closing, onDismiss);

  useEffect(() => {
    const layer = layerRef.current;
    if (layer) layer.inert = !top;
  }, [top]);

  const closed = useRef(onClosed);
  closed.current = onClosed;

  useEffect(() => {
    const sheet = sheetRef.current;
    if (!closing || !sheet) return;
    const from = getComputedStyle(sheet).transform;
    const slide = sheet.animate([{ transform: from === "none" ? "translateY(0px)" : from }, { transform: "translateY(100%)" }], {
      duration: CLOSE_MS,
      easing: CLOSE_EASE,
      fill: "forwards",
    });
    const scrim = scrimRef.current;
    if (scrim) {
      scrim.animate([{ opacity: getComputedStyle(scrim).opacity }, { opacity: 0 }], {
        duration: CLOSE_MS,
        easing: CLOSE_EASE,
        fill: "forwards",
      });
    }
    const finish = () => closed.current();
    slide.addEventListener("finish", finish);
    const timer = setTimeout(finish, CLOSE_MS * 2);
    return () => {
      slide.removeEventListener("finish", finish);
      clearTimeout(timer);
    };
  }, [closing]);

  return (
    <div
      ref={layerRef}
      className={styles.layer}
      style={{ ["--layer-depth" as string]: depth }}
      role="dialog"
      aria-modal={top}
      aria-label={title}
    >
      <div ref={scrimRef} className={styles.scrim} onClick={top && !closing ? onDismiss : undefined} />
      <div
        ref={(element) => {
          sheetRef.current = element;
          dragRef(element);
        }}
        className={cx(
          styles.sheet,
          styles[height],
          dragging && styles.dragging,
          closing ? styles.closing : !top && styles.behind,
        )}
        style={offset > 0 ? { transform: `translateY(${offset}px)` } : undefined}
        {...handlers}
      >
        <button type="button" className={styles.grabber} aria-label="Close" onClick={onDismiss} />
        {title && <div className={styles.title}>{title}</div>}
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        <SheetContext.Provider value>
          <div className={styles.body}>{children}</div>
        </SheetContext.Provider>
      </div>
    </div>
  );
}
