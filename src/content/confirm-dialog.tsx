import type { RefObject } from "react";
import { CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  message: string;
  top: number;
  left: number;
  width: number;
  panelRef: RefObject<HTMLDivElement | null>;
  onConfirm: () => void;
  onCancel: () => void;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}

const pillButtonClass =
  "h-6 rounded-full px-2.5 text-[10px] font-medium gap-1 [&_svg]:size-3";

export function ConfirmDialog({
  message,
  top,
  left,
  width,
  panelRef,
  onConfirm,
  onCancel,
  onPointerEnter,
  onPointerLeave,
}: ConfirmDialogProps) {
  return (
    <div
      ref={panelRef}
      role="alertdialog"
      aria-labelledby="hone-confirm-title"
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
      onMouseDown={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      className={cn(
        "hone-surface hone-fade-in fixed flex flex-col gap-2 p-2.5",
        "antialiased outline-none select-none",
      )}
      style={{
        top: `${top}px`,
        left: `${left}px`,
        width: `${width}px`,
        pointerEvents: "auto",
        zIndex: 2147483647,
      }}
    >
      <span
        className="absolute top-2 right-2.5 text-[9px] font-medium tracking-wide text-muted-foreground/35 pointer-events-none"
        aria-hidden
      >
        Esc
      </span>

      <p
        id="hone-confirm-title"
        className="pr-6 text-[11px] leading-relaxed text-foreground"
      >
        {message}
      </p>

      <div className="flex items-center justify-end gap-1 pt-0.5">
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className={pillButtonClass}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="default"
          size="xs"
          className={cn(pillButtonClass, "bg-primary text-primary-foreground")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={onConfirm}
        >
          <CornerDownLeft strokeWidth={2.25} aria-hidden />
          Yes
        </Button>
      </div>
    </div>
  );
}
