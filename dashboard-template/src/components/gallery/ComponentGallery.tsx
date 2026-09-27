"use client";

import { HugeiconsIcon } from "@/components/ui/hugeicons";
import { SparklesIcon } from "@hugeicons/core-free-icons";
import {
  COMPONENT_FAMILIES,
} from "./component-samples";

/**
 * The dashboard's component gallery — the template's showpiece section.
 * Renders one live, labeled sample per inventoried component family; the set
 * of samples is exactly COMPONENT_FAMILIES (one render call each).
 */
export function ComponentGallery() {
  return (
    <section
      aria-label="Component gallery"
      className="flex flex-col gap-8 w-full min-w-0 py-4 mx-auto max-w-6xl animate-in fade-in slide-in-from-bottom-3 duration-500"
    >
      <div className="flex flex-col gap-3">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          <HugeiconsIcon icon={SparklesIcon} className="size-3.5" />
          Component Gallery
        </span>
        <h1 className="text-3xl md:text-5xl font-light tracking-tight text-foreground leading-tight">
          The building blocks of Hone
        </h1>
        <p className="text-sm text-muted-foreground/80 max-w-2xl leading-relaxed">
          Every custom interface primitive in this template, rendered live —
          press the buttons, flip the switches, open the dialog. All{" "}
          {COMPONENT_FAMILIES.length} families ship from{" "}
          <code className="text-xs">src/components</code> and are what the rest
          of the dashboard is built from.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {COMPONENT_FAMILIES.map((family) => (
          <div
            key={family.id}
            data-gallery-sample={family.id}
            className="flex flex-col overflow-hidden rounded-3xl border border-border/40 bg-background/40 backdrop-blur-[2px] transition-colors hover:border-border/70"
          >
            <div className="flex flex-col gap-0.5 px-5 pt-4 pb-3">
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
            <div className="flex min-h-32 flex-1 items-center justify-center border-t border-border/30 px-4 py-6 [background:radial-gradient(circle,var(--border)_0.8px,transparent_0.8px)] [background-size:14px_14px] bg-muted/20">
              {family.sample()}
            </div>
            <div className="truncate border-t border-border/30 px-5 py-2 text-[9px] font-mono text-muted-foreground/40">
              {family.source}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
