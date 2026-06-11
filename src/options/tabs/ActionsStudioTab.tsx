import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";
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
import {
  DEFAULT_ACTION_ICON,
  normalizeActionIconName,
  renderActionIcon,
} from "@/lib/action-icons";
import { CUSTOM_ACTION_PLACEHOLDERS } from "@/lib/shortcuts";
import {
  saveActionConfig,
  saveAllActionConfigs,
  deleteActionConfig,
  loadAllActionConfigs,
} from "../../content/storage";
import { BUILTIN_ACTION_DEFAULTS } from "../../content/builtin-defaults";
import type { CustomAction } from "../../content/storage";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/material-dialog";
import { SwitchCard } from "@/components/ui/switch-card";
import { Ripple } from "@/components/ui/ripple";
import { DotmSquare12 } from "@/components/ui/dotm-square-12";
import {
  Plus,
  Wand2,
  Save,
  Trash2,
  Play,
  Info,
  ArrowLeft,
  RotateCcw,
} from "lucide-react";

const ACTION_PROVIDER_OPTIONS = [
  { value: "__default__", label: "Use global default" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Gemini" },
  { value: "openrouter", label: "OpenRouter Free" },
  { value: "openrouter_paid", label: "OpenRouter Paid" },
  { value: "google_ai_studio", label: "Google AI Studio" },
  { value: "groq", label: "Groq" },
] as const;

interface ActionsStudioTabProps {
  actionConfigs: CustomAction[];
  setActionConfigs: (configs: CustomAction[]) => void;
  editingAction: CustomAction | null;
  setEditingAction: (action: CustomAction | null) => void;
  isNewAction: boolean;
  setIsNewAction: (val: boolean) => void;
  testInput: string;
  setTestInput: (val: string) => void;
  testResult: string;
  setTestResult: (val: string) => void;
  testLoading: boolean;
  setTestLoading: (val: boolean) => void;
  triggerSaveStatus: (message: string, type: "success" | "error") => void;
}

export default function ActionsStudioTab({
  actionConfigs,
  setActionConfigs,
  editingAction,
  setEditingAction,
  isNewAction,
  setIsNewAction,
  testInput,
  setTestInput,
  testResult,
  setTestResult,
  testLoading,
  setTestLoading,
  triggerSaveStatus,
}: ActionsStudioTabProps) {
  const [viewMode, setViewMode] = useState<"overview" | "editor">("overview");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const builtinConfigs = useMemo(
    () => actionConfigs.filter((a) => a.type === "builtin"),
    [actionConfigs],
  );
  const customConfigs = useMemo(
    () => actionConfigs.filter((a) => a.type === "custom" || !a.type),
    [actionConfigs],
  );

  const handleOpenEditor = (action: CustomAction | null) => {
    if (action) {
      setEditingAction(action);
      setIsNewAction(false);
    } else {
      setEditingAction({
        id: crypto.randomUUID(),
        name: "",
        description: "",
        promptTemplate: "",
        systemPrompt: "",
        icon: DEFAULT_ACTION_ICON,
        color: "#8B5CF6",
        type: "custom",
        category: "custom",
        replaceMode: "replace",
        enabled: true,
        createdAt: Date.now(),
      });
      setIsNewAction(true);
    }
    setViewMode("editor");
  };

  const handleBackToOverview = () => {
    setEditingAction(null);
    setIsNewAction(false);
    setViewMode("overview");
  };

  const handleSave = async () => {
    if (!editingAction) return;
    const updated = {
      ...editingAction,
      icon: normalizeActionIconName(editingAction.icon),
      color: editingAction.color || "#8B5CF6",
    };
    await saveActionConfig(updated);
    const all = await loadAllActionConfigs();
    setActionConfigs(all);
    setIsNewAction(false);
    triggerSaveStatus("Action saved successfully!", "success");
  };

  const handleResetBuiltin = async () => {
    if (!editingAction || editingAction.type !== "builtin") return;
    const defaults = await loadAllActionConfigs();
    const defaultAction = BUILTIN_ACTION_DEFAULTS.find(
      (d) => d.id === editingAction.id,
    );
    if (!defaultAction) return;
    const idx = defaults.findIndex((a) => a.id === editingAction.id);
    if (idx >= 0) {
      defaults[idx] = { ...defaultAction };
    } else {
      defaults.push({ ...defaultAction });
    }
    await saveAllActionConfigs(defaults);
    setActionConfigs(defaults);
    setEditingAction({ ...defaultAction });
    triggerSaveStatus("Action reset to defaults.", "success");
  };

  const handleDelete = async () => {
    if (!editingAction) return;
    await deleteActionConfig(editingAction.id);
    const all = await loadAllActionConfigs();
    setActionConfigs(all);
    setEditingAction(null);
    setViewMode("overview");
    setDeleteDialogOpen(false);
    triggerSaveStatus("Action deleted.", "success");
  };

  if (viewMode === "overview") {
    return (
      <div className="flex flex-col gap-10 animate-in fade-in duration-500 w-full py-4 mx-auto max-w-4xl">
        <div className="space-y-3">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Editor
          </span>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground leading-tight">
                Actions Studio
              </h1>
              <p className="text-sm text-muted-foreground/80 max-w-2xl leading-relaxed mt-1">
                Manage all AI text transformation actions — built-in and custom.
              </p>
            </div>
            <MaterialDesign3Button
              variant="default"
              size="default"
              shape="round"
              onClick={() => handleOpenEditor(null)}
              className="shrink-0 mt-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Create New Action
            </MaterialDesign3Button>
          </div>
        </div>

        {actionConfigs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 animate-in fade-in duration-500">
            <Wand2 className="w-7 h-7 text-muted-foreground/20 stroke-[1]" />
            <p className="text-muted-foreground text-xs font-medium">
              No actions found.
            </p>
            <p className="text-muted-foreground/50 text-[10px]">
              Click "Create New Action" above to build your first transformation.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {builtinConfigs.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-0.5">
                  Built-in Actions
                </span>
                <ActionCardGrid
                  actions={builtinConfigs}
                  onActionClick={handleOpenEditor}
                />
              </div>
            )}
            {customConfigs.length > 0 && (
              <div className="flex flex-col gap-3">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60 px-0.5">
                  Custom Actions
                </span>
                <ActionCardGrid
                  actions={customConfigs}
                  onActionClick={handleOpenEditor}
                />
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  const isBuiltin = editingAction?.type === "builtin";

  return (
    <>
    <div className="absolute inset-0 flex overflow-hidden animate-in fade-in duration-500 rounded-lg z-10">
      <div className="w-80 shrink-0 flex flex-col border-r border-border/30 bg-card h-full">
        <div className="shrink-0 px-6 pt-6 pb-3 border-b border-border/30">
          <div className="flex items-center gap-1 justify-between">
            <MaterialDesign3Button
              variant="ghost"
              size="sm"
              shape="round"
              onClick={handleBackToOverview}
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back
            </MaterialDesign3Button>
            <MaterialDesign3Button
              variant="default"
              size="sm"
              shape="round"
              onClick={() => handleOpenEditor(null)}
            >
              <Plus className="w-3.5 h-3.5" />
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
                  const isSelected = editingAction?.id === ca.id;
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
                      onClick={() => handleOpenEditor(ca)}
                      style={{ animationDelay: `${idx * 40}ms` }}
                     className={cn(
                         "w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-all duration-200 ease-out group relative animate-in fade-in slide-in-from-left-2 fill-mode-backwards overflow-hidden border",
                         rounded,
                         isSelected
                           ? "bg-background/20 border-foreground/30"
                           : "bg-background border-transparent hover:bg-background/50 active:scale-[0.98]",
                       )}
                    >
                      <Ripple />
                      <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />

                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all duration-200 relative z-10 pointer-events-none bg-foreground/[0.04]"
                      >
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
                          {ca.description || ca.promptTemplate || "No description"}
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
                  const isSelected = editingAction?.id === ca.id;
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
                      onClick={() => handleOpenEditor(ca)}
                      style={{ animationDelay: `${idx * 40}ms` }}
                     className={cn(
                         "w-full flex items-center gap-3.5 px-4 py-3.5 text-left transition-all duration-200 ease-out group relative animate-in fade-in slide-in-from-left-2 fill-mode-backwards overflow-hidden border",
                         rounded,
                         isSelected
                           ? "bg-background/20 border-foreground/30"
                           : "bg-background border-transparent hover:bg-background/50 active:scale-[0.98]",
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
                          {ca.description || ca.promptTemplate || "No description"}
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
              <Wand2 className="w-5 h-5 text-muted-foreground/20 stroke-[1]" />
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
        {!editingAction ? (
          <div className="h-full flex flex-col items-center justify-center text-center py-20 px-6 animate-in fade-in duration-500">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4">
              <Wand2 className="w-6 h-6 text-muted-foreground/30 stroke-[1]" />
            </div>
            <h3 className="text-sm font-light text-foreground">
              Select or Create an Action
            </h3>
            <p className="text-xs text-muted-foreground/60 mt-1.5 max-w-xs leading-normal">
              Choose an action from the list on the left to edit its template, or click Create New Action to build your own custom text transformation.
            </p>
          </div>
        ) : (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await handleSave();
            }}
            className="flex-1 flex flex-col min-h-0 animate-in fade-in slide-in-from-right-3 duration-300 ease-out"
          >
            <div className="sticky top-0 z-20 px-6 py-2.5 flex items-center justify-between gap-4 border-b border-border/30 min-h-12">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 active:scale-[0.95] bg-foreground/[0.04]"
                >
                  {renderActionIcon(editingAction.icon, {
                    size: 12,
                    color: isBuiltin ? undefined : (editingAction.color || "#8B5CF6"),
                  })}
                </div>
                <div className="min-w-0 flex flex-col">
                  <h3 className="text-xs font-semibold text-foreground truncate">
                    {editingAction.name || "New Action"}
                  </h3>
                  <p className="text-[10px] text-muted-foreground/60 truncate">
                    {isBuiltin ? "Built-in" : isNewAction ? "Creating" : "Editing"}
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
                      setEditingAction({
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
                    onClick={handleResetBuiltin}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Reset
                  </MaterialDesign3Button>
                ) : !isNewAction ? (
                  <MaterialDesign3Button
                    variant="destructive"
                    size="sm"
                    shape="round"
                    type="button"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </MaterialDesign3Button>
                ) : null}

                <MaterialDesign3Button
                  variant="default"
                  size="sm"
                  shape="round"
                  type="submit"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Action
                </MaterialDesign3Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-border/30">
                <div className="pr-4">
                  <Label className="text-xs font-semibold text-foreground">
                    Identity & Visuals
                  </Label>
                  <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                    Define the name, description, and visual representation of your action.
                  </p>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[10px] font-semibold text-muted-foreground">
                      Action Name
                    </Label>
                    <Input
                      type="text"
                      placeholder={CUSTOM_ACTION_PLACEHOLDERS.name}
                      value={editingAction.name}
                      onChange={(e) =>
                        setEditingAction({
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
                      <span className="text-muted-foreground/50">(Optional)</span>
                    </Label>
                    <Input
                      type="text"
                      placeholder={CUSTOM_ACTION_PLACEHOLDERS.description}
                      value={editingAction.description || ""}
                      onChange={(e) =>
                        setEditingAction({
                          ...editingAction,
                          description: e.target.value,
                        })
                      }
                      className="bg-background border border-border/60 rounded-lg text-xs h-9 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                    />
                  </div>

                  <div className={cn("grid grid-cols-1 gap-4 pt-1", !isBuiltin && "sm:grid-cols-2")}>
                    <div className="flex flex-col gap-1.5">
                      <Label className="text-[10px] font-semibold text-muted-foreground">
                        Icon Symbol
                      </Label>
                      {isBuiltin ? (
                        <div className="flex items-center gap-2.5 h-9 px-3 rounded-lg bg-foreground/[0.02] border border-border/40">
                          {renderActionIcon(editingAction.icon, { size: 14 })}
                          <span className="text-xs text-muted-foreground/60">
                            {editingAction.name}
                          </span>
                        </div>
                      ) : (
                      <ActionIconSelect
                        value={editingAction.icon}
                        accentColor={editingAction.color || "#8B5CF6"}
                        onValueChange={(icon) =>
                          setEditingAction({
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
                              setEditingAction({
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
                          setEditingAction({
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
                          setEditingAction({
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
                          setEditingAction({
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

                    <div className="rounded-xl border border-border/20 p-0.5">
                    <SwitchCard
                      label="Preview before replacing"
                      description="Show the transformation in a preview panel instead of replacing text immediately inline."
                      checked={editingAction.replaceMode === "preview"}
                      onCheckedChange={(checked) =>
                        setEditingAction({
                          ...editingAction,
                          replaceMode: checked ? "preview" : "replace",
                        })
                      }
                      className="rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pb-5 border-b border-border/30">
                <div className="pr-4">
                  <Label className="text-xs font-semibold text-foreground">
                    Instructions & Prompts
                  </Label>
                  <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                    Draft system context and prompt templates. Predefined variables will be populated dynamically.
                  </p>
                </div>

                <div className="md:col-span-2 space-y-4">
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-[10px] font-semibold text-muted-foreground">
                      System Prompt{" "}
                      <span className="text-muted-foreground/50">(Optional)</span>
                    </Label>
                    <Textarea
                      placeholder={CUSTOM_ACTION_PLACEHOLDERS.systemPrompt}
                      value={editingAction.systemPrompt || ""}
                      onChange={(e) =>
                        setEditingAction({
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
                      placeholder={CUSTOM_ACTION_PLACEHOLDERS.promptTemplate}
                      value={editingAction.promptTemplate}
                      onChange={(e) =>
                        setEditingAction({
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
                        represents the selected text target undergoing rewriting.
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {editingAction.promptTemplate && (
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
                        onChange={(e) => setTestInput(e.target.value)}
                        className="min-h-[70px] resize-y font-mono text-xs border-border/60 transition-[border-color,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:border-foreground/40 focus:shadow-[0_0_0_2px_rgba(255,255,255,0.03)]"
                      />

                      <div>
                        <MaterialDesign3Button
                          variant="default"
                          size="sm"
                          shape="round"
                          type="button"
                          disabled={!testInput.trim() || testLoading}
                          onClick={async () => {
                            setTestLoading(true);
                            setTestResult("");
                            try {
                              const response = await chrome.runtime.sendMessage({
                                type: "PROCESS_TEXT",
                                action: editingAction.id,
                                text: testInput,
                              });
                              if (response?.success && response.text) {
                                setTestResult(response.text);
                              } else {
                                setTestResult(
                                  `Error: ${response?.error || "Unknown error"}`,
                                );
                              }
                            } catch (err: unknown) {
                              setTestResult(
                                `Error: ${(err as Error).message}`,
                              );
                            }
                            setTestLoading(false);
                          }}
                        >
                          {testLoading ? (
                            <span className="flex items-center gap-1.5">
                              <DotmSquare12 />
                              Running...
                            </span>
                          ) : (
                            <>
                              <Play className="w-3 h-3" />
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

              <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-foreground/[0.02] border border-border/20">
                <Info className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0 mt-0.5 stroke-[1.5]" />
                <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                  Variables like{" "}
                  <span className="font-mono text-foreground/60">{"{{input}}"}</span> and{" "}
                  <span className="font-mono text-foreground/60">{"{{selection}}"}</span>{" "}
                  are replaced dynamically when the action runs. Use the test playground above to verify your template before saving.
                </p>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>

    <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
      <DialogContent className="max-w-sm w-full" onOpened={() => {}}>
        <DialogTitle>
          <div className="flex items-center gap-2">
            <span className="text-sm font-light text-foreground">
              Delete Action
            </span>
          </div>
        </DialogTitle>
        <div className="px-6 pb-5 pt-4 flex flex-col gap-5">
          <p className="text-xs text-muted-foreground/70 leading-normal">
            Are you sure you want to delete{" "}
            <span className="font-semibold text-foreground">
              &ldquo;{editingAction?.name}&rdquo;
            </span>
            ? This cannot be undone.
          </p>
          <div className="flex gap-2 justify-end">
            <MaterialDesign3Button
              variant="ghost"
              size="sm"
              shape="round"
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancel
            </MaterialDesign3Button>
            <MaterialDesign3Button
              variant="destructive"
              size="sm"
              shape="round"
              onClick={handleDelete}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </MaterialDesign3Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}

function ActionCardGrid({
  actions,
  onActionClick,
}: {
  actions: CustomAction[];
  onActionClick: (action: CustomAction) => void;
}) {
  const columns = 3;
  const gap = 2;

  function getRounded(index: number, total: number): string {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const totalRows = Math.ceil(total / columns);
    const itemsInLastRow = total - (totalRows - 1) * columns;
    const isFirstRow = row === 0;
    const isLastRow = row === totalRows - 1;
    const isFirstCol = col === 0;
    const isLastCol =
      col === (isLastRow ? itemsInLastRow - 1 : columns - 1);
    const colHasItemInLastRow = col < itemsInLastRow;
    const isVisualBottom = colHasItemInLastRow ? isLastRow : row === totalRows - 2;

    return cn(
      isFirstRow && isFirstCol && "rounded-tl-3xl",
      isFirstRow && isLastCol && "rounded-tr-3xl",
      isVisualBottom && isFirstCol && "rounded-bl-3xl",
      isVisualBottom && isLastCol && "rounded-br-3xl",
      !isFirstRow && "rounded-t-md",
      !isVisualBottom && "rounded-b-md",
      !isFirstCol && "rounded-l-md",
      !isLastCol && "rounded-r-md",
    );
  }

  return (
    <div
      className="flex flex-wrap"
      style={{ gap: `${gap}px` }}
    >
      {actions.map((action, index) => {
        const rounded = getRounded(index, actions.length);
        const actionColor = action.color || "#8B5CF6";
        const isBuiltin = action.type === "builtin";

        return (
          <button
            key={action.id}
            type="button"
            onClick={() => onActionClick(action)}
            style={{
              width: `calc((100% - ${gap * (columns - 1)}px) / ${columns})`,
            }}
            className={cn(
              "relative flex flex-col text-left transition-all duration-200 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/20 overflow-hidden group border",
              rounded,
              "bg-background hover:bg-background/50 hover:shadow-sm active:scale-[0.98] border-transparent",
            )}
          >
            <Ripple />
            <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />
            <div className="relative z-10 pointer-events-none flex items-start gap-3.5 p-4">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5",
                  isBuiltin && "bg-foreground/[0.04]",
                )}
                style={isBuiltin ? {} : {
                  backgroundColor: `${actionColor}1A`,
                  border: `1px solid ${actionColor}33`,
                }}
              >
                {renderActionIcon(action.icon, {
                  size: 15,
                  color: isBuiltin ? undefined : actionColor,
                })}
              </div>
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <span className="text-xs font-semibold text-foreground truncate">
                  {action.name || "Untitled Action"}
                </span>
                <span className="text-[10px] text-muted-foreground/60 leading-normal line-clamp-2">
                  {action.description || action.promptTemplate || "No description"}
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={cn(
                      "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                      action.enabled !== false
                        ? "text-emerald-500/80 bg-emerald-500/8"
                        : "text-muted-foreground/40 bg-foreground/[0.03]",
                    )}
                  >
                    {action.enabled !== false ? "Active" : "Disabled"}
                  </span>
                  {isBuiltin && (
                    <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full text-muted-foreground/50 bg-foreground/[0.03]">
                      Built-in
                    </span>
                  )}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
