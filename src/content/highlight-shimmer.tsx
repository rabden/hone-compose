import { useEffect, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { getSpanClientRects } from "./span-geometry";
import type { EditableAdapter } from "./adapters";

interface HighlightShimmerProps {
  adapter: EditableAdapter;
  start: number;
  end: number;
  onDarkField: boolean;
}

export function HighlightShimmer({
  adapter,
  start,
  end,
  onDarkField,
}: HighlightShimmerProps) {
  const rects = useShimmerRects(adapter, start, end);

  if (rects.length === 0) return null;

  return (
    <>
      {rects.map((rect, i) => (
        <div
          key={`shimmer-${i}`}
          aria-hidden
          className={cn(
            "hone-highlight-shimmer pointer-events-none fixed",
            onDarkField && "hone-highlight-shimmer--on-dark",
          )}
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            zIndex: 2147483644,
          }}
        />
      ))}
    </>
  );
}

function rectsAreEqual(a: DOMRect[], b: DOMRect[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const ra = a[i];
    const rb = b[i];
    // Allow small differences (1px) to account for sub-pixel rendering
    if (
      Math.abs(ra.top - rb.top) > 1 ||
      Math.abs(ra.left - rb.left) > 1 ||
      Math.abs(ra.width - rb.width) > 1 ||
      Math.abs(ra.height - rb.height) > 1
    ) {
      return false;
    }
  }
  return true;
}

function useShimmerRects(
  adapter: EditableAdapter,
  start: number,
  end: number,
) {
  const [rects, setRects] = useState<DOMRect[]>([]);
  const prevRectsRef = useRef<DOMRect[]>([]);

  useEffect(() => {
    if (end <= start) {
      setRects([]);
      prevRectsRef.current = [];
      return;
    }

    const measure = () => {
      try {
        const newRects = getSpanClientRects(adapter, start, end);
        // Only update if rects have meaningfully changed
        if (!rectsAreEqual(prevRectsRef.current, newRects)) {
          setRects(newRects);
          prevRectsRef.current = newRects;
        }
      } catch {
        setRects([]);
        prevRectsRef.current = [];
      }
    };

    measure();
    const onScroll = () => measure();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    const el = adapter.getElement();
    el.addEventListener("scroll", onScroll, { passive: true });
    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(measure)
        : null;
    ro?.observe(el);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
      el.removeEventListener("scroll", onScroll);
      ro?.disconnect();
    };
  }, [adapter, start, end]);

  return rects;
}
