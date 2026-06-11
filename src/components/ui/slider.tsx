"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

const SIZES = {
  default: { trackH: 16, thumbH: 44, outer: 8, inner: 2, iconPad: 8, dotRight: 8 },
  sm:      { trackH: 24, thumbH: 44, outer: 8, inner: 2, iconPad: 12, dotRight: 10 },
  md:      { trackH: 40, thumbH: 52, outer: 12, inner: 4, iconPad: 16, dotRight: 14 },
  lg:      { trackH: 56, thumbH: 68, outer: 16, inner: 4, iconPad: 20, dotRight: 18 },
  xl:      { trackH: 96, thumbH: 108, outer: 28, inner: 6, iconPad: 32, dotRight: 28 },
};

const EASE_STANDARD = "cubic-bezier(0.2, 0, 0, 1)";
const EASE_SPRING = "cubic-bezier(0.175, 0.885, 0.32, 1.275)";
const EASE_ACCELERATE = "cubic-bezier(0.3, 0, 1, 1)";

export interface SliderProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "defaultValue" | "onChange"> {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: keyof typeof SIZES;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  showTooltip?: boolean;
  formatLabel?: (value: number) => string;
  disabled?: boolean;
  minSeparation?: number;
  centered?: boolean;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  ({
    className,
    value,
    defaultValue,
    onValueChange,
    min = 0,
    max = 100,
    step = 0,
    size = "default",
    startIcon,
    endIcon,
    showTooltip = false,
    formatLabel,
    disabled = false,
    minSeparation = 0,
    centered = false,
    ...props
  }, ref) => {
    const [localValues, setLocalValues] = React.useState<number[]>(value || defaultValue || [min]);
    const [draggingIndex, setDraggingIndex] = React.useState<number | null>(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
const [_focusedIndex, setFocusedIndex] = React.useState<number | null>(null);
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
    const [trackWidth, setTrackWidth] = React.useState(0);
    
    const containerRef = React.useRef<HTMLDivElement>(null);
    const trackRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
      if (value !== undefined) setLocalValues(value);
    }, [value]);

    const updateValues = (newValues: number[]) => {
      setLocalValues(newValues);
      onValueChange?.(newValues);
    };

    React.useEffect(() => {
      if (!trackRef.current) return;
      const observer = new ResizeObserver((entries) => {
        setTrackWidth(entries[0].contentRect.width);
      });
      observer.observe(trackRef.current);
      return () => observer.disconnect();
    }, []);

    const getPercentFromEvent = (e: React.PointerEvent | PointerEvent) => {
      if (!trackRef.current) return 0;
      const rect = trackRef.current.getBoundingClientRect();
      const px = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      return px / rect.width;
    };

    const getValueFromPercent = (percent: number) => {
      let val = percent * (max - min) + min;
      if (step > 0) val = Math.round(val / step) * step;
      return val;
    };

    const getClampedValue = (index: number, val: number) => {
      const lowerBound = index === 0 ? min : localValues[index - 1] + minSeparation;
      const upperBound = index === localValues.length - 1 ? max : localValues[index + 1] - minSeparation;
      return Math.max(lowerBound, Math.min(upperBound, val));
    };

    const handlePointerDown = (e: React.PointerEvent) => {
      if (disabled || !trackRef.current || !containerRef.current) return;
      e.preventDefault();
      containerRef.current.setPointerCapture(e.pointerId);
      
      const percent = getPercentFromEvent(e);
      const val = getValueFromPercent(percent);

      const clickPercent = percent * 100;
      let closestIndex = 0;
      let minDiff = Infinity;
      
      const vp = localValues.map(v => ((v - min) / (max - min)) * 100);
      vp.forEach((v, i) => {
        const diff = Math.abs(v - clickPercent);
        if (diff <= minDiff) { 
          minDiff = diff;
          closestIndex = i;
        }
      });

      setDraggingIndex(closestIndex);
      setFocusedIndex(closestIndex);
      
      const newValues = [...localValues];
      newValues[closestIndex] = getClampedValue(closestIndex, val);
      updateValues(newValues);
    };

