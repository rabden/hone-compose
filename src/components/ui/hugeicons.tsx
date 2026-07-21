import { HugeiconsIcon as HugeiconsIconBase } from "@hugeicons/react";
import type { ComponentProps } from "react";

// ponytail: global default strokeWidth bumped to 2 for visual weight
export function HugeiconsIcon(props: ComponentProps<typeof HugeiconsIconBase>) {
  return <HugeiconsIconBase strokeWidth={2} {...props} />;
}
