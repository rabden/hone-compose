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
import { RadioCardGroupGrouped } from "@/components/ui/radio-card";
import { SwitchCardGroup } from "@/components/ui/switch-card";
import { ModernDropdown } from "@/components/ui/modern-dropdown";
import { TagGroup, Tag } from "@/components/ui/tag";
import { BadgeGroup, Badge } from "@/components/ui/badge";
import { ActionIconSelect } from "@/components/action-icon-select";
import { Skeleton } from "@/components/ui/skeleton";
import { ActionCardGrid } from "@/options/tabs/actionstudio/ActionCardGrid";
import type { CustomAction } from "@/content/storage";

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
    </div>
  );
}

function SearchDockSample() {
  return (
    <ExpandingSearchDock
      placeholder="Search the gallery…"
      onSearch={() => {}}
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
    <RadioCardGroupGrouped
      className="w-full"
      value={value}
      onValueChange={setValue}
      columns={1}
      options={[
        {
          value: "precise",
          label: "Precise",
          description: "Stay close to the original",
        },
        {
          value: "balanced",
          label: "Balanced",
          description: "Light rewriting only",
        },
        {
          value: "creative",
          label: "Creative",
          description: "Freer interpretation",
        },
      ]}
    />
  );
}

function SwitchCardSample() {
  const [hideDot, setHideDot] = useState(false);
  const [previewInCard, setPreviewInCard] = useState(true);
  return (
    <SwitchCardGroup
      className="w-full"
      items={[
        {
          id: "hide-dot",
          label: "Hide Trigger Dot",
          description:
            "Completely hide the white trigger dot from webpage inputs.",
          checked: hideDot,
          onCheckedChange: setHideDot,
        },
        {
          id: "preview-in-card",
          label: "Preview AI results in card",
          description: "Show rewrites in a floating card before applying.",
          checked: previewInCard,
          onCheckedChange: setPreviewInCard,
        },
      ]}
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

const SAMPLE_ACTIONS: CustomAction[] = [
  {
    id: "fix_spelling",
    name: "Fix spelling & grammar",
    description: "Fix typos and grammar mistakes",
    icon: "Check",
    color: "#8B5CF6",
    promptTemplate: "Fix the spelling and grammar:\n\n{{input}}",
    replaceMode: "replace",
    enabled: true,
    createdAt: 0,
    type: "builtin",
  },
  {
    id: "improve",
    name: "Improve writing",
    description: "Upgrade clarity, flow and tone",
    icon: "Feather",
    color: "#10B981",
    promptTemplate: "Improve this writing:\n\n{{input}}",
    replaceMode: "replace",
    enabled: true,
    createdAt: 0,
    type: "builtin",
  },
  {
    id: "explain-simple",
    name: "Explain Simply",
    description: "Rewrite as a plain-language explanation",
    icon: "Lightbulb",
    color: "#F59E0B",
    promptTemplate: "Explain in plain language:\n\n{{input}}",
    replaceMode: "replace",
    enabled: true,
    createdAt: 0,
    type: "marketplace",
    sourceId: "explain-simple",
    version: "1.0.0",
  },
];

function ActionCardGridSample() {
  return (
    // Vertical stack: the shipped grid lays tiles out in 3 columns; the
    // sample overrides tile width so each action card takes the full row.
    <div className="w-full [&_button]:!w-full">
      <ActionCardGrid actions={SAMPLE_ACTIONS} onActionClick={() => {}} />
    </div>
  );
}

export interface ComponentFamily {
  id: string;
  name: string;
  sample: () => ReactNode;
}

export const COMPONENT_FAMILIES: ComponentFamily[] = [
  {
    id: "md3-button",
    name: "Material Design 3 Button",
    sample: () => <ButtonVariantsSample />,
  },
  {
    id: "md3-switch",
    name: "Material Design 3 Switch",
    sample: () => <SwitchSample />,
  },
  {
    id: "material-dialog",
    name: "Material Dialog",
    sample: () => <DialogSample />,
  },
  {
    id: "dotmatrix-loader",
    name: "Dot-Matrix Loader",
    sample: () => <DotMatrixSample />,
  },
  {
    id: "expanding-search-dock",
    name: "Expanding Search Dock",
    sample: () => <SearchDockSample />,
  },
  {
    id: "ripple",
    name: "Ripple",
    sample: () => <RippleSample />,
  },
  {
    id: "radio-card",
    name: "Radio Card Group",
    sample: () => <RadioCardSample />,
  },
  {
    id: "switch-card",
    name: "Switch Card Group",
    sample: () => <SwitchCardSample />,
  },
  {
    id: "modern-dropdown",
    name: "Modern Dropdown",
    sample: () => <DropdownSample />,
  },
  {
    id: "tag",
    name: "Tag & Tag Group",
    sample: () => <TagSample />,
  },
  {
    id: "badge",
    name: "Badge & Badge Group",
    sample: () => <BadgeSample />,
  },
  {
    id: "action-icon-select",
    name: "Action Icon Select",
    sample: () => <ActionIconSelectSample />,
  },
  {
    id: "skeleton",
    name: "Skeleton",
    sample: () => <SkeletonSample />,
  },
  {
    id: "action-card-grid",
    name: "Action Card Grid",
    sample: () => <ActionCardGridSample />,
  },
];
