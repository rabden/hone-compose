import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button as MaterialDesign3Button } from "@/components/ui/material-design-3-button";
import { Switch as MaterialDesign3Switch } from "@/components/ui/material-design-3-switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ActionIconSelect } from "@/components/action-icon-select";
import { renderActionIcon } from "@/lib/action-icons";
import { CUSTOM_ACTION_PLACEHOLDERS } from "@/lib/shortcuts";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/material-dialog";
import { SwitchCard } from "@/components/ui/switch-card";
import { Ripple } from "@/components/ui/ripple";
import { DotmSquare12 } from "@/components/ui/dotm-square-12";
import { Badge, BadgeGroup } from "@/components/ui/badge";
import { HugeiconsIcon } from "@/components/ui/hugeicons";
import {
  PlusSignIcon,
  AiGenerativeIcon,
  SaveIcon,
  WasteIcon,
  PlayIcon,
  BadgeInfoIcon,
  ArrowLeftIcon,
  RotateClockwiseIcon,
  PackageIcon,
} from "@hugeicons/core-free-icons";
import type { CustomAction } from "../../../content/storage";
import { ACTION_PROVIDER_OPTIONS } from "./constants";

interface EditorViewProps {
  editingAction: CustomAction;
  isNewAction: boolean;
  builtinConfigs: CustomAction[];
  customConfigs: CustomAction[];
  marketplaceConfigs: CustomAction[];
  actionConfigs: CustomAction[];
  onOpenEditor: (action: CustomAction | null) => void;
  onChange: (action: CustomAction) => void;
  onBack: () => void;
  onSave: () => void;
  onSaveMarketplace: () => void;
  onReset: () => void;
  onRequestDelete: () => void;
  deleteDialogOpen: boolean;
  onDeleteDialogChange: (open: boolean) => void;
  onDelete: () => void;
  testInput: string;
  onTestInputChange: (val: string) => void;
  testResult: string;
  testLoading: boolean;
  onRunTest: () => void;
}

