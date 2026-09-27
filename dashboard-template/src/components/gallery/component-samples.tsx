"use client";

/**
 * In-source inventory of the template's custom component families, each with a
 * live render. The gallery maps 1:1 over this list — adding a family to the
 * inventory automatically adds its sample to the dashboard gallery.
 */

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/material-design-3-button";
import { Switch } from "@/components/ui/material-design-3-switch";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/material-dialog";
import { DotmSquare12 } from "@/components/ui/dotm-square-12";
import { ExpandingSearchDock } from "@/components/ui/expanding-search-dock";
import { Ripple } from "@/components/ui/ripple";
import { RadioCardGroup } from "@/components/ui/radio-card";
import { SwitchCard } from "@/components/ui/switch-card";
import { ModernDropdown } from "@/components/ui/modern-dropdown";
import { TagGroup, Tag } from "@/components/ui/tag";
import { BadgeGroup, Badge } from "@/components/ui/badge";
import { ActionIconSelect } from "@/components/action-icon-select";
import { Skeleton } from "@/components/ui/skeleton";

function ButtonVariantsSample() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <Button size="sm">Primary</Button>
      <Button variant="secondary" size="sm">Secondary</Button>
      <Button variant="outline" size="sm">Outline</Button>
      <Button variant="destructive" size="sm">Destructive</Button>
    </div>
  );
}

function SwitchSample() {
  const [checked, setChecked] = useState(true);
  return (
    <div className="flex items-center gap-3">
      <Switch
        checked={checked}
        onCheckedChange={setChecked}
        aria-label="Gallery switch sample"
      />
      <span className="text-xs text-muted-foreground">
        {checked ? "Enabled" : "Disabled"}
      </span>
    </div>
  );
}

function DialogSample() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        Open dialog
      </Button>
      <DialogContent className="max-w-sm">
        <DialogTitle>Material dialog</DialogTitle>
        <div className="px-6 pb-6 flex flex-col gap-3">
          <p className="text-xs text-muted-foreground leading-relaxed">
            A thin React wrapper around Material Web&apos;s <code>md-dialog</code> —
            scrim, centering and Esc handling included.
          </p>
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setOpen(false)}>
              Got it
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DotMatrixSample() {
  return (
    <div className="flex flex-col items-center gap-2">
      <DotmSquare12 size={26} dotSize={2.2} />
      <span className="text-[10px] text-muted-foreground/60">
        5×5 animated dot matrix
      </span>
    </div>
  );
}

function SearchDockSample() {
  const [query, setQuery] = useState("");
  return (
    <ExpandingSearchDock
      placeholder="Search the gallery…"
      onSearch={setQuery}
    />
  );
}

function RippleSample() {
  return (
    <button
      type="button"
      className="relative overflow-hidden flex h-16 w-40 items-center justify-center rounded-3xl bg-background border border-border/40 text-xs font-medium text-muted-foreground select-none cursor-default"
    >
      <Ripple />
      <span className="relative z-10 pointer-events-none">
        Press for ripple
      </span>
    </button>
  );
}

function RadioCardSample() {
  const [value, setValue] = useState("balanced");
  return (
    <RadioCardGroup
      className="grid-cols-1 w-full"
      value={value}
      onValueChange={setValue}
      options={[
        { value: "precise", label: "Precise" },
        { value: "balanced", label: "Balanced" },
        { value: "creative", label: "Creative" },
      ]}
    />
  );
}

function SwitchCardSample() {
  const [checked, setChecked] = useState(true);
  return (
    <SwitchCard
      className="w-full"
      label="Preview in card"
      description="Render rewrites inside a floating card"
      checked={checked}
      onCheckedChange={setChecked}
    />
  );
}

function DropdownSample() {
  const [value, setValue] = useState<string | null>("gpt-5-mini");
  return (
    <ModernDropdown
      label="Model"
      value={value}
      onChange={setValue}
      items={[
        { id: "gpt-5-mini", name: "GPT-5 mini" },
        { id: "claude-sonnet", name: "Claude Sonnet" },
        { id: "gemini-flash", name: "Gemini Flash" },
      ]}
    />
  );
}

function TagSample() {
  return (
    <TagGroup>
      <Tag variant="interactive">
        <span className="relative z-10 pointer-events-none">API Configured</span>
      </Tag>
      <Tag variant="interactive">
        <span className="relative z-10 pointer-events-none">Ctrl + D</span>
      </Tag>
      <Tag variant="non-interactive">
        <span>v0.1.2</span>
      </Tag>
    </TagGroup>
  );
}

