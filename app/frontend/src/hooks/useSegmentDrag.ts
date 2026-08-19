import { type PointerEvent as ReactPointerEvent, type RefObject, useRef, useState } from "react";

interface SegmentDrag {
  offset: number | null;
  handlers: {
    onPointerDown: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: ReactPointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: ReactPointerEvent<HTMLDivElement>) => void;
  };
}

export function useSegmentDrag(
  boxRef: RefObject<HTMLDivElement>,
  count: number,
  padding: number,
  activeIndex: number,
  onIndex: (index: number) => void,
  onScrub?: (position: number | null) => void,
): SegmentDrag {
  const grab = useRef(0);
  const [offset, setOffset] = useState<number | null>(null);

  const metrics = () => {
    const box = boxRef.current;
    if (!box) return null;
    const rect = box.getBoundingClientRect();
    const span = (rect.width - padding * 2) / count;
    return { left: rect.left + padding, span, limit: (count - 1) * span };
  };

  const move = (clientX: number, from: number) => {
    const size = metrics();
    if (!size) return;
    const position = Math.max(0, Math.min(size.limit, clientX - size.left - from));
    setOffset(position);
    onScrub?.(position / size.span);
    onIndex(Math.max(0, Math.min(count - 1, Math.round(position / size.span))));
  };

  return {
    offset,
    handlers: {
      onPointerDown: (event) => {
        const size = metrics();
        if (!size) return;
        boxRef.current?.setPointerCapture(event.pointerId);
        const thumbLeft = activeIndex * size.span;
        const inside = event.clientX - size.left - thumbLeft;
        grab.current = inside >= 0 && inside <= size.span ? inside : size.span / 2;
        move(event.clientX, grab.current);
      },
      onPointerMove: (event) => {
        if (offset !== null) move(event.clientX, grab.current);
      },
      onPointerUp: () => {
        setOffset(null);
        onScrub?.(null);
      },
      onPointerCancel: () => {
        setOffset(null);
        onScrub?.(null);
      },
    },
  };
}
