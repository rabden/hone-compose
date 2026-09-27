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
};

/**
 * The dashboard's component gallery section. Sits below the dashboard content
 * and reuses the dashboard's bento-grid language: tight gap-1 grid, corner
 * rounding via getRounded, icon chips and hairline-divided footer rows.
 * Renders one live, labeled sample per inventoried component family.
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-1 auto-rows-fr">
        {COMPONENT_FAMILIES.map((family, index) => {
          const FamilyIcon = FAMILY_ICONS[family.id];
          return (
            <div
              key={family.id}
              data-gallery-sample={family.id}
              className={
                "relative flex flex-col outline-none overflow-hidden bg-background rounded-md transition-colors duration-200 hover:bg-background/50 select-none " +
                getRounded(index, COMPONENT_FAMILIES.length, 2)
              }
            >
              <div className="flex items-start gap-3 p-5 pb-4">
                <div className="p-2.5 rounded-lg bg-foreground/6 w-fit shrink-0">
                  {FamilyIcon ? (
                    <HugeiconsIcon
                      icon={FamilyIcon}
                      className="size-4 text-foreground/60"
                    />
                  ) : null}
                </div>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span
                    data-gallery-name={family.id}
                    className="text-xs font-semibold text-foreground"
                  >
                    {family.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 leading-normal">
                    {family.description}
                  </span>
                </div>
              </div>
              <div className="flex min-h-32 flex-1 items-center justify-center border-t border-border/20 px-4 py-6">
                {family.sample()}
              </div>
              <div className="flex items-center gap-2 border-t border-border/20 px-5 py-2.5">
                <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider shrink-0">
                  Source
                </span>
                <span className="text-[10px] font-mono text-foreground/70 truncate">
                  {family.source}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
