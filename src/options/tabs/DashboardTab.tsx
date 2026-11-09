import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@/components/ui/hugeicons";
import {
  AiGenerativeIcon,
  Analytics01Icon,
  ArrowUpRight01Icon,
  Calendar03Icon,
  EllipsisIcon,
  FireIcon,
  TextFontIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/material-design-3-button";
import { HistoryList } from "@/components/history-list";
import { Ripple } from "@/components/ui/ripple";
import { renderActionIcon } from "@/lib/action-icons";
import { getActionLabel } from "@/lib/shortcuts";
import { getProviderLabel } from "../../providers";
import type { CustomAction } from "../../content/storage";
import { AreaChart } from "@/components/dither-kit/area-chart";
import { Area } from "@/components/dither-kit/area";
import { Grid } from "@/components/dither-kit/grid";
import { YAxis } from "@/components/dither-kit/y-axis";
import { ActiveDot } from "@/components/dither-kit/dot";
import { Tooltip as DitherTooltip } from "@/components/dither-kit/tooltip";
import { PieChart } from "@/components/dither-kit/pie-chart";
import { Pie } from "@/components/dither-kit/pie";
import {
  applyDitherTheme,
  chartCss,
  chartSlot,
} from "@/lib/dither-theme";

interface HistoryItem {
  id: string;
  timestamp: number;
  url: string;
  action: string;
  originalText: string;
  rewrittenText: string;
  provider: string;
  model: string;
}

type OptionsTab =
  | "dashboard"
  | "api"
  | "shortcut"
  | "history"
  | "actions"
  | "customizations";

interface DashboardTabProps {
  setActiveTab: (tab: OptionsTab) => void;
  history: HistoryItem[];
  actionConfigs: CustomAction[];
  onOpenHistoryItem: (item: HistoryItem) => void;
}

const RANGES = [7, 30, 90] as const;
type Range = (typeof RANGES)[number];

const compact = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function shortDate(d: Date): string {
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

function monthYear(d: Date): string {
  return d.toLocaleDateString([], { month: "short", year: "numeric" });
}

interface TrendPoint {
  key: string;
  date: Date;
  count: number;
}

function TrendChart({
  data,
  replayToken,
}: {
  data: TrendPoint[];
  replayToken: number;
}) {
  const rows = useMemo(
    () =>
      data.map((point) => ({
        label: shortDate(point.date),
        count: point.count,
      })),
    [data],
  );
  const config = useMemo(
    () => ({ count: { label: "Rewrites", color: chartSlot(0) } }),
    [],
  );

  return (
    <div className="flex flex-col gap-2 text-foreground">
      <div className="h-40 w-full">
        <AreaChart
          data={rows}
          config={config}
          margins={{ top: 8, right: 8, bottom: 4, left: 30 }}
          replayToken={replayToken}
        >
          <Grid horizontal />
          <Area dataKey="count" variant="gradient">
            <ActiveDot r={3} />
          </Area>
          <YAxis tickCount={3} />
          <DitherTooltip
            labelKey="label"
            valueFormatter={(value) => `${value} rewrites`}
          />
        </AreaChart>
      </div>
      <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground/40 select-none">
        <span>{shortDate(data[0].date)}</span>
        <span>{shortDate(data[Math.floor(data.length / 2)].date)}</span>
        <span>{shortDate(data[data.length - 1].date)}</span>
      </div>
    </div>
  );
}

const HEAT_LEVELS = [
  "bg-foreground/[0.05]",
  "bg-foreground/[0.18]",
  "bg-foreground/[0.32]",
  "bg-foreground/[0.5]",
  "bg-foreground/[0.72]",
];

function heatLevel(count: number, max: number): number {
  if (count <= 0) return 0;
  if (max <= 1) return 2;
  const ratio = count / max;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

interface HeatCell {
  key: string;
  date: Date;
  count: number;
}

const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

function Heatmap({ weeks }: { weeks: (HeatCell | null)[][] }) {
  const max = weeks.reduce(
    (peak, week) =>
      week.reduce(
        (weekPeak, cell) => (cell ? Math.max(weekPeak, cell.count) : weekPeak),
        peak,
      ),
    0,
  );

  const monthLabels = weeks.map((week, index) => {
    const firstOfMonth = week.find(
      (cell): cell is HeatCell =>
        cell !== null && cell.date.getDate() === 1,
    );
    if (firstOfMonth) {
      return firstOfMonth.date.toLocaleDateString([], { month: "short" });
    }
    if (index === 0) {
      const first = week.find((cell): cell is HeatCell => cell !== null);
      return first
        ? first.date.toLocaleDateString([], { month: "short" })
        : "";
    }
    return "";
  });

  return (
    <div className="flex w-max flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="w-6 shrink-0" />
        <div className="grid grid-flow-col auto-cols-[12px] gap-[3px]">
          {monthLabels.map((label, index) => (
            <span
              key={`month-${index}`}
              className="h-3 text-[9px] leading-none text-muted-foreground/40 whitespace-nowrap select-none"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-start gap-1.5">
        <div className="grid w-6 shrink-0 grid-rows-7 gap-[3px]">
          {WEEKDAYS.map((label, index) => (
            <span
              key={`day-${index}`}
              className="flex h-3 items-center justify-end pr-0.5 text-[8px] leading-none text-muted-foreground/40 select-none"
            >
              {label}
            </span>
          ))}
        </div>
        <div className="grid grid-rows-7 grid-flow-col auto-cols-[12px] gap-[3px]">
          {weeks.map((week, w) =>
            week.map((cell, d) =>
              cell ? (
                <span
                  key={`${w}-${d}`}
                  title={`${shortDate(cell.date)} · ${cell.count} transformation${cell.count === 1 ? "" : "s"}`}
                  className={cn(
                    "size-3 rounded-[3px] transition-colors",
                    HEAT_LEVELS[heatLevel(cell.count, max)],
                  )}
                />
              ) : (
                <span key={`${w}-${d}`} className="size-3" />
              ),
            ),
          )}
        </div>
      </div>
    </div>
  );
}

interface BreakdownRow {
  label: string;
  count: number;
}

interface ActionRow extends BreakdownRow {
  actionId: string;
  icon?: string;
  aggregate?: boolean;
}

interface SiteRow extends BreakdownRow {
  daily: number[];
  origin?: string;
  aggregate?: boolean;
}

function share(count: number, total: number): number {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex items-center justify-center py-6 text-[10px] text-muted-foreground/40 text-center leading-relaxed">
      {children}
    </div>
  );
}

function EngineBreakdown({
  rows,
  total,
  replayToken,
}: {
  rows: BreakdownRow[];
  total: number;
  replayToken: number;
}) {
  const pieRows = useMemo(
    () => rows.map((row) => ({ name: row.label, runs: row.count })),
    [rows],
  );
  const pieConfig = useMemo(
    () =>
      Object.fromEntries(
        rows.map((row, index) => [
          row.label,
          { label: row.label, color: chartSlot(index) },
        ]),
      ),
    [rows],
  );

  if (rows.length === 0) {
    return <EmptyNote>No provider activity in this range.</EmptyNote>;
  }

  return (
    <div className="flex flex-col items-center gap-5 flex-1 justify-center w-full">
      <div className="relative size-28 shrink-0">
        <PieChart
          data={pieRows}
          config={pieConfig}
          dataKey="runs"
          nameKey="name"
          innerRadius={0.64}
          margins={{ top: 0, right: 0, bottom: 0, left: 0 }}
          className="size-full"
          replayToken={replayToken}
        >
          <Pie variant="gradient" />
          <DitherTooltip
            hideHeading
            valueFormatter={(value) => `${value} runs`}
          />
        </PieChart>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-light text-foreground tabular-nums leading-none">
            {compact.format(total)}
          </span>
          <span className="mt-1 text-[8px] font-semibold uppercase tracking-widest text-muted-foreground/45">
            runs
          </span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 w-full min-w-0">
        {rows.map((row, index) => (
          <div
            key={row.label}
            className="flex items-center gap-2 min-w-0"
          >
            <span
              className="size-1.5 rounded-full shrink-0"
              style={{ background: chartCss(index) }}
            />
            <span
              className="text-[11px] text-foreground/80 truncate flex-1"
              title={row.label}
            >
              {row.label}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground/50 tabular-nums shrink-0">
              {row.count} · {share(row.count, total)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionBreakdown({
  rows,
  total,
}: {
  rows: ActionRow[];
  total: number;
}) {
  if (rows.length === 0) {
    return <EmptyNote>No action activity in this range.</EmptyNote>;
  }

  return (
    <div className="flex flex-col gap-3.5">
      {rows.map((row, index) => {
        const pct = share(row.count, total);
        const top = index === 0;
        return (
          <div key={row.label} className="flex items-center gap-2.5 min-w-0">
            <span
              className={cn(
                "w-4 shrink-0 text-[9px] font-mono tabular-nums",
                top ? "text-foreground/65" : "text-muted-foreground/30",
              )}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              className={cn(
                "size-7 rounded-lg flex items-center justify-center shrink-0 border",
                top
                  ? "border-border/30 bg-foreground/[0.07] text-foreground/85"
                  : "border-border/15 bg-foreground/[0.025] text-foreground/50",
              )}
            >
              {row.aggregate ? (
                <HugeiconsIcon icon={EllipsisIcon} className="size-3.5" />
              ) : (
                renderActionIcon(row.icon, { size: 13 })
              )}
            </span>
            <div className="flex flex-col gap-1 flex-1 min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <span
                  className={cn(
                    "text-[11px] truncate",
                    top
                      ? "text-foreground font-medium"
                      : "text-foreground/75",
                  )}
                  title={row.label}
                >
                  {row.label}
                </span>
                <span className="text-[10px] font-mono tabular-nums text-muted-foreground/50 shrink-0">
                  {row.count} · {pct}%
                </span>
              </div>
              <div className="h-1 rounded-full bg-foreground/[0.05] overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500 ease-out",
                    top ? "bg-foreground/55" : "bg-foreground/25",
                  )}
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// Smooth SVG sparkline for the site rows — the dither texture reads as noise
// at this size, so these use a plain line + soft fill.
function Sparkline({ values }: { values: number[] }) {
  const W = 64;
  const H = 18;
  const max = Math.max(1, ...values);
  const x = (i: number) =>
    values.length <= 1 ? W / 2 : (i / (values.length - 1)) * W;
  const y = (v: number) => H - 2 - (v / max) * (H - 6);
  const line = values
    .map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-16 h-4 shrink-0 text-chart-1"
      aria-hidden
    >
      <path d={area} fill="currentColor" fillOpacity={0.05} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeOpacity={0.3}
        strokeWidth={1.2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

// Real favicon from Chrome's local cache via the extension `_favicon`
// endpoint — no network round-trip, falls back to a letter monogram.
function SiteFavicon({
  origin,
  fallback,
  size = "md",
}: {
  origin?: string;
  fallback: string;
  size?: "sm" | "md";
}) {
  const [failed, setFailed] = useState(false);

  if (!origin || failed) {
    return (
      <span
        className={cn(
          "font-medium uppercase text-foreground/50 leading-none",
          size === "sm" ? "text-[8px]" : "text-[10px]",
        )}
      >
        {fallback.charAt(0)}
      </span>
    );
  }

  return (
    <img
      src={`chrome-extension://${chrome.runtime.id}/_favicon/?pageUrl=${encodeURIComponent(origin)}&size=32`}
      alt=""
      onError={() => setFailed(true)}
      draggable={false}
      className={cn(
        "rounded-[3px] object-contain shrink-0",
        size === "sm" ? "size-3" : "size-4",
      )}
    />
  );
}

function SiteBreakdown({
  rows,
  total,
}: {
  rows: SiteRow[];
  total: number;
}) {
  if (rows.length === 0) {
    return <EmptyNote>No site activity in this range.</EmptyNote>;
  }

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2.5 min-w-0">
          <span className="size-7 rounded-lg border border-border/15 bg-foreground/[0.025] flex items-center justify-center shrink-0">
            {row.aggregate ? (
              <HugeiconsIcon icon={EllipsisIcon} className="size-3.5" />
            ) : (
              <SiteFavicon origin={row.origin} fallback={row.label} />
            )}
          </span>
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span
              className="text-[11px] text-foreground/75 truncate"
              title={row.label}
            >
              {row.label}
            </span>
            <span className="text-[9px] font-mono tabular-nums text-muted-foreground/40">
              {row.count} rewrite{row.count === 1 ? "" : "s"} ·{" "}
              {share(row.count, total)}%
            </span>
          </div>
          <Sparkline values={row.daily} />
        </div>
      ))}
    </div>
  );
}

type StatPosition = "first" | "second" | "third" | "fourth";

const STAT_CORNERS: Record<StatPosition, string> = {
  first:
    "rounded-tl-3xl rounded-tr-md rounded-bl-md rounded-br-md md:rounded-bl-3xl",
  second: "rounded-tl-md rounded-tr-3xl rounded-bl-md rounded-br-md md:rounded-tr-md",
  third: "rounded-tl-md rounded-tr-md rounded-bl-3xl rounded-br-md md:rounded-bl-md",
  fourth: "rounded-tl-md rounded-tr-md rounded-bl-md rounded-br-3xl md:rounded-tr-3xl",
};

// Range segmented control — same idioms as Tag / RadioCardGroup: grouped
// bg-background tiles, edge-corner rounding, and the shared press morph. The
// active segment flexes wider while the neighbours squeeze, and each segment
// carries a Material ripple.
function RangePicker({
  value,
  onChange,
  className,
}: {
  value: Range;
  onChange: (value: Range) => void;
  className?: string;
}) {
  const [pressedId, setPressedId] = useState<string | null>(null);
  const pressTimerRef = useRef<number | null>(null);
  const startPress = (id: string) => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setPressedId(id);
  };
  const endPress = () => {
    if (pressTimerRef.current !== null)
      window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = window.setTimeout(() => setPressedId(null), 180);
  };

  return (
    <div className={cn("flex w-44 gap-0.5", className)}>
      {RANGES.map((range, index) => {
        const isActive = value === range;
        const id = String(range);
        return (
          <button
            key={range}
            type="button"
            onClick={() => onChange(range)}
            onPointerDown={() => startPress(id)}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            data-pressed={pressedId === id || isActive}
            data-active={isActive}
            style={{ flexGrow: isActive ? 1.6 : 1 }}
            className={cn(
              "relative flex basis-0 items-center justify-center min-w-0 py-2 text-[10px] font-medium overflow-hidden select-none cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
              "transition-[flex-grow,background-color,color,border-radius] duration-[600ms] ease-[cubic-bezier(0.2,0.8,0.2,1.2)]",
              index === 0 && "rounded-l-3xl rounded-r-md",
              index === RANGES.length - 1 && "rounded-r-3xl rounded-l-md",
              index !== 0 && index !== RANGES.length - 1 && "rounded-md",
              "data-[pressed=true]:delay-100 data-[pressed=true]:rounded-[36px]",
              isActive
                ? "bg-background text-foreground"
                : "bg-background text-muted-foreground hover:bg-background/50 hover:text-foreground",
            )}
          >
            <Ripple />
            <span className="relative z-10 pointer-events-none tabular-nums">
              {range}d
            </span>
          </button>
        );
      })}
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
  position,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  position: StatPosition;
}) {
  return (
    <div
      className={cn(
        "flex min-h-[112px] flex-col justify-between bg-background p-4 select-none",
        STAT_CORNERS[position],
      )}
    >
      <span className="flex items-center gap-1.5">
        {icon}
        <span className="text-[9px] font-semibold uppercase leading-none tracking-[0.05em] text-muted-foreground/60">
          {label}
        </span>
      </span>
      <span className="flex flex-col items-end gap-1.5">
        <span className="self-start text-3xl font-semibold leading-none tracking-tight text-foreground tabular-nums">
          {value}
        </span>
        <span className="text-[10px] leading-snug text-right text-muted-foreground/50 [text-wrap:pretty]">
          {sub}
        </span>
      </span>
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border border-border/20 bg-foreground/[0.01] p-5 flex flex-col gap-4 min-w-0",
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold text-foreground">{title}</h2>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5 truncate">
            {subtitle}
          </p>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export default function DashboardTab({
  setActiveTab,
  history,
  actionConfigs,
  onOpenHistoryItem,
}: DashboardTabProps) {
  const [range, setRange] = useState<Range>(30);

  // The kit palette is re-pointed at the theme's --chart-1..5 (see
  // lib/dither-theme). Bump the replay token so canvases repaint when the
  // theme flips light ⇄ dark (media query or manual class toggle).
  const [ditherToken, setDitherToken] = useState(0);
  useEffect(() => {
    const apply = () => {
      applyDitherTheme();
      setDitherToken((token) => token + 1);
    };
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", apply);
    const observer = new MutationObserver(apply);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    apply();
    return () => {
      mq.removeEventListener("change", apply);
      observer.disconnect();
    };
  }, []);

  // Pure minute clock — relative windows stay honest without impure render
  // calls (same pattern the activity feed used).
  const clockMinute = useSyncExternalStore(
    (onChange) => {
      const id = window.setInterval(onChange, 60_000);
      return () => window.clearInterval(id);
    },
    () => Math.floor(Date.now() / 60_000),
    () => 0,
  );
  const clock = clockMinute * 60_000;

  const today = useMemo(() => {
    const d = new Date(clock);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [clock]);

  const trend = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const item of history) {
      const key = dayKey(new Date(item.timestamp));
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    const points: TrendPoint[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const key = dayKey(date);
      points.push({ key, date, count: byDay.get(key) ?? 0 });
    }
    return points;
  }, [history, range, today]);

  const rangeStart = trend[0].date.getTime();
  const peak = useMemo(
    () => trend.reduce((max, p) => Math.max(max, p.count), 0),
    [trend],
  );
  const peakPoint = useMemo(
    () => trend.reduce((best, p) => (p.count > best.count ? p : best), trend[0]),
    [trend],
  );

  const inRange = useMemo(
    () => history.filter((item) => item.timestamp >= rangeStart),
    [history, rangeStart],
  );
  const rangeTotal = inRange.length;

  const wordsRewritten = useMemo(
    () =>
      inRange.reduce((sum, item) => sum + wordCount(item.rewrittenText), 0),
    [inRange],
  );
  const avgWords =
    rangeTotal > 0 ? Math.round(wordsRewritten / rangeTotal) : 0;
  const activeDays = trend.filter((p) => p.count > 0).length;

  const streak = useMemo(() => {
    if (clock === 0) return 0;
    const days = new Set(
      history.map((item) => dayKey(new Date(item.timestamp))),
    );
    const cursor = new Date(today);
    if (!days.has(dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (days.has(dayKey(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [history, today, clock]);

  // 12-month GitHub-style heatmap, Sunday-aligned columns.
  const heatWeeks = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const item of history) {
      const key = dayKey(new Date(item.timestamp));
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    const end = new Date(today);
    const start = new Date(today);
    start.setDate(start.getDate() - start.getDay());
    start.setDate(start.getDate() - 52 * 7);

    const weeks: (HeatCell | null)[][] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const week: (HeatCell | null)[] = [];
      for (let d = 0; d < 7; d++) {
        const date = new Date(cursor);
        date.setDate(cursor.getDate() + d);
        if (date > end) {
          week.push(null);
        } else {
          week.push({
            key: dayKey(date),
            date,
            count: byDay.get(dayKey(date)) ?? 0,
          });
        }
      }
      weeks.push(week);
      cursor.setDate(cursor.getDate() + 7);
    }
    return weeks;
  }, [history, today]);

  const heatRangeLabel = useMemo(() => {
    const first = heatWeeks[0]?.find((c): c is HeatCell => c !== null);
    if (!first) return "Last 12 months";
    return `${monthYear(first.date)} – ${monthYear(today)}`;
  }, [heatWeeks, today]);

  const providerRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of inRange) {
      counts.set(item.provider, (counts.get(item.provider) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([provider, count]) => ({
        label: getProviderLabel(provider),
        count,
      }))
      .sort((a, b) => b.count - a.count);
  }, [inRange]);

  const actionRows = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of inRange) {
      counts.set(item.action, (counts.get(item.action) ?? 0) + 1);
    }
    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
    const top: ActionRow[] = sorted.slice(0, 5).map(([actionId, count]) => ({
      actionId,
      label: getActionLabel(actionId, actionConfigs),
      icon: actionConfigs.find((config) => config.id === actionId)?.icon,
      count,
    }));
    const rest = sorted.slice(5);
    if (rest.length > 0) {
      top.push({
        actionId: "__other__",
        label: `${rest.length} other action${rest.length === 1 ? "" : "s"}`,
        count: rest.reduce((sum, [, count]) => sum + count, 0),
        aggregate: true,
      });
    }
    return top;
  }, [inRange, actionConfigs]);

  const siteRows = useMemo(() => {
    const dayIndex = new Map<string, number>();
    trend.forEach((point, index) => dayIndex.set(point.key, index));

    const counts = new Map<
      string,
      { count: number; daily: number[]; origin?: string }
    >();
    for (const item of inRange) {
      let host = "Unknown page";
      let origin: string | undefined;
      try {
        const parsed = new URL(item.url);
        host = parsed.hostname.replace(/^www\./, "") || host;
        origin = parsed.origin;
      } catch {
        // Keep the fallback label for malformed URLs.
      }
      const entry = counts.get(host) ?? {
        count: 0,
        daily: Array.from({ length: range }, () => 0),
        origin,
      };
      entry.count += 1;
      if (!entry.origin && origin) entry.origin = origin;
      const index = dayIndex.get(dayKey(new Date(item.timestamp)));
      if (index !== undefined) entry.daily[index] += 1;
      counts.set(host, entry);
    }

    const sorted = [...counts.entries()].sort(
      (a, b) => b[1].count - a[1].count,
    );
    const top: SiteRow[] = sorted.slice(0, 5).map(([label, entry]) => ({
      label,
      count: entry.count,
      daily: entry.daily,
      origin: entry.origin,
    }));
    const rest = sorted.slice(5);
    if (rest.length > 0) {
      const daily = Array.from({ length: range }, () => 0);
      for (const [, entry] of rest) {
        entry.daily.forEach((value, index) => {
          daily[index] += value;
        });
      }
      top.push({
        label: `${rest.length} other site${rest.length === 1 ? "" : "s"}`,
        count: rest.reduce((sum, [, entry]) => sum + entry.count, 0),
        daily,
        aggregate: true,
      });
    }
    return top;
  }, [inRange, trend, range]);

  const recentItems = useMemo(
    () =>
      [...history].sort((a, b) => b.timestamp - a.timestamp).slice(0, 5),
    [history],
  );

  const rangeLabel =
    range === 7 ? "Last 7 days" : range === 30 ? "Last 30 days" : "Last 90 days";
  const allTimeTotal = history.length;

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 w-full min-w-0 py-4 mx-auto max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-3">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Analytics
          </span>
          <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground leading-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground/80 max-w-2xl leading-relaxed">
            Transformations, engine usage and writing activity — computed
            locally from your rewrite history. Nothing leaves this device.
          </p>
        </div>
        <RangePicker
          value={range}
          onChange={setRange}
          className="shrink-0 mt-1"
        />
      </div>

      {allTimeTotal === 0 ? (
        <div className="py-16 flex flex-col items-center justify-center rounded-lg border border-dashed border-border/40 bg-secondary/5 gap-1.5">
          <HugeiconsIcon
            icon={Analytics01Icon}
            className="size-6 text-muted-foreground/20 mb-1"
          />
          <span className="text-xs text-muted-foreground/60 font-medium">
            No analytics yet
          </span>
          <span className="text-[10px] text-muted-foreground/40 text-center max-w-xs leading-relaxed">
            Charts fill in as you rewrite. Run your first action on any webpage
            and your activity will appear here.
          </span>
          <Button
            variant="ghost"
            size="sm"
            shape="round"
            className="mt-2"
            onClick={() => setActiveTab("actions")}
          >
            Explore Actions Studio
            <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3.5" />
          </Button>
        </div>
      ) : (
        <>
          {/* KPI tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0.5">
            <StatTile
              position="first"
              icon={<HugeiconsIcon icon={AiGenerativeIcon} className="size-3" />}
              label="Transformations"
              value={compact.format(rangeTotal)}
              sub={`${rangeLabel.toLowerCase()} · ${allTimeTotal} all time`}
            />
            <StatTile
              position="second"
              icon={<HugeiconsIcon icon={TextFontIcon} className="size-3" />}
              label="Words rewritten"
              value={compact.format(wordsRewritten)}
              sub={`${avgWords} avg per rewrite`}
            />
            <StatTile
              position="third"
              icon={<HugeiconsIcon icon={Calendar03Icon} className="size-3" />}
              label="Active days"
              value={`${activeDays}`}
              sub={`of ${range} days in range`}
            />
            <StatTile
              position="fourth"
              icon={<HugeiconsIcon icon={FireIcon} className="size-3" />}
              label="Current streak"
              value={`${streak}`}
              sub={streak === 1 ? "day in a row" : "days in a row"}
            />
          </div>

          {/* Trend + heatmap — grouped strip like the KPI tiles */}
          <div className="flex flex-col gap-0.5">
            <ChartCard
              title="Transformations over time"
              subtitle={`${rangeLabel} · daily rewrites`}
              className="rounded-t-3xl rounded-b-md border-0 bg-background"
              action={
                <span className="text-[10px] text-muted-foreground/50 font-mono tabular-nums shrink-0">
                  {peak > 0
                    ? `peak ${peak} · ${shortDate(peakPoint.date)}`
                    : "no activity in range"}
                </span>
              }
            >
              <TrendChart data={trend} replayToken={ditherToken} />
            </ChartCard>

            <ChartCard
              title="Activity heatmap"
              subtitle={heatRangeLabel}
              className="rounded-md border-0 bg-background"
              action={
                <span className="flex items-center gap-1 shrink-0">
                  <span className="text-[9px] text-muted-foreground/40 mr-0.5">
                    Less
                  </span>
                  {HEAT_LEVELS.map((level) => (
                    <span
                      key={level}
                      className={cn("size-3 rounded-[3px]", level)}
                    />
                  ))}
                  <span className="text-[9px] text-muted-foreground/40 ml-0.5">
                    More
                  </span>
                </span>
              }
            >
              <div className="overflow-x-auto">
                <Heatmap weeks={heatWeeks} />
              </div>
            </ChartCard>

            {/* Breakdowns — same grouped strip: only the group's four outer
                corners are highly rounded. */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-0.5">
              <ChartCard
                title="Engine usage"
                subtitle={`API providers · ${rangeLabel.toLowerCase()}`}
                className="rounded-md md:rounded-bl-3xl border-0 bg-background"
                action={
                  <span className="text-[10px] text-muted-foreground/50 font-mono tabular-nums shrink-0">
                    {providerRows.length} active
                  </span>
                }
              >
                <EngineBreakdown
                  rows={providerRows}
                  total={rangeTotal}
                  replayToken={ditherToken}
                />
              </ChartCard>

              <ChartCard
                title="Top actions"
                subtitle={`What you use most · ${rangeLabel.toLowerCase()}`}
                className="rounded-md border-0 bg-background"
                action={
                  <span className="text-[10px] text-muted-foreground/50 font-mono tabular-nums shrink-0">
                    {rangeTotal} runs
                  </span>
                }
              >
                <ActionBreakdown rows={actionRows} total={rangeTotal} />
              </ChartCard>

              <ChartCard
                title="Top sites"
                subtitle={`Where you write most · ${rangeLabel.toLowerCase()}`}
                className="rounded-md rounded-br-3xl border-0 bg-background"
                action={
                  <span className="text-[10px] text-muted-foreground/50 font-mono tabular-nums shrink-0">
                    {siteRows.length} listed
                  </span>
                }
              >
                <SiteBreakdown rows={siteRows} total={rangeTotal} />
              </ChartCard>
            </div>
          </div>

          {/* Recent Transformations — same design as the original dashboard */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-foreground">
                  Recent Transformations
                </h2>
                <p className="text-xs text-muted-foreground/70 mt-0.5">
                  Your latest rewrites across webpages
                </p>
              </div>
              {history.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  shape="round"
                  onClick={() => setActiveTab("history")}
                >
                  View all
                  <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3.5" />
                </Button>
              )}
            </div>

            <HistoryList
              items={recentItems}
              onItemClick={onOpenHistoryItem}
              getActionName={(actionCode) =>
                getActionLabel(actionCode, actionConfigs)
              }
              limit={5}
              emptyTitle="No transformations yet"
              emptyDescription="Start using Hone to build your history"
            />
          </div>
        </>
      )}
    </div>
  );
}
