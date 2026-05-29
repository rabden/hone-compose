import { Check, AlertCircle, ChevronUp, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function TriggerDot({
  dotRef,
  bottom,
  right,
  size,
  loading = false,
  onMouseDown,
}: {
  dotRef: React.RefObject<HTMLButtonElement | null>;
  bottom: number;
  right: number;
  size: number;
  loading?: boolean;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      ref={dotRef}
      aria-label={loading ? "Hone is working" : "Open Hone actions"}
      aria-busy={loading}
      onMouseDown={onMouseDown}
      disabled={loading}
      className={cn(
        "fixed flex items-center justify-center rounded-full",
        "bg-primary text-primary-foreground shadow-md",
        "ring-2 ring-primary/35",
        "transition-[transform,box-shadow] duration-150 ease-out",
        !loading && "hover:scale-105 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        loading && "cursor-wait",
      )}
      style={{
        bottom: `${bottom}px`,
        right: `${right}px`,
        width: size,
        height: size,
        pointerEvents: "auto",
        zIndex: 2147483647,
      }}
    >
      {loading ? (
        <Loader2
          className="hone-dot-loading size-2.5 shrink-0"
          strokeWidth={2.5}
          aria-hidden
        />
      ) : (
        <ChevronUp className="size-2.5 shrink-0" strokeWidth={2.5} aria-hidden />
      )}
    </button>
  );
}

export function OverlayToast({
  message,
  type,
}: {
  message: string;
  type: "success" | "error";
}) {
  const isSuccess = type === "success";

  return (
    <div
      role="status"
      className={cn(
        "hone-surface hone-fade-in fixed bottom-6 right-6 flex items-center gap-2",
        "px-3 py-2 text-xs font-medium antialiased",
        isSuccess
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-destructive",
      )}
      style={{ pointerEvents: "auto", zIndex: 2147483647 }}
    >
      {isSuccess ? (
        <Check className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
      ) : (
        <AlertCircle className="size-3.5 shrink-0" strokeWidth={2.5} aria-hidden />
      )}
      {message}
    </div>
  );
}