export function EditorView({
  editingAction,
  isNewAction,
  builtinConfigs,
  customConfigs,
  marketplaceConfigs,
  actionConfigs,
  onOpenEditor,
  onChange,
  onBack,
  onSave,
  onSaveMarketplace,
  onReset,
  onRequestDelete,
  deleteDialogOpen,
  onDeleteDialogChange,
  onDelete,
  testInput,
  onTestInputChange,
  testResult,
  testLoading,
  onRunTest,
}: EditorViewProps) {
  const isBuiltin = editingAction.type === "builtin";
  const isMarketplace = editingAction.type === "marketplace";
  const [pressedId, setPressedId] = useState<string | null>(null);
  const pressTimerRef = useRef<number | null>(null);

  // Hold the pressed (rounded) state briefly so a fast click still paints the
  // morph instead of clearing it in the same frame. The active state (isSelected)
  // keeps it rounded for as long as the item stays selected.
  const startPress = (id: string) => {
    if (pressTimerRef.current !== null) {
      window.clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setPressedId(id);
  };
  const endPress = () => {
    if (pressTimerRef.current !== null) window.clearTimeout(pressTimerRef.current);
    pressTimerRef.current = window.setTimeout(() => setPressedId(null), 180);
  };

  return (
    <>
      <div className="absolute inset-0 flex overflow-hidden animate-in fade-in duration-500 rounded-lg z-10">
        <div className="w-80 shrink-0 flex flex-col border-r border-border/30 bg-card h-full">
          <div className="shrink-0 px-6 py-4.5 border-b border-border/30">
            <div className="flex items-center gap-1 justify-between">
              <MaterialDesign3Button
                variant="ghost"
                size="sm"
                shape="round"
                onClick={onBack}
              >
                <HugeiconsIcon icon={ArrowLeftIcon} className="w-3.5 h-3.5" />
                Back
              </MaterialDesign3Button>
              <MaterialDesign3Button
                variant="default"
                size="sm"
                shape="round"
                onClick={() => onOpenEditor(null)}
              >
                <HugeiconsIcon icon={PlusSignIcon} className="w-3.5 h-3.5" />
                New Action
              </MaterialDesign3Button>
            </div>
          </div>

          <div className="relative flex-1 overflow-y-auto min-h-0">
            <div className="sticky top-0 h-6 bg-gradient-to-b from-card to-transparent z-10 pointer-events-none" />
            <div className="flex flex-col gap-3 px-6 pt-2 pb-12">
              {builtinConfigs.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-0.5">
                    Built-in
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {builtinConfigs.map((ca, idx) => {
                      const isSelected = editingAction.id === ca.id;
                      const groupLen = builtinConfigs.length;
                      const isFirst = idx === 0;
                      const isLast = idx === groupLen - 1;
                      const rounded = cn(
                        isFirst && "rounded-t-3xl",
                        isLast && "rounded-b-3xl",
                        !isFirst && "rounded-t-md",
                        !isLast && "rounded-b-md",
                      );
                      return (
                        <button
                          key={ca.id}
                          type="button"
                          onClick={() => onOpenEditor(ca)}
                          onPointerDown={() => startPress(ca.id)}
                          onPointerUp={endPress}
                          onPointerLeave={endPress}
                          data-pressed={pressedId === ca.id || isSelected}
                          style={{ animationDelay: `${idx * 40}ms` }}
                          className={cn(
                            "w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-[background-color,color,box-shadow,border-radius] duration-[600ms] ease-out data-[pressed=true]:duration-[600ms] data-[pressed=true]:delay-100 data-[pressed=true]:ease-[cubic-bezier(0.2,0.8,0.2,1.2)] data-[pressed=true]:rounded-[36px] group relative animate-in fade-in slide-in-from-left-2 fill-mode-backwards overflow-hidden border select-none",
                            rounded,
                            isSelected
                              ? "bg-background border-transparent"
                              : "bg-background border-transparent hover:bg-background/50",
                          )}
                        >
                          <Ripple />
                          <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />

                          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 relative z-10 pointer-events-none bg-foreground/[0.04]">
                            {renderActionIcon(ca.icon, {
                              size: 16,
                            })}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col gap-0.5 relative z-10 pointer-events-none">
                            <span
                              className={cn(
                                "text-xs font-semibold truncate transition-colors duration-200",
                                isSelected
                                  ? "text-foreground"
                                  : "text-muted-foreground group-hover:text-foreground",
                              )}
                            >
                              {ca.name || "Untitled Action"}
                            </span>
                            <span className="text-[10px] text-muted-foreground/50 truncate leading-normal">
                              {ca.description ||
                                ca.promptTemplate ||
                                "No description"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {customConfigs.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-0.5">
                    Custom
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {customConfigs.map((ca, idx) => {
                      const isSelected = editingAction.id === ca.id;
                      const actionColor = ca.color || "#8B5CF6";
                      const groupLen = customConfigs.length;
                      const isFirst = idx === 0;
                      const isLast = idx === groupLen - 1;
                      const rounded = cn(
                        isFirst && "rounded-t-3xl",
                        isLast && "rounded-b-3xl",
                        !isFirst && "rounded-t-md",
                        !isLast && "rounded-b-md",
                      );
                      return (
                        <button
                          key={ca.id}
                          type="button"
                          onClick={() => onOpenEditor(ca)}
                          onPointerDown={() => startPress(ca.id)}
                          onPointerUp={endPress}
                          onPointerLeave={endPress}
                          data-pressed={pressedId === ca.id || isSelected}
                          style={{ animationDelay: `${idx * 40}ms` }}
                          className={cn(
                            "w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-[background-color,color,box-shadow,border-radius] duration-[600ms] ease-out data-[pressed=true]:duration-[600ms] data-[pressed=true]:delay-100 data-[pressed=true]:ease-[cubic-bezier(0.2,0.8,0.2,1.2)] data-[pressed=true]:rounded-[36px] group relative animate-in fade-in slide-in-from-left-2 fill-mode-backwards overflow-hidden border select-none",
                            rounded,
                            isSelected
                              ? "bg-background border-transparent"
                              : "bg-background border-transparent hover:bg-background/50",
                          )}
                        >
                          <Ripple />
                          <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />

                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 relative z-10 pointer-events-none"
                            style={{
                              backgroundColor: `${actionColor}1A`,
                              border: `1px solid ${actionColor}33`,
                            }}
                          >
                            {renderActionIcon(ca.icon, {
                              size: 16,
                              color: actionColor,
                            })}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col gap-0.5 relative z-10 pointer-events-none">
                            <span
                              className={cn(
                                "text-xs font-semibold truncate transition-colors duration-200",
                                isSelected
                                  ? "text-foreground"
                                  : "text-muted-foreground group-hover:text-foreground",
                              )}
                            >
                              {ca.name || "Untitled Action"}
                            </span>
                            <span className="text-[10px] text-muted-foreground/50 truncate leading-normal">
                              {ca.description ||
                                ca.promptTemplate ||
                                "No description"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {marketplaceConfigs.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/50 px-0.5">
                    Marketplace
                  </span>
                  <div className="flex flex-col gap-0.5">
                    {marketplaceConfigs.map((ca, idx) => {
                      const isSelected = editingAction.id === ca.id;
                      const actionColor = ca.color || "#8B5CF6";
                      const groupLen = marketplaceConfigs.length;
                      const isFirst = idx === 0;
                      const isLast = idx === groupLen - 1;
                      const rounded = cn(
                        isFirst && "rounded-t-3xl",
                        isLast && "rounded-b-3xl",
                        !isFirst && "rounded-t-md",
                        !isLast && "rounded-b-md",
                      );
                      return (
                        <button
                          key={ca.id}
                          type="button"
                          onClick={() => onOpenEditor(ca)}
                          onPointerDown={() => startPress(ca.id)}
                          onPointerUp={endPress}
                          onPointerLeave={endPress}
                          data-pressed={pressedId === ca.id || isSelected}
                          style={{ animationDelay: `${idx * 40}ms` }}
                          className={cn(
                            "w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-[background-color,color,box-shadow,border-radius] duration-[600ms] ease-out data-[pressed=true]:duration-[600ms] data-[pressed=true]:delay-100 data-[pressed=true]:ease-[cubic-bezier(0.2,0.8,0.2,1.2)] data-[pressed=true]:rounded-[36px] group relative animate-in fade-in slide-in-from-left-2 fill-mode-backwards overflow-hidden border select-none",
                            rounded,
                            isSelected
                              ? "bg-background border-transparent"
                              : "bg-background border-transparent hover:bg-background/50",
                          )}
                        >
                          <Ripple />
                          <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />

                          <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 relative z-10 pointer-events-none"
                            style={{
                              backgroundColor: `${actionColor}1A`,
                              border: `1px solid ${actionColor}33`,
                            }}
                          >
                            {renderActionIcon(ca.icon, {
                              size: 16,
                              color: actionColor,
                            })}
                          </div>

                          <div className="flex-1 min-w-0 flex flex-col gap-0.5 relative z-10 pointer-events-none">
                            <span
                              className={cn(
                                "text-xs font-semibold truncate transition-colors duration-200",
                                isSelected
                                  ? "text-foreground"
                                  : "text-muted-foreground group-hover:text-foreground",
                              )}
                            >
                              {ca.name || "Untitled Action"}
                            </span>
                            <span className="text-[10px] text-muted-foreground/50 truncate leading-normal">
                              {ca.description ||
                                ca.promptTemplate ||
                                "No description"}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              {actionConfigs.length === 0 && (
                <div className="text-center py-10 flex flex-col items-center justify-center gap-2 animate-in fade-in duration-500">
                  <HugeiconsIcon icon={AiGenerativeIcon} className="w-5 h-5 text-muted-foreground/20" />
                  <p className="text-[11px] text-muted-foreground/50 leading-normal">
                    No actions found.
                  </p>
                </div>
              )}
            </div>
            <div className="sticky bottom-0 h-6 bg-gradient-to-t from-card to-transparent pointer-events-none" />
          </div>
        </div>

        <div className="flex-1 min-w-0 h-full flex flex-col overflow-hidden">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (isMarketplace) {
                onSaveMarketplace();
                return;
              }
              onSave();
            }}
            className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-3 duration-300 ease-out"
          >
            <div className="sticky top-0 z-20 px-6 py-2.5 flex items-center justify-between gap-4 border-b border-border/30 min-h-12">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 active:scale-[0.95] bg-foreground/[0.04]">
                  {renderActionIcon(editingAction.icon, {
                    size: 12,
                    color: isBuiltin
                      ? undefined
                      : editingAction.color || "#8B5CF6",
                  })}
                </div>
                <div className="min-w-0 flex flex-col">
                  <h3 className="text-xs font-semibold text-foreground truncate">
                    {editingAction.name || "New Action"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground/60 truncate">
                    {isBuiltin
                      ? "Built-in"
                      : isMarketplace
                        ? "Marketplace"
                        : isNewAction
                          ? "Creating"
                          : "Editing"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium text-muted-foreground/60 min-w-[3.5rem] text-right select-none">
                    {editingAction.enabled !== false ? "Enabled" : "Disabled"}
                  </span>
                  <MaterialDesign3Switch
                    variant="primary"
                    size="default"
                    checked={editingAction.enabled !== false}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...editingAction,
                        enabled: checked,
                      })
                    }
                    haptic="none"
                  />
                </div>

                {isBuiltin ? (
                  <MaterialDesign3Button
                    variant="ghost"
                    size="sm"
                    shape="round"
                    type="button"
                    onClick={onReset}
                  >
                    <HugeiconsIcon icon={RotateClockwiseIcon} className="w-3.5 h-3.5" />
                    Reset
                  </MaterialDesign3Button>
                ) : isMarketplace ? (
                  <MaterialDesign3Button
                    variant="destructive"
                    size="sm"
                    shape="round"
                    type="button"
                    onClick={onRequestDelete}
                  >
                    <HugeiconsIcon icon={WasteIcon} className="w-3.5 h-3.5" />
                    Uninstall
                  </MaterialDesign3Button>
                ) : !isNewAction ? (
                  <MaterialDesign3Button
                    variant="destructive"
                    size="sm"
                    shape="round"
                    type="button"
                    onClick={onRequestDelete}
                  >
                    <HugeiconsIcon icon={WasteIcon} className="w-3.5 h-3.5" />
                    Delete
                  </MaterialDesign3Button>
                ) : null}

                <MaterialDesign3Button
                  variant="default"
                  size="sm"
                  shape="round"
                  type="submit"
                >
                    <HugeiconsIcon icon={SaveIcon} className="w-3.5 h-3.5" />
                  Save Action
                </MaterialDesign3Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {isMarketplace && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-foreground/[0.03] border border-border/30 animate-in fade-in duration-300">
                  <HugeiconsIcon icon={PackageIcon} className="w-4 h-4 text-muted-foreground/50 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-muted-foreground/80 leading-relaxed">
                      Marketplace actions cannot be edited. You can
                      enable/disable or remove them.
                    </p>
                    {editingAction.author && (
                      <p className="text-[11px] text-muted-foreground/50 mt-1.5">
                        By{" "}
                        <span className="font-medium text-muted-foreground/70">
                          {editingAction.author}
                        </span>
                        {editingAction.version && (
                          <> · v{editingAction.version}</>
                        )}
                      </p>
                    )}
                    {editingAction.tags && editingAction.tags.length > 0 && (
                      <div className="mt-2">
                        <BadgeGroup>
                          {editingAction.tags.map((tag: string) => (
                            <Badge key={tag} variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                        </BadgeGroup>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-border/30">
                <div className="pr-4">
                  <Label className="text-xs font-semibold text-foreground">
                    Identity & Visuals
                  </Label>
                  <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                    {isMarketplace
                      ? "Marketplace action identity and metadata."
                      : "Define the name, description, and visual representation of your action."}
                  </p>
                </div>

                <div className="md:col-span-2 space-y-4">
                  {isMarketplace ? (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] font-semibold text-muted-foreground">
                          Action Name
                        </Label>
                        <div className="h-9 px-3 rounded-lg bg-foreground/[0.02] border border-border/40 flex items-center">
                          <span className="text-xs text-foreground/80">
                            {editingAction.name}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] font-semibold text-muted-foreground">
                          Description
                        </Label>
                        <div className="min-h-[2.25rem] px-3 py-2 rounded-lg bg-foreground/[0.02] border border-border/40 flex items-center">
                          <span className="text-xs text-muted-foreground/60">
                            {editingAction.description || "No description"}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[10px] font-semibold text-muted-foreground">
                            Icon Symbol
                          </Label>
                          <div className="flex items-center gap-2.5 h-9 px-3 rounded-lg bg-foreground/[0.02] border border-border/40">
                            {renderActionIcon(editingAction.icon, {
                              size: 14,
                            })}
                            <span className="text-xs text-muted-foreground/60">
                              {editingAction.name}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[10px] font-semibold text-muted-foreground">
                            Accent Color
                          </Label>
                          <div className="flex items-center gap-2 h-9 px-3 rounded-lg bg-foreground/[0.02] border border-border/40">
                            <div
                              className="h-4 w-4 rounded-full shrink-0"
                              style={{
                                background: editingAction.color || "#8B5CF6",
                              }}
                            />
                            <span className="text-xs text-muted-foreground/60 font-mono">
                              {editingAction.color || "#8B5CF6"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] font-semibold text-muted-foreground">
                          Action Name
                        </Label>
                        <Input
                          type="text"
                          placeholder={CUSTOM_ACTION_PLACEHOLDERS.name}
                          value={editingAction.name}
                          onChange={(e) =>
                            onChange({
                              ...editingAction,
                              name: e.target.value,
                            })
                          }
                          className="bg-background border border-border/60 rounded-lg text-xs h-9 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                          required
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label className="text-[10px] font-semibold text-muted-foreground">
                          Description{" "}
                          <span className="text-muted-foreground/50">
                            (Optional)
                          </span>
                        </Label>
                        <Input
                          type="text"
                          placeholder={CUSTOM_ACTION_PLACEHOLDERS.description}
                          value={editingAction.description || ""}
                          onChange={(e) =>
                            onChange({
                              ...editingAction,
                              description: e.target.value,
                            })
                          }
                          className="bg-background border border-border/60 rounded-lg text-xs h-9 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                        />
                      </div>
                      <div
                        className={cn(
                          "grid grid-cols-1 gap-4 pt-1",
                          !isBuiltin && "sm:grid-cols-2",
                        )}
                      >
                        <div className="flex flex-col gap-1.5">
                          <Label className="text-[10px] font-semibold text-muted-foreground">
                            Icon Symbol
                          </Label>
                          {isBuiltin ? (
                            <div className="flex items-center gap-2.5 h-9 px-3 rounded-lg bg-foreground/[0.02] border border-border/40">
                              {renderActionIcon(editingAction.icon, {
                                size: 14,
                              })}
                              <span className="text-xs text-muted-foreground/60">
                                {editingAction.name}
                              </span>
                            </div>
                          ) : (
                            <ActionIconSelect
                              value={editingAction.icon}
                              accentColor={editingAction.color || "#8B5CF6"}
                              onValueChange={(icon) =>
                                onChange({
                                  ...editingAction,
                                  icon,
                                })
                              }
                            />
                          )}
                        </div>
                        {!isBuiltin && (
                          <div className="flex flex-col gap-2">
                            <Label className="text-[10px] font-semibold text-muted-foreground">
                              Accent Color
                            </Label>
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {[
                                "#8B5CF6",
                                "#3B82F6",
                                "#10B981",
                                "#F59E0B",
                                "#EF4444",
                                "#EC4899",
                                "#06B6D4",
                                "#84CC16",
                              ].map((c) => (
                                <button
                                  key={c}
                                  type="button"
                                  onClick={() =>
                                    onChange({
                                      ...editingAction,
                                      color: c,
                                    })
                                  }
                                  className={cn(
                                    "h-6 w-6 rounded-full border p-0 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:scale-105 active:scale-[0.95] shrink-0",
                                    editingAction.color === c
                                      ? "border-foreground scale-110 ring-2 ring-foreground/25"
                                      : "border-transparent",
                                  )}
                                  style={{ background: c }}
                                  aria-label={`Color ${c}`}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-border/30">
                <div className="pr-4">
                  <Label className="text-xs font-semibold text-foreground">
                    AI Parameters
                  </Label>
                  <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                    Configure the model, parameters, and inline behavior.
                  </p>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] font-semibold text-muted-foreground">
                        API Provider
                      </Label>
                      <Select
                        value={editingAction.provider || "__default__"}
                        onValueChange={(val) =>
                          onChange({
                            ...editingAction,
                            provider: val === "__default__" ? undefined : val,
                          })
                        }
                      >
                        <SelectTrigger className="h-9 w-full justify-between rounded-lg border-border/60 bg-background text-xs transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]">
                          <SelectValue placeholder="Use global default" />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg border border-border bg-card shadow-md">
                          {ACTION_PROVIDER_OPTIONS.map((opt) => (
                            <SelectItem
                              key={opt.value}
                              value={opt.value}
                              className="text-xs"
                            >
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] font-semibold text-muted-foreground">
                        Model Identifier
                      </Label>
                      <Input
                        type="text"
                        placeholder="gpt-4o-mini"
                        value={editingAction.model || ""}
                        onChange={(e) =>
                          onChange({
                            ...editingAction,
                            model: e.target.value || undefined,
                          })
                        }
                        className="bg-background border border-border/60 rounded-lg text-xs h-9 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] font-semibold text-muted-foreground">
                        Temperature (Creativity)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        min="0"
                        max="2"
                        placeholder="0.7"
                        value={editingAction.temperature ?? ""}
                        onChange={(e) =>
                          onChange({
                            ...editingAction,
                            temperature: e.target.value
                              ? parseFloat(e.target.value)
                              : undefined,
                          })
                        }
                        className="bg-background border border-border/60 rounded-lg text-xs h-9 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                      />
                    </div>
                  </div>

                  <SwitchCard
                    label="Preview before replacing"
                    description="Show the transformation in a preview panel instead of replacing text immediately inline."
                    checked={editingAction.replaceMode === "preview"}
                    onCheckedChange={(checked) =>
                      onChange({
                        ...editingAction,
                        replaceMode: checked ? "preview" : "replace",
                      })
                    }
                    className="rounded-xl border border-border/20"
                  />
                </div>
              </div>

              {!isMarketplace && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-border/30">
                  <div className="pr-4">
                    <Label className="text-xs font-semibold text-foreground">
                      Instructions & Prompts
                    </Label>
                    <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                      Draft system context and prompt templates. Predefined
                      variables will be populated dynamically.
                    </p>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] font-semibold text-muted-foreground">
                        System Prompt{" "}
                        <span className="text-muted-foreground/50">
                          (Optional)
                        </span>
                      </Label>
                      <Textarea
                        placeholder={CUSTOM_ACTION_PLACEHOLDERS.systemPrompt}
                        value={editingAction.systemPrompt || ""}
                        onChange={(e) =>
                          onChange({
                            ...editingAction,
                            systemPrompt: e.target.value,
                          })
                        }
                        className="min-h-[70px] resize-y font-mono text-xs leading-normal border-border/60 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] font-semibold text-muted-foreground">
                        Prompt Template
                      </Label>
                      <Textarea
                        placeholder={
                          CUSTOM_ACTION_PLACEHOLDERS.promptTemplate
                        }
                        value={editingAction.promptTemplate}
                        onChange={(e) =>
                          onChange({
                            ...editingAction,
                            promptTemplate: e.target.value,
                          })
                        }
                        className="min-h-[130px] resize-y font-mono text-xs leading-normal border-border/60 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                        required
                      />
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/70 mt-0.5">
                        <span className="font-semibold bg-foreground/[0.04] px-1.5 py-0.5 rounded text-foreground font-mono">
                          {"{{input}}"}
                        </span>
                        <span>
                          represents the selected text target undergoing
                          rewriting.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!isMarketplace && editingAction.promptTemplate && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                  <div className="pr-4">
                    <Label className="text-xs font-semibold text-foreground">
                      Test Playground
                    </Label>
                    <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                      Test transformations instantly with sample text inputs.
                    </p>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <div className="flex flex-col gap-2.5">
                      <Textarea
                        placeholder={CUSTOM_ACTION_PLACEHOLDERS.testInput}
                        value={testInput}
                        onChange={(e) => onTestInputChange(e.target.value)}
                        className="min-h-[70px] resize-y font-mono text-xs border-border/60 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                      />

                      <div>
                        <MaterialDesign3Button
                          variant="default"
                          size="sm"
                          shape="round"
                          type="button"
                          disabled={!testInput.trim() || testLoading}
                          onClick={onRunTest}
                        >
                          {testLoading ? (
                            <span className="flex items-center gap-1.5">
                              <DotmSquare12 />
                              Running...
                            </span>
                          ) : (
                            <>
                              <HugeiconsIcon icon={PlayIcon} className="w-3 h-3" />
                              Run Test
                            </>
                          )}
                        </MaterialDesign3Button>
                      </div>
                    </div>

                    {testResult && (
                      <div className="animate-in fade-in slide-in-from-bottom-2 duration-200 ease-out">
                        <span className="text-[9px] uppercase font-semibold text-muted-foreground tracking-wide mb-1.5 block">
                          Transformation Output
                        </span>
                        <div
                          className="max-h-[220px] overflow-y-auto font-mono text-xs leading-relaxed p-3.5 rounded-lg border bg-foreground/[0.015] border-border/40 text-foreground/90 select-text whitespace-pre-wrap break-words"
                          tabIndex={-1}
                        >
                          {testResult}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isMarketplace && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-foreground/[0.02] border border-border/20">
                  <HugeiconsIcon icon={BadgeInfoIcon} className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                    Variables like{" "}
                    <span className="font-mono text-foreground/60">
                      {"{{input}}"}
                    </span>{" "}
                    and{" "}
                    <span className="font-mono text-foreground/60">
                      {"{{selection}}"}
                    </span>{" "}
                    are replaced dynamically when the action runs. Use the
                    test playground above to verify your template before
                    saving.
                  </p>
                </div>
              )}
            </div>
          </form>
        </div>
      </div>

      <Dialog open={deleteDialogOpen} onOpenChange={onDeleteDialogChange}>
        <DialogContent className="max-w-sm w-full min-w-[min(380px,95vw)]" onOpened={() => {}}>
          <DialogTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm font-light text-foreground">
                {editingAction?.type === "marketplace"
                  ? "Uninstall Action"
                  : "Delete Action"}
              </span>
            </div>
          </DialogTitle>
          <div className="px-6 pb-5 pt-4 flex flex-col gap-5">
            <p className="text-xs text-muted-foreground/70 leading-normal">
              {editingAction?.type === "marketplace" ? (
                <>
                  Are you sure you want to uninstall{" "}
                  <span className="font-semibold text-foreground">
                    &ldquo;{editingAction?.name}&rdquo;
                  </span>
                  ? You can reinstall it from the marketplace at any time.
                </>
              ) : (
                <>
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-foreground">
                    &ldquo;{editingAction?.name}&rdquo;
                  </span>
                  ? This cannot be undone.
                </>
              )}
            </p>
            <div className="flex gap-2 justify-end">
              <MaterialDesign3Button
                variant="ghost"
                size="sm"
                shape="round"
                onClick={() => onDeleteDialogChange(false)}
              >
                Cancel
              </MaterialDesign3Button>
              <MaterialDesign3Button
                variant="destructive"
                size="sm"
                shape="round"
                onClick={onDelete}
              >
                <HugeiconsIcon icon={WasteIcon} className="w-3.5 h-3.5" />
                {editingAction?.type === "marketplace" ? "Uninstall" : "Delete"}
              </MaterialDesign3Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
