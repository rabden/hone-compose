import { useMemo } from "react";
import { AlertCircle } from "lucide-react";
import { HugeiconsIcon } from "@/components/ui/hugeicons";
import {
  Tick01Icon,
  EyeIcon,
  EyeOffIcon,
  ArrowUpRight01Icon,
  KeyIcon,
  KeyboardIcon,
  PanelLeftIcon,
  HistoryIcon,
  AiGenerativeIcon,
} from "@hugeicons/core-free-icons";
import { Ripple } from "@/components/ui/ripple";
import { BUILTIN_SHORTCUT_ACTIONS } from "@/lib/shortcuts";
import { getActionLabel } from "@/lib/shortcuts";
import { TagGroup, Tag } from "@/components/ui/tag";
import { Button } from "@/components/ui/material-design-3-button";
import { HistoryList } from "@/components/history-list";
import type { CustomAction } from "../../content/storage";
import { getProviderLabel, isProviderConfigured } from "../../providers";

interface HistoryItem {
  id: string;
  timestamp: number;
  url: string;
  action: string;
  originalText: string;
  rewrittenText: string;
  provider: string;
  model: string;
}

interface DashboardTabProps {
  setActiveTab: (tab: "dashboard" | "api" | "shortcut" | "history" | "actions" | "customizations") => void;
  activeProvider: string;
  openrouterKey: string;
  openaiCompatibleKey: string;
  anthropicShapeKey: string;
  googleAiStudioKey: string;
  groqKey: string;
  deepseekKey: string;
  openaiCompatibleModel: string;
  anthropicShapeModel: string;
  openrouterModel: string;
  googleAiStudioModel: string;
  groqModel: string;
  deepseekModel: string;
  dropdownShortcutKey: string;
  dropdownShortcutCtrl: boolean;
  dropdownShortcutAlt: boolean;
  dropdownShortcutShift: boolean;
  dropdownShortcutMeta: boolean;
  hideDot: boolean;
  history: HistoryItem[];
  customActions: CustomAction[];
}

