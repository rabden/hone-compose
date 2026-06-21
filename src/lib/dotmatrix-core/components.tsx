import type { CSSProperties } from "react";
import {
  MATRIX_SIZE,
  getPatternIndexes,
  indexToCoord,
  distanceFromCenter,
  polarAngle,
  normalizedRadius,
  manhattanDistance,
  resolveDmxColorTokens,
  cx,
  dmxBloomRootActive,
  dmxBloomHaloSpreadClass,
  dmxDotBloomParts,
  remapOpacityToTriplet,
  getMatrix5Layout,
  resolveDmxBoxOuterDim,
  clamp01Dmx,
  type DotMatrixPhase,
  type DotAnimationResolver,
  type DotMatrixCommonProps,
} from "./utils";

interface DotMatrixBaseProps extends DotMatrixCommonProps {
  phase: DotMatrixPhase;
  reducedMotion?: boolean;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  animationResolver?: DotAnimationResolver;
}

export function DotMatrixBase({
  size = 24,
  dotSize = 3,
  color = "currentColor",
  colorPreset,
  speed = 1,
  ariaLabel = "Loading",
  className,
  pattern = "diamond",
  dotShape = "circle",
  muted = false,
  bloom = false,
  halo = 0,
  dotClassName,
  phase,
  reducedMotion = false,
  onMouseEnter,
  onMouseLeave,
  animationResolver,
  opacityBase,
  opacityMid,
  opacityPeak,
  cellPadding,
  boxSize,
  minSize
}: DotMatrixBaseProps) {
  const patternIndexes = new Set(getPatternIndexes(pattern));
  const safeSpeed = speed > 0 ? speed : 1;
  const speedScale = 1 / safeSpeed;
  const { gap, matrixSpan } = getMatrix5Layout(size, dotSize, cellPadding);
  const { outerDim, useWrapper } = resolveDmxBoxOuterDim({ boxSize, minSize });
  const scale = useWrapper && matrixSpan > 0 ? outerDim / matrixSpan : 1;
  const center = Math.floor(MATRIX_SIZE / 2);
  const ob = clamp01Dmx(opacityBase);
  const om = clamp01Dmx(opacityMid);
  const op = clamp01Dmx(opacityPeak);
  const unit = dotSize + gap;
  const { resolvedColor, dotFill } = resolveDmxColorTokens(color, colorPreset);

  const dmxVarStyle = {
    width: matrixSpan,
    height: matrixSpan,
    "--dmx-speed": speedScale,
    ["--dmx-dot-size" as const]: `${dotSize}px`,
    ["--dmx-halo-level" as const]: halo,
    ["--dmx-dot-fill" as const]: dotFill,
    color: resolvedColor,
    ...(ob !== undefined && { ["--dmx-opacity-base" as const]: ob }),
    ...(om !== undefined && { ["--dmx-opacity-mid" as const]: om }),
    ...(op !== undefined && { ["--dmx-opacity-peak" as const]: op }),
    ...(useWrapper
      ? {
        transform: `scale(${scale})`,
        transformOrigin: "center center" as const
      }
      : { minWidth: minSize, minHeight: minSize })
  } as unknown as CSSProperties;

  const dots = Array.from({ length: MATRIX_SIZE * MATRIX_SIZE }).map((_, index) => {
    const { row, col } = indexToCoord(index);
    const isActive = patternIndexes.has(index);
    const distance = distanceFromCenter(index);
    const angle = polarAngle(index);
    const radiusNormalizedValue = normalizedRadius(index);
    const manhattan = manhattanDistance(index);
    const deltaX = (col - center) * unit;
    const deltaY = (row - center) * unit;

    const animationState = animationResolver
      ? animationResolver({
        index,
        row,
        col,
        distanceFromCenter: distance,
        angleFromCenter: angle,
        radiusNormalized: radiusNormalizedValue,
        manhattanDistance: manhattan,
        phase,
        isActive,
        reducedMotion
      })
      : {};

    const resolvedAnimationStyle = animationState.style ? { ...animationState.style } : undefined;
    let isBloomDot = false;
    let stylePatch: CSSProperties | undefined = resolvedAnimationStyle;

    if (isActive) {
      const rawOpacity = stylePatch?.opacity;
      if (stylePatch != null && typeof rawOpacity === "number") {
        const remappedOpacity = remapOpacityToTriplet(rawOpacity, ob, om, op);
        stylePatch = { ...stylePatch, opacity: remappedOpacity };
        const parts = dmxDotBloomParts(true, rawOpacity, bloom, halo, ob, om, op);
        (stylePatch as CSSProperties & { "--dmx-bloom-level"?: number })["--dmx-bloom-level"] = parts.level;
        isBloomDot = parts.bloomDot;
      } else {
        const parts = dmxDotBloomParts(true, 0, bloom, halo, ob, om, op);
        if (parts.level > 0) {
          stylePatch = {
            ...(stylePatch ?? {}),
            ["--dmx-bloom-level" as const]: parts.level
          } as CSSProperties & { "--dmx-bloom-level"?: number };
        }
        isBloomDot = parts.bloomDot;
      }
    }

    const dotStyle = {
      width: dotSize,
      height: dotSize,
      "--dmx-distance": distance,
      "--dmx-row": row,
      "--dmx-col": col,
      "--dmx-x": `${deltaX}px`,
      "--dmx-y": `${deltaY}px`,
      "--dmx-angle": angle,
      "--dmx-radius": radiusNormalizedValue,
      "--dmx-manhattan": manhattan,
      ...stylePatch,
      ...(!isActive
        ? {
          opacity: 0,
          visibility: "hidden" as const,
          pointerEvents: "none" as const,
          animation: "none"
        }
        : {})
    } as CSSProperties;

    return (
      <span
        key={index}
        aria-hidden="true"
        className={cx(
          "dmx-dot",
          !isActive && "dmx-inactive",
          isBloomDot && "dmx-bloom-dot",
          dotClassName,
          animationState.className
        )}
        style={dotStyle}
      />
    );
  });

  const matrix = (
    <div
      className={cx(
        "dmx-root",
        `dmx-dot-shape-${dotShape}`,
        muted && "dmx-muted",
        dmxBloomRootActive(bloom, halo) && "dmx-bloom",
        dmxBloomHaloSpreadClass(halo),
        !useWrapper && className
      )}
      style={dmxVarStyle}
    >
      <div className="dmx-grid" style={{ gap }}>{dots}</div>
    </div>
  );

  if (useWrapper) {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-label={ariaLabel}
        className={className}
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: outerDim,
          height: outerDim,
          minWidth: minSize,
          minHeight: minSize,
          overflow: "hidden"
        }}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      >
        {matrix}
      </div>
    );
  }

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={ariaLabel}
      className={cx(
        "dmx-root",
        `dmx-dot-shape-${dotShape}`,
        muted && "dmx-muted",
        dmxBloomRootActive(bloom, halo) && "dmx-bloom",
        dmxBloomHaloSpreadClass(halo),
        className
      )}
      style={dmxVarStyle}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <div className="dmx-grid" style={{ gap }}>{dots}</div>
    </div>
  );
}
