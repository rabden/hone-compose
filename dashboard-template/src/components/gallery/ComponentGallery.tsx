"use client";

import { HugeiconsIcon } from "@/components/ui/hugeicons";
import {
  AiChat02Icon,
  BadgeCheckIcon,
  CircleIcon,
  CombineIcon,
  CursorPointer02Icon,
  CheckmarkSquare02Icon,
  DiamondIcon,
  Layers01Icon,
  Loading03Icon,
  Menu01Icon,
  MessageEdit01Icon,
  SearchAreaIcon,
  SparklesIcon,
  SquareIcon,
  Tag01Icon,
} from "@hugeicons/core-free-icons";
import { getRounded } from "@/options/tabs/actionstudio/getRounded";
import {
  COMPONENT_FAMILIES,
} from "./component-samples";

/** Gallery header icon per family, matching the dashboard's icon chips. */
const FAMILY_ICONS: Record<string, typeof SparklesIcon> = {
  "md3-button": CursorPointer02Icon,
  "md3-switch": CombineIcon,
  "material-dialog": MessageEdit01Icon,
  "dotmatrix-loader": Loading03Icon,
  "expanding-search-dock": SearchAreaIcon,
  "ripple": CircleIcon,
  "radio-card": DiamondIcon,
  "switch-card": CheckmarkSquare02Icon,
  "modern-dropdown": Menu01Icon,
  "tag": Tag01Icon,
  "badge": BadgeCheckIcon,
  "action-icon-select": SparklesIcon,
  "skeleton": Layers01Icon,
  "action-card-grid": SquareIcon,
};

/**
 * The dashboard's component gallery section. Sits below the dashboard content
 * and reuses the dashboard's bento-grid language: tight gap-1 grid, corner
 * rounding via getRounded and icon chips. Each card holds a live family
 * sample and nothing else. overflow is intentionally visible so the
 * ActionIconSelect popover can escape its card.
 */
export function ComponentGallery() {
  return (
    <section
      aria-label="Component gallery"
      className="mt-4 flex flex-col gap-8 w-full min-w-0 py-4 mx-auto max-w-4xl animate-in fade-in duration-500"
    >
      <div className="space-y-3">
        <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Component Gallery
        </span>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground leading-tight">
          The building blocks of Hone
        </h1>
        <p className="text-sm text-muted-foreground/80 max-w-2xl leading-relaxed">
          Every custom interface primitive in this template, rendered live —
          press the buttons, flip the switches, open the dialog. All{" "}
          {COMPONENT_FAMILIES.length} families ship from{" "}
          <code className="text-xs font-mono text-foreground/70">
            src/components
          </code>{" "}
          and are what the rest of the dashboard is built from.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
        {COMPONENT_FAMILIES.map((family, index) => {
          const FamilyIcon = FAMILY_ICONS[family.id];
          return (
            <div
              key={family.id}
              data-gallery-sample={family.id}
              className={
                "relative flex flex-col outline-none bg-muted/40 rounded-md transition-colors duration-200 hover:bg-muted/60 select-none " +
                getRounded(index, COMPONENT_FAMILIES.length, 2)
              }
            >
              <div className="flex items-center gap-3 p-5 pb-4">
                <div className="p-2 rounded-lg bg-foreground/6 w-fit shrink-0">
                  {FamilyIcon ? (
                    <HugeiconsIcon
                      icon={FamilyIcon}
                      className="size-4 text-foreground/60"
                    />
                  ) : null}
                </div>
                <span
                  data-gallery-name={family.id}
                  className="text-xs font-semibold text-foreground truncate"
                >
                  {family.name}
                </span>
              </div>
              <div className="flex min-h-32 flex-1 items-center justify-center border-t border-border/20 px-4 py-6">
                {family.sample()}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