export default function DashboardTab({
  setActiveTab,
  activeProvider,
  openrouterKey,
  openaiCompatibleKey,
  anthropicShapeKey,
  googleAiStudioKey,
  groqKey,
  deepseekKey,
  openaiCompatibleModel,
  anthropicShapeModel,
  openrouterModel,
  googleAiStudioModel,
  groqModel,
  deepseekModel,
  dropdownShortcutKey,
  dropdownShortcutCtrl,
  dropdownShortcutAlt,
  dropdownShortcutShift,
  dropdownShortcutMeta,
  hideDot,
  history,
  customActions,
}: DashboardTabProps) {
  const getDropdownShortcutDisplay = () => {
    const keys: string[] = [];
    if (dropdownShortcutCtrl) keys.push("Ctrl");
    if (dropdownShortcutAlt) keys.push("Alt");
    if (dropdownShortcutShift) keys.push("Shift");
    if (dropdownShortcutMeta) keys.push("⌘");
    if (dropdownShortcutKey) keys.push(dropdownShortcutKey.toUpperCase());
    return keys.length > 0 ? keys.join(" + ") : "None configured";
  };

  const getActionName = (actionCode: string) =>
    getActionLabel(actionCode, customActions);

  const hasKey = useMemo(
    () =>
      isProviderConfigured(activeProvider, {
        openrouterKey,
        openaiCompatibleKey,
        anthropicShapeKey,
        googleAiStudioKey,
        groqKey,
        deepseekKey,
      }),
    [
      activeProvider,
      openrouterKey,
      openaiCompatibleKey,
      anthropicShapeKey,
      googleAiStudioKey,
      groqKey,
      deepseekKey,
    ],
  );

  return (
    <div className="flex flex-col gap-12 animate-in fade-in duration-500 w-full min-w-0 py-4 mx-auto max-w-4xl">
      {/* Attention: Editorial Hero Section */}
      <div className="flex flex-col gap-4">
        <div className="space-y-3">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            System Status
          </span>
          <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground leading-tight">
            Your Hone Control Panel
          </h1>
          <p className="text-sm text-muted-foreground/80 max-w-2xl leading-relaxed">
            Everything is configured and ready. Below is a snapshot of your
            transformation engine's current state.
          </p>
        </div>
      </div>

      {/* Interest: Status Indicators (Grouped Pills) */}
      <TagGroup>
        <Tag
          variant="interactive"
          onClick={() => setActiveTab("api")}
          className={hasKey ? "text-foreground" : "text-amber-900 dark:text-amber-200"}
        >
          <Ripple />
          <span className="inline-flex items-center gap-1.5 relative z-10 pointer-events-none">
            {hasKey ? (
              <HugeiconsIcon icon={Tick01Icon} className="size-3.5" />
            ) : (
              <AlertCircle className="size-3.5" />
            )}
            {hasKey ? "API Configured" : "Setup Required"}
          </span>
        </Tag>

        <Tag
          variant="interactive"
          onClick={() => setActiveTab("shortcut")}
          className={dropdownShortcutKey
            ? "text-foreground"
            : "text-amber-900 dark:text-amber-200"}
        >
          <Ripple />
          <span className="inline-flex items-center gap-1.5 relative z-10 pointer-events-none">
            {dropdownShortcutKey ? (
              <HugeiconsIcon icon={Tick01Icon} className="size-3.5" />
            ) : (
              <AlertCircle className="size-3.5" />
            )}
            {dropdownShortcutKey
              ? `${getDropdownShortcutDisplay()}`
              : "No Shortcut"}
          </span>
        </Tag>

        <Tag
          variant="interactive"
          onClick={() => setActiveTab("customizations")}
          className="text-foreground"
        >
          <Ripple />
          <span className="inline-flex items-center gap-1.5 relative z-10 pointer-events-none">
            {hideDot ? (
              <HugeiconsIcon icon={EyeOffIcon} className="size-3.5" />
            ) : (
              <HugeiconsIcon icon={EyeIcon} className="size-3.5" />
            )}
            {hideDot ? "Dot: Hidden" : "Dot: Visible"}
          </span>
        </Tag>
      </TagGroup>

      {/* Desire: Asymmetric Bento Card Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-1 auto-rows-fr">
        {/* Engine Card - Tall */}
        <button
          onClick={() => setActiveTab("api")}
          className="group md:col-span-1 md:row-span-2 relative flex flex-col justify-between p-6 text-left cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden bg-background rounded-md rounded-tl-3xl rounded-bl-3xl transition-colors duration-200 hover:bg-background/50 select-none"
        >
          <Ripple />
          <div className="relative z-10 pointer-events-none space-y-4 flex flex-col flex-1">
            <div className="p-3 rounded-lg bg-foreground/6 w-fit">
              <HugeiconsIcon icon={KeyIcon} className="size-5 text-foreground/60" />
            </div>
            <div className="space-y-2 flex-1">
              <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider block">
                Active Engine
              </span>
              <span className="text-lg font-light text-foreground leading-tight block">
                {getProviderLabel(activeProvider)}
              </span>
            </div>
            <div className="space-y-1 pt-3 border-t border-border/20">
              <span className="text-[8px] text-muted-foreground/50 uppercase tracking-wider block">
                Model
              </span>
              <span
                className="text-[10px] font-mono text-foreground/70 truncate block"
                title={(() => {
                  switch (activeProvider) {
                    case "openai_compatible": return openaiCompatibleModel;
                    case "anthropic_shape": return anthropicShapeModel;
                    case "openrouter": return openrouterModel;
                    case "groq": return groqModel;
                    case "deepseek": return deepseekModel;
                    case "google_ai_studio": return googleAiStudioModel;
                    default: return "";
                  }
                })()}
              >
                {(() => {
                  switch (activeProvider) {
                    case "openai_compatible": return openaiCompatibleModel;
                    case "anthropic_shape": return anthropicShapeModel;
                    case "openrouter": return openrouterModel;
                    case "groq": return groqModel;
                    case "deepseek": return deepseekModel;
                    case "google_ai_studio": return googleAiStudioModel;
                    default: return "";
                  }
                })()}
              </span>
            </div>
          </div>
        </button>

        {/* Shortcut + Visibility Cards - Stack */}
        <button
          onClick={() => setActiveTab("shortcut")}
          className="group relative flex flex-col justify-between p-6 text-left cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden bg-background rounded-md transition-colors duration-200 hover:bg-background/50 select-none"
        >
          <Ripple />
          <div className="relative z-10 pointer-events-none space-y-3">
            <div className="p-2.5 rounded-lg bg-foreground/6 w-fit">
              <HugeiconsIcon icon={KeyboardIcon} className="size-4 text-foreground/60" />
            </div>
            <div>
              <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider block mb-1">
                Trigger Shortcut
              </span>
              <span className="text-sm font-mono font-semibold text-foreground block">
                {getDropdownShortcutDisplay()}
              </span>
            </div>
          </div>
        </button>

        <button
          onClick={() => setActiveTab("shortcut")}
          className="group relative flex items-start justify-between p-6 text-left cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden bg-background rounded-md rounded-tr-3xl transition-colors duration-200 hover:bg-background/50 select-none"
        >
          <Ripple />
          <div className="relative z-10 pointer-events-none space-y-3">
            <div className="p-2.5 rounded-lg bg-foreground/6 w-fit">
              <HugeiconsIcon icon={PanelLeftIcon} className="size-4 text-foreground/60" />
            </div>
            <div>
              <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider block mb-1">
                Visual Indicator
              </span>
              <span className="text-sm font-light text-foreground">
                {hideDot ? "Hidden" : "Visible"}
              </span>
            </div>
          </div>
        </button>

        {/* Rewrites Card */}
        <button
          onClick={() => setActiveTab("history")}
          className="group relative flex flex-col justify-between p-6 text-left cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden bg-background rounded-md transition-colors duration-200 hover:bg-background/50 select-none"
        >
          <Ripple />
          <div className="relative z-10 pointer-events-none space-y-3">
            <div className="p-2.5 rounded-lg bg-foreground/6 w-fit">
              <HugeiconsIcon icon={HistoryIcon} className="size-4 text-foreground/60" />
            </div>
            <div>
              <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider block mb-1">
                Transformations
              </span>
              <span className="text-2xl font-light text-foreground block">
                {history.length}
              </span>
            </div>
          </div>
        </button>

        {/* Actions Count Card */}
        <button
          onClick={() => setActiveTab("actions")}
          className="group relative flex flex-col justify-between p-6 text-left cursor-default outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden bg-background rounded-md rounded-br-3xl transition-colors duration-200 hover:bg-background/50 select-none"
        >
          <Ripple />
          <div className="relative z-10 pointer-events-none space-y-3">
            <div className="p-2.5 rounded-lg bg-foreground/6 w-fit">
              <HugeiconsIcon icon={AiGenerativeIcon} className="size-4 text-foreground/60" />
            </div>
            <div>
              <span className="text-[9px] font-semibold text-muted-foreground/70 uppercase tracking-wider block mb-1">
                Total Actions
              </span>
              <span className="text-2xl font-light text-foreground block">
                {BUILTIN_SHORTCUT_ACTIONS.length + customActions.length}
              </span>
              <span className="text-[10px] text-muted-foreground/60 mt-2 block">
                {BUILTIN_SHORTCUT_ACTIONS.length} Built-in ·{" "}
                {customActions.length} Custom
              </span>
            </div>
          </div>
        </button>
      </div>

      {/* Action: Recent Activity Section */}
      <div className="flex flex-col gap-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Recent Transformations
            </h2>
            <p className="text-xs text-muted-foreground/70 mt-0.5">
              Your latest rewrites across webpages
            </p>
          </div>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              shape="round"
              onClick={() => setActiveTab("history")}
            >
               View all
              <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3.5" />
            </Button>
          )}
        </div>

        <HistoryList
          items={history}
          onItemClick={() => setActiveTab("history")}
          getActionName={getActionName}
          limit={5}
          emptyTitle="No transformations yet"
          emptyDescription="Start using Hone to build your history"
        />
      </div>
    </div>
  );
}