function BadgeSample() {
  return (
    <BadgeGroup>
      <Badge>Default</Badge>
      <Badge variant="secondary">Secondary</Badge>
      <Badge variant="outline">Outline</Badge>
      <Badge variant="destructive">Destructive</Badge>
    </BadgeGroup>
  );
}

function ActionIconSelectSample() {
  const [icon, setIcon] = useState("Sparkles");
  return (
    <ActionIconSelect
      value={icon}
      onValueChange={setIcon}
      accentColor="#8B5CF6"
    />
  );
}

function SkeletonSample() {
  return (
    <div className="flex w-full max-w-52 items-center gap-3">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <div className="flex w-full flex-col gap-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-2/3" />
      </div>
    </div>
  );
}

export interface ComponentFamily {
  id: string;
  name: string;
  description: string;
  /** Source module under src/ this family is implemented in. */
  source: string;
  sample: () => ReactNode;
}

export const COMPONENT_FAMILIES: ComponentFamily[] = [
  {
    id: "md3-button",
    name: "Material Design 3 Button",
    description:
      "MD3-styled button with state-layer ripple, press morphing and a split-button variant.",
    source: "src/components/ui/material-design-3-button.tsx",
    sample: () => <ButtonVariantsSample />,
  },
  {
    id: "md3-switch",
    name: "Material Design 3 Switch",
    description:
      "Spring-eased M3 switch with an audio-haptic engine and destructive variant.",
    source: "src/components/ui/material-design-3-switch.tsx",
    sample: () => <SwitchSample />,
  },
  {
    id: "material-dialog",
    name: "Material Dialog",
    description:
      "Thin React wrapper around Material Web's md-dialog with scrim and Esc handling.",
    source: "src/components/ui/material-dialog.tsx",
    sample: () => <DialogSample />,
  },
  {
    id: "dotmatrix-loader",
    name: "Dot-Matrix Loader",
    description:
      "Animated 5×5 dot-matrix spinner driven by a pure animation-resolver core.",
    source: "src/components/ui/dotm-square-12.tsx",
    sample: () => <DotMatrixSample />,
  },
  {
    id: "expanding-search-dock",
    name: "Expanding Search Dock",
    description:
      "Framer-motion search pill that springs open from an icon button on demand.",
    source: "src/components/ui/expanding-search-dock.tsx",
    sample: () => <SearchDockSample />,
  },
  {
    id: "ripple",
    name: "Ripple",
    description:
      "Material Web md-ripple wrapper adding press ripples to any surface.",
    source: "src/components/ui/ripple.tsx",
    sample: () => <RippleSample />,
  },
  {
    id: "radio-card",
    name: "Radio Card Group",
    description:
      "Selectable cards with squircle press morphing and a built-in radio indicator.",
    source: "src/components/ui/radio-card.tsx",
    sample: () => <RadioCardSample />,
  },
  {
    id: "switch-card",
    name: "Switch Card",
    description:
      "Whole-card toggle row combining the M3 switch with label and description.",
    source: "src/components/ui/switch-card.tsx",
    sample: () => <SwitchCardSample />,
  },
  {
    id: "modern-dropdown",
    name: "Modern Dropdown",
    description:
      "Pill-shaped select anchored to a Material Web menu with avatar support.",
    source: "src/components/ui/modern-dropdown.tsx",
    sample: () => <DropdownSample />,
  },
  {
    id: "tag",
    name: "Tag & Tag Group",
    description:
      "Segmented status pills with press-to-round morphing; the dashboard's status strip.",
    source: "src/components/ui/tag.tsx",
    sample: () => <TagSample />,
  },
  {
    id: "badge",
    name: "Badge & Badge Group",
    description:
      "Compact labeled badges in five variants for counts, states and updates.",
    source: "src/components/ui/badge.tsx",
    sample: () => <BadgeSample />,
  },
  {
    id: "action-icon-select",
    name: "Action Icon Select",
    description:
      "Searchable popover picker over the 48-icon action icon set with live preview.",
    source: "src/components/action-icon-select.tsx",
    sample: () => <ActionIconSelectSample />,
  },
  {
    id: "skeleton",
    name: "Skeleton",
    description:
      "Pulse shimmer placeholder used across every async loading surface.",
    source: "src/components/ui/skeleton.tsx",
    sample: () => <SkeletonSample />,
  },
];
