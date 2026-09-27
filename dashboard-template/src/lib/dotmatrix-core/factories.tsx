import { useDotMatrixPhases, usePrefersReducedMotion } from "../dotmatrix-hooks";
import { createPathWaveResolver, type DotMatrixCommonProps } from "./utils";
import { DotMatrixBase } from "./components";

type PathWaveComponentProps = DotMatrixCommonProps;

export function createPathWaveComponent(displayName: string, getPathNorm: (ctx: { row: number; col: number; index: number }) => number) {
  const resolve = createPathWaveResolver(getPathNorm);

  function PathWaveComponent({
    pattern = "full",
    animated = true,
    hoverAnimated = false,
    speed = 1,
    ...rest
  }: PathWaveComponentProps) {
    const reducedMotion = usePrefersReducedMotion();
    const { phase: matrixPhase, onMouseEnter, onMouseLeave } = useDotMatrixPhases({
      animated: Boolean(animated && !reducedMotion),
      hoverAnimated: Boolean(hoverAnimated && !reducedMotion),
      speed
    });
    return (
      <DotMatrixBase
        {...rest}
        speed={speed}
        pattern={pattern}
        animated={animated}
        phase={matrixPhase}
        reducedMotion={reducedMotion}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        animationResolver={resolve}
      />
    );
  }

  PathWaveComponent.displayName = displayName;
  return PathWaveComponent;
}
