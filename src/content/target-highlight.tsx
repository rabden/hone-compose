import { useEffect } from "react";
import type { EditableAdapter } from "./adapters";
import type { TargetHighlightMode } from "./target-text-highlight";
import {
  applyTargetTextHighlight,
  clearTargetTextHighlight,
  getHighlightFieldTheme,
} from "./target-text-highlight";
import { HighlightShimmer } from "./highlight-shimmer";

interface TargetHighlightProps {
  adapter: EditableAdapter | null;
  start: number;
  end: number;
  mode: TargetHighlightMode;
  active: boolean;
  onRestoreSelection?: () => void;
}

export function TargetHighlight({
  adapter,
  start,
  end,
  mode,
  active,
  onRestoreSelection,
}: TargetHighlightProps) {
  useEffect(() => {
    if (!active || !adapter || end <= start) {
      clearTargetTextHighlight();
      onRestoreSelection?.();
      return;
    }

    applyTargetTextHighlight(adapter, start, end, "idle");

    return () => {
      clearTargetTextHighlight();
      onRestoreSelection?.();
    };
  }, [adapter, start, end, active, onRestoreSelection]);

  if (!active || !adapter || end <= start) {
    return null;
  }

  if (mode === "loading") {
    return (
      <HighlightShimmer
        adapter={adapter}
        start={start}
        end={end}
        onDarkField={getHighlightFieldTheme(adapter)}
      />
    );
  }

  return null;
}
