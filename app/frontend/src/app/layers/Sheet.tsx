import { cx } from "@/lib/cx";
import { createContext, type ReactNode, useContext, useEffect, useRef } from "react";
import styles from "./Sheet.module.css";
import type { SheetHeight } from "./presentation";
import { useSheetDrag } from "./useSheetDrag";

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
  const { ref: dragRef, offset, dragging, handlers } = useSheetDrag(top && !closing, onDismiss);

  useEffect(() => {
    const layer = layerRef.current;
    if (layer) layer.inert = !top;
  }, [top]);

  return (
    <div
      ref={layerRef}
      className={styles.layer}
      style={{ ["--layer-depth" as string]: depth }}
      role="dialog"
      aria-modal={top}
      aria-label={title}
    >
      <div
        className={cx(styles.scrim, closing && styles.scrimClosing)}
        onClick={top && !closing ? onDismiss : undefined}
      />
      <div
        ref={dragRef}
        className={cx(
          styles.sheet,
          styles[height],
          dragging && styles.dragging,
          closing ? styles.closing : !top && styles.behind,
        )}
        style={!closing && offset > 0 ? { transform: `translateY(${offset}px)` } : undefined}
        onTransitionEnd={(event) => {
          if (closing && event.propertyName === "transform" && event.target === event.currentTarget) onClosed();
        }}
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
