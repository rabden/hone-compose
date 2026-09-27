"use client";

import type { CSSProperties } from "react";

import { DotMatrixBase } from "../../lib/dotmatrix-core";
import { useDotMatrixPhases, usePrefersReducedMotion } from "../../lib/dotmatrix-hooks";
import type { DotAnimationResolver, DotMatrixCommonProps } from "../../lib/dotmatrix-core";

export type DotmSquare12Props = DotMatrixCommonProps;

// User-defined origin is cell (2,2) in a 1-based 5x5 grid => (row=1,col=1) in zero-based coords.
const ORIGIN_ROW = 1;
const ORIGIN_COL = 1;
const MAX_MANHATTAN = 6;

const animationResolver: DotAnimationResolver = ({ isActive, row, col, reducedMotion, phase }) => {
  if (!isActive) {
    return { className: "dmx-inactive" };
  }

  const ring = Math.max(
    0,
    Math.min(MAX_MANHATTAN, Math.abs(row - ORIGIN_ROW) + Math.abs(col - ORIGIN_COL))
  );
  const style = {
    "--dmx-center-ripple-ring": ring
  } as CSSProperties;

  if (reducedMotion || phase === "idle") {
    return {
      style: {
        ...style,
        opacity: 0.2 + (1 - ring / MAX_MANHATTAN) * 0.75
      }
    };
  }

  return { className: "dmx-center-origin-ripple", style };
};

const DEFAULTS = {
  size: 18,
  dotSize: 1.5,
  speed: 1.35,
  colorPreset: "solid-theme" as const,
  pattern: "full" as const,
  dotShape: "circle" as const,
  animated: true,
  hoverAnimated: false,
  muted: false,
  bloom: false,
  halo: 0,
  opacityBase: 0.12,
  opacityMid: 0.42,
  opacityPeak: 1,
  cellPadding: 0,
  boxSize: 0,
  minSize: 0,
};

export function DotmSquare12(props: DotmSquare12Props) {
  const {
    speed = DEFAULTS.speed,
    pattern = DEFAULTS.pattern,
    animated = DEFAULTS.animated,
    hoverAnimated = DEFAULTS.hoverAnimated,
    size = DEFAULTS.size,
    dotSize = DEFAULTS.dotSize,
    colorPreset = DEFAULTS.colorPreset,
    dotShape = DEFAULTS.dotShape,
    muted = DEFAULTS.muted,
    bloom = DEFAULTS.bloom,
    halo = DEFAULTS.halo,
    opacityBase = DEFAULTS.opacityBase,
    opacityMid = DEFAULTS.opacityMid,
    opacityPeak = DEFAULTS.opacityPeak,
    cellPadding = DEFAULTS.cellPadding,
    boxSize = DEFAULTS.boxSize,
    minSize = DEFAULTS.minSize,
    ...rest
  } = props;

  const reducedMotion = usePrefersReducedMotion();
  const { phase: matrixPhase, onMouseEnter, onMouseLeave } = useDotMatrixPhases({
    animated: Boolean(animated && !reducedMotion),
    hoverAnimated: Boolean(hoverAnimated && !reducedMotion),
    speed
  });

  return (
    <DotMatrixBase
      {...rest}
      size={size}
      dotSize={dotSize}
      speed={speed}
      pattern={pattern}
      animated={animated}
      colorPreset={colorPreset}
      dotShape={dotShape}
      muted={muted}
      bloom={bloom}
      halo={halo}
      opacityBase={opacityBase}
      opacityMid={opacityMid}
      opacityPeak={opacityPeak}
      cellPadding={cellPadding}
      boxSize={boxSize}
      minSize={minSize}
      phase={matrixPhase}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      reducedMotion={reducedMotion}
      animationResolver={animationResolver}
    />
  );
}
