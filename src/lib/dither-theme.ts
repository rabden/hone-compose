import {
  type DitherColor,
  type Rgb,
  PALETTE,
} from "@/components/dither-kit/palette";

/**
 * Re-points the Dither Kit palette at the app theme's chart colors
 * (`--chart-1..5` in index.css), so the dithered charts follow the theme in
 * both light and dark mode instead of the kit's fixed palette. The kit's
 * canvases read `PALETTE` at paint time, so re-applying (and re-rendering via
 * a `replayToken` bump) re-themes them live.
 */

// Kit palette slots repurposed as themed chart colors, in --chart-N order.
const SLOTS: DitherColor[] = ["grey", "blue", "purple", "green", "orange"];

let probeEl: HTMLSpanElement | null = null;
let convertCtx: CanvasRenderingContext2D | null = null;

/**
 * Resolve a CSS color that may contain `var()` / `color-mix()` into a
 * concrete color string (typically `oklch(...)`) via the CSSOM — canvas
 * fillStyle can't resolve `var()` on its own.
 */
function resolveCssColor(css: string): string {
  if (!probeEl) {
    probeEl = document.createElement("span");
    probeEl.style.position = "absolute";
    probeEl.style.visibility = "hidden";
    probeEl.style.pointerEvents = "none";
    document.body.appendChild(probeEl);
  }
  probeEl.style.color = css;
  return getComputedStyle(probeEl).color;
}

/** Convert any concrete CSS color string (incl. oklch) to sRGB bytes. */
function colorStringToRgbBytes(color: string): Rgb {
  if (!convertCtx) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    convertCtx = canvas.getContext("2d");
  }
  const ctx = convertCtx;
  if (!ctx) return [92, 92, 100];
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return [r, g, b];
}

/** Kit palette slot for the Nth theme chart color (0-based, wraps). */
export function chartSlot(index: number): DitherColor {
  return SLOTS[index % SLOTS.length];
}

/** The theme var itself — for DOM elements (legend chips), not canvas. */
export function chartCss(index: number): string {
  return `var(--chart-${(index % SLOTS.length) + 1})`;
}

/** Re-point the kit palette seeds at `--chart-1..5`. Safe to call repeatedly. */
export function applyDitherTheme(): void {
  // The .dark class mirrors this media query (see options/main.tsx) — prefer
  // the class so manual flips are picked up, and fall back to the query for
  // the very first apply (which may run before that effect has).
  const isDark =
    document.documentElement.classList.contains("dark") ||
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const lineMix = isDark ? "white" : "black";
  const starMix = isDark ? "white" : "black";

  SLOTS.forEach((slot, index) => {
    const v = `var(--chart-${index + 1})`;
    PALETTE[slot] = {
      fill: colorStringToRgbBytes(resolveCssColor(v)),
      line: colorStringToRgbBytes(
        resolveCssColor(`color-mix(in oklab, ${v} 78%, ${lineMix})`),
      ),
      star: colorStringToRgbBytes(
        resolveCssColor(`color-mix(in oklab, ${v} 60%, ${starMix})`),
      ),
    };
  });
}

// Theme the palette as soon as this module loads (before first chart paint);
// DashboardTab re-applies on theme flips and bumps its replay token.
applyDitherTheme();