    const handlePointerMove = (e: React.PointerEvent | PointerEvent) => {
        if (draggingIndex === null) return;
        const percent = getPercentFromEvent(e);
        const val = getValueFromPercent(percent);
        
        let currentIndex = draggingIndex;

        if (localValues.length > 1 && localValues[0] === localValues[1]) {
            if (val < localValues[0]) currentIndex = 0; 
            else if (val > localValues[1]) currentIndex = 1; 
            
            if (currentIndex !== draggingIndex) {
                setDraggingIndex(currentIndex);
                setFocusedIndex(currentIndex);
            }
        }

        const newValues = [...localValues];
        newValues[currentIndex] = getClampedValue(currentIndex, val);
        updateValues(newValues);
    };

    const handlePointerUp = (e: React.PointerEvent | PointerEvent) => {
        if (draggingIndex !== null && containerRef.current) {
            containerRef.current.releasePointerCapture(e.pointerId);
            setDraggingIndex(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
      if (disabled) return;
      const stepAmt = step > 0 ? step : (max - min) / 100;
      let val = localValues[index];

      if (e.key === "ArrowRight" || e.key === "ArrowUp") val += stepAmt;
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") val -= stepAmt;
      else if (e.key === "Home") val = min;
      else if (e.key === "End") val = max;
      else return;

      e.preventDefault();
      const newValues = [...localValues];
      newValues[index] = getClampedValue(index, val);
      updateValues(newValues);
    };

    const currentSize = SIZES[size];
    const HANDLE_PADDING = 6; 
    
    const getThumbWidth = (index: number) => draggingIndex === index ? 2 : 4;
    const getGapOffset = (index: number) => (getThumbWidth(index) / 2) + HANDLE_PADDING;

    const p1 = ((localValues[0] - min) / (max - min)) * 100;
    const p2 = localValues.length > 1 ? ((localValues[1] - min) / (max - min)) * 100 : 100;

    let vp1 = p1;
    let vp2 = p2;
    if (localValues.length > 1) {
      const minVisualGapPx = getGapOffset(0) + getGapOffset(1);
      const minVisualGapPct = trackWidth > 0 ? (minVisualGapPx / trackWidth) * 100 : 4;

      if (p2 - p1 < minVisualGapPct) {
        const mid = (p1 + p2) / 2;
        vp1 = Math.max(0, mid - minVisualGapPct / 2);
        vp2 = Math.min(100, mid + minVisualGapPct / 2);
        if (vp1 === 0) vp2 = minVisualGapPct;
        if (vp2 === 100) vp1 = 100 - minVisualGapPct;
      }
    }

    const isCentered = centered && localValues.length === 1;
    let segments: Array<{ active: boolean, start: number, end: number, leftGap: number, rightGap: number }> = [];

    if (isCentered) {
      const FIXED_GAP = HANDLE_PADDING; 
      if (p1 < 50) {
        segments = [
          { active: false, start: 0, end: p1, leftGap: 0, rightGap: getGapOffset(0) },
          { active: true, start: p1, end: 50, leftGap: getGapOffset(0), rightGap: 0 },
          { active: false, start: 50, end: 100, leftGap: FIXED_GAP, rightGap: 0 },
        ];
      } else if (p1 > 50) {
        segments = [
          { active: false, start: 0, end: 50, leftGap: 0, rightGap: FIXED_GAP },
          { active: true, start: 50, end: p1, leftGap: 0, rightGap: getGapOffset(0) },
          { active: false, start: p1, end: 100, leftGap: getGapOffset(0), rightGap: 0 },
        ];
      } else {
        segments = [
          { active: false, start: 0, end: 50, leftGap: 0, rightGap: getGapOffset(0) },
          { active: false, start: 50, end: 100, leftGap: getGapOffset(0), rightGap: 0 },
        ];
      }
    } else if (localValues.length > 1) {
      segments = [
        { active: false, start: 0, end: vp1, leftGap: 0, rightGap: getGapOffset(0) },
        { active: true, start: vp1, end: vp2, leftGap: getGapOffset(0), rightGap: getGapOffset(1) },
        { active: false, start: vp2, end: 100, leftGap: getGapOffset(1), rightGap: 0 },
      ];
    } else {
      segments = [
        { active: true, start: 0, end: p1, leftGap: 0, rightGap: getGapOffset(0) },
        { active: false, start: p1, end: 100, leftGap: getGapOffset(0), rightGap: 0 },
      ];
    }

    const activeSeg = segments.find(s => s.active);
    const activeClipLeft = activeSeg ? (activeSeg.leftGap > 0 ? `calc(${activeSeg.start}% + ${activeSeg.leftGap}px)` : `${activeSeg.start}%`) : "0%";
    const activeClipRight = activeSeg ? (activeSeg.rightGap > 0 ? `calc(${activeSeg.end}% - ${activeSeg.rightGap}px)` : `${activeSeg.end}%`) : "0%";

    const ticks = [];
    if (step > 0) {
      for (let v = min; v <= max; v += step) ticks.push(v);
    }

    const hasIcons = startIcon || endIcon;
    const renderIcon = (icon: React.ReactNode) => <div className="w-5 h-5 flex items-center justify-center shrink-0">{icon}</div>;

    return (
      <div
        ref={(node) => {
            // @ts-ignore
            containerRef.current = node;
            if (typeof ref === "function") ref(node); else if (ref) ref.current = node;
        }}
        className={cn(
          "relative flex w-full touch-none select-none items-center group",
          disabled && "opacity-50 pointer-events-none",
          className
        )}
        style={{ height: `${currentSize.thumbH}px` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove as any}
        onPointerUp={handlePointerUp as any}
        onPointerCancel={handlePointerUp as any}
        {...props}
      >
        <div 
            className="relative w-full h-full flex items-center" 
            style={{ padding: `0 ${currentSize.thumbH / 2}px` }}
        >
            <div ref={trackRef} className="relative w-full" style={{ height: `${currentSize.trackH}px` }}>
              
              {segments.map((seg, i) => {
                if (seg.start === seg.end) return null;

                const isFirst = seg.start === 0;
                const isLast = seg.end === 100;

                return (
                  <div 
                    key={i} 
                    className="absolute top-0 bottom-0"
                    style={{ left: `${seg.start}%`, right: `${100 - seg.end}%` }}
                  >
                    <div 
                      className={cn(
                          "absolute top-0 bottom-0 overflow-hidden",
                          seg.active ? "bg-primary z-10" : "bg-primary/20 z-0"
                      )}
                      style={{
                        left: `${seg.leftGap}px`,
                        right: `${seg.rightGap}px`,
                        borderTopLeftRadius: isFirst ? `${currentSize.outer}px` : `${currentSize.inner}px`,
                        borderBottomLeftRadius: isFirst ? `${currentSize.outer}px` : `${currentSize.inner}px`,
                        borderTopRightRadius: isLast ? `${currentSize.outer}px` : `${currentSize.inner}px`,
                        borderBottomRightRadius: isLast ? `${currentSize.outer}px` : `${currentSize.inner}px`,
                        transition: `left 300ms ${EASE_SPRING}, right 300ms ${EASE_SPRING}, border-radius 300ms ${EASE_STANDARD}`
                      }}
                    >
                      {isLast && !seg.active && !endIcon && step === 0 && (
                        <div 
                            className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary/40 rounded-full" 
                            style={{ right: `${currentSize.dotRight}px` }}
                        />
                      )}
                    </div>
                  </div>
                )
              })}

              {step > 0 && ticks.map((tick) => {
                const tickPct = ((tick - min) / (max - min)) * 100;
                
                let isHidden = false;
                localValues.forEach(val => {
                  const valPct = ((val - min) / (max - min)) * 100;
                  if (Math.abs(tickPct - valPct) < 3.5) isHidden = true; 
                });
                
                if (isCentered && Math.abs(tickPct - 50) < 3.5) isHidden = true;

                if (isHidden) return null;

                const isActive = localValues.length > 1 
                  ? (tick >= localValues[0] && tick <= localValues[1]) 
                  : isCentered 
                    ? (p1 < 50 ? (tickPct >= p1 && tickPct <= 50) : (tickPct >= 50 && tickPct <= p1))
                    : (tick <= localValues[0]);

                let tickOffset = "0px";
                if (tick === min) tickOffset = `${currentSize.outer / 1.5}px`;
                else if (tick === max) tickOffset = `-${currentSize.outer / 1.5}px`;

                return (
                  <div 
                    key={tick}
                    className={cn(
                      "absolute top-1/2 -translate-y-1/2 w-[3px] h-[3px] rounded-full -translate-x-1/2 transition-colors z-20",
                      isActive ? "bg-primary-foreground/80" : "bg-primary/60"
                    )}
                    style={{ left: `calc(${tickPct}% + ${tickOffset})` }}
                  />
                )
              })}

              {hasIcons && (
                <>
                  <div 
                    className="absolute inset-0 flex items-center justify-between z-0 text-primary pointer-events-none"
                    style={{ padding: `0 ${currentSize.iconPad}px` }}
                  >
                    {renderIcon(startIcon)}
                    {renderIcon(endIcon)}
                  </div>
                  <div 
                    className="absolute inset-0 flex items-center justify-between z-20 text-primary-foreground pointer-events-none transition-[clip-path] duration-300 ease-[cubic-bezier(0.2,0,0,1)]"
                    style={{
                      padding: `0 ${currentSize.iconPad}px`,
                      clipPath: `polygon(${activeClipLeft} 0%, ${activeClipRight} 0%, ${activeClipRight} 100%, ${activeClipLeft} 100%)`
                    }}
                  >
                    {renderIcon(startIcon)}
                    {renderIcon(endIcon)}
                  </div>
                </>
              )}

              {localValues.map((val, index) => {
                const percent = localValues.length > 1 ? (index === 0 ? vp1 : vp2) : vp1;
                const isThisDragging = draggingIndex === index;
                const isThisHovered = hoveredIndex === index;

                return (
                  <div
                    key={index}
                    role="slider"
                    tabIndex={disabled ? -1 : 0}
                    aria-valuemin={min}
                    aria-valuemax={max}
                    aria-valuenow={val}
                    onFocus={() => setFocusedIndex(index)}
                    onBlur={() => setFocusedIndex(null)}
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="group/thumb absolute top-1/2 -translate-x-1/2 -translate-y-1/2 outline-none z-30 flex items-center justify-center cursor-grab active:cursor-grabbing"
                    style={{ left: `${percent}%`, width: `${currentSize.thumbH}px`, height: `${currentSize.thumbH}px` }}
                  >
                    <div className={cn(
                        "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary transition-all duration-200 pointer-events-none",
                        "w-10 h-10",
                        isThisDragging 
                            ? "opacity-10 scale-100" 
                            : isThisHovered 
                                ? "opacity-[0.08] scale-100" 
                                : "opacity-0 scale-50 group-focus-visible/thumb:opacity-10 group-focus-visible/thumb:scale-100"
                    )} />

                    <div 
                      className="rounded-full bg-primary shadow-sm outline-none"
                      style={{ 
                        height: `${currentSize.thumbH}px`,
                        width: isThisDragging ? '2px' : '4px',
                        transition: `width ${isThisDragging ? "100ms linear" : `250ms ${EASE_STANDARD}`}` 
                      }}
                    />

                    {showTooltip && (
                      <div 
                        className={cn(
                          "absolute bottom-full mb-2 origin-bottom",
                          "flex items-center justify-center min-w-[44px] h-[36px] px-3",
                          "bg-primary text-primary-foreground text-sm font-bold rounded-full shadow-lg pointer-events-none",
                          isThisDragging 
                            ? `opacity-100 scale-100 translate-y-0 duration-[83ms] ease-[${EASE_STANDARD}]` 
                            : `opacity-0 scale-50 translate-y-4 duration-[117ms] ease-[${EASE_ACCELERATE}]`
                        )}
                        style={{ transitionProperty: "all" }}
                      >
                        {formatLabel ? formatLabel(val) : Math.round(val)}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
        </div>
      </div>
    );
  }
);
Slider.displayName = "Slider";

export { Slider };
