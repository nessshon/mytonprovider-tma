import { cx } from "@/lib/cx";
import { type PointerEvent as ReactPointerEvent, type ReactNode, useEffect, useRef, useState } from "react";
import styles from "./BottomSheet.module.css";

const EXIT_MS = 250;
const DISMISS_DISTANCE = 90;
const DISMISS_VELOCITY = 0.5;

interface BottomSheetProps {
  title?: string;
  subtitle?: ReactNode;
  onClose: () => void;
  children: (close: () => void) => ReactNode;
}

export function BottomSheet({ title, subtitle, onClose, children }: BottomSheetProps) {
  const [closing, setClosing] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ startY: 0, startTime: 0 });
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => () => clearTimeout(timer.current), []);

  const requestClose = () => {
    if (closing) return;
    setClosing(true);
    setDragging(false);
    setDragOffset(0);
    timer.current = setTimeout(onClose, EXIT_MS);
  };

  const onDragStart = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (closing) return;
    if ((event.target as Element).closest("button, input, a")) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { startY: event.clientY, startTime: performance.now() };
    setDragging(true);
  };

  const onDragMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || closing) return;
    setDragOffset(Math.max(0, event.clientY - drag.current.startY));
  };

  const onDragEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging || closing) return;
    setDragging(false);
    const distance = event.clientY - drag.current.startY;
    const elapsed = performance.now() - drag.current.startTime;
    const velocity = elapsed > 0 ? distance / elapsed : 0;
    if (distance > DISMISS_DISTANCE || velocity > DISMISS_VELOCITY) requestClose();
    else setDragOffset(0);
  };

  return (
    <div className={styles.overlay}>
      <div className={cx(styles.scrim, closing && styles.scrimClosing)} onClick={requestClose} />
      <div
        className={cx(styles.sheet, dragging && styles.sheetDragging, closing && styles.sheetClosing)}
        style={!closing && dragOffset > 0 ? { transform: `translateY(${dragOffset}px)` } : undefined}
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
      >
        <div className={styles.grabber} />
        {title && <div className={styles.title}>{title}</div>}
        {subtitle && <div className={styles.subtitle}>{subtitle}</div>}
        <div className={styles.body}>{children(requestClose)}</div>
      </div>
    </div>
  );
}
