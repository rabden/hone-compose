import { useState, useEffect } from "react";
import { Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button as MaterialDesign3Button } from "@/components/ui/material-design-3-button";
import { Switch as MaterialDesign3Switch } from "@/components/ui/material-design-3-switch";
import { HoneLogo } from "@/components/hone-logo";
import { formatShortcutCombo, getActionLabel } from "@/lib/shortcuts";
import { loadCustomActions } from "../content/storage";

interface ManifestCommand {
  name: string;
  description: string;
  shortcut: string;
}

export default function Popup() {
  const [provider, setProvider] = useState("openrouter");
  const [model, setModel] = useState("google/gemma-2-9b-it:free");
  const [hideDot, setHideDot] = useState(false);
  const [menuShortcut, setMenuShortcut] = useState<string | null>(null);
  const [quickShortcut, setQuickShortcut] = useState<string | null>(null);
  const [quickActionLabel, setQuickActionLabel] = useState<string | null>(null);
  const [manifestCommands, setManifestCommands] = useState<ManifestCommand[]>(
    [],
  );

  useEffect(() => {
    chrome.storage.local.get(
      [
        "activeProvider",
        "openaiModel",
        "anthropicModel",
        "geminiModel",
        "openrouterModel",
        "openrouterPaidModel",
        "googleAiStudioModel",
        "shortcutKey",
        "shortcutCtrl",
        "shortcutAlt",
        "shortcutShift",
        "shortcutMeta",
        "shortcutAction",
        "dropdownShortcutKey",
        "dropdownShortcutCtrl",
        "dropdownShortcutAlt",
        "dropdownShortcutShift",
        "dropdownShortcutMeta",
        "hideDot",
      ],
      async (res: Record<string, unknown>) => {
        const active = (res.activeProvider as string) || "openrouter";
        setProvider(active);

        if (active === "openai")
          setModel((res.openaiModel as string) || "gpt-4o-mini");
        else if (active === "anthropic")
          setModel(
            (res.anthropicModel as string) || "claude-3-5-sonnet-20241022",
          );
        else if (active === "gemini")
          setModel((res.geminiModel as string) || "gemini-1.5-flash");
        else if (active === "openrouter_paid")
          setModel((res.openrouterPaidModel as string) || "custom model");
        else if (active === "google_ai_studio")
          setModel(
            (res.googleAiStudioModel as string) || "gemma-4-26b-a4b-it",
          );
        else
          setModel(
            (res.openrouterModel as string) || "google/gemma-4-26b-a4b-it:free",
          );

        setMenuShortcut(
          formatShortcutCombo({
            key: (res.dropdownShortcutKey as string) || "d",
            ctrl: !!res.dropdownShortcutCtrl,
            alt:
              res.dropdownShortcutAlt !== undefined
                ? !!res.dropdownShortcutAlt
                : true,
            shift:
              res.dropdownShortcutShift !== undefined
                ? !!res.dropdownShortcutShift
                : true,
            meta: !!res.dropdownShortcutMeta,
          }),
        );

        const quick = formatShortcutCombo({
          key: res.shortcutKey as string | undefined,
          ctrl: !!res.shortcutCtrl,
          alt: !!res.shortcutAlt,
          shift: !!res.shortcutShift,
          meta: !!res.shortcutMeta,
        });
        setQuickShortcut(quick);
        if (quick && res.shortcutAction) {
          const custom = await loadCustomActions();
          setQuickActionLabel(
            getActionLabel(res.shortcutAction as string, custom),
          );
        } else {
          setQuickActionLabel(null);
        }

        setHideDot(!!res.hideDot);
      },
    );

    chrome.commands.getAll((commands) => {
      const mapped: ManifestCommand[] = [];
      for (const cmd of commands) {
        if (!cmd.shortcut || !cmd.name || cmd.name === "_execute_action") {
          continue;
        }
        mapped.push({
          name: cmd.name,
          description: cmd.description || cmd.name,
          shortcut: cmd.shortcut,
        });
      }
      setManifestCommands(mapped);
    });
  }, []);

  const toggleHideDot = async (checked: boolean) => {
    setHideDot(checked);
    await chrome.storage.local.set({ hideDot: checked });
  };

  const openOptions = () => {
    chrome.runtime.openOptionsPage();
  };

  const getProviderName = (prov: string) => {
    const names: Record<string, string> = {
      openrouter: "OpenRouter Free",
      openrouter_paid: "OpenRouter Paid",
      openai: "OpenAI",
      anthropic: "Anthropic Claude",
      gemini: "Google Gemini",
      google_ai_studio: "Google AI Studio",
    };
    return names[prov] || prov;
  };

  return (
    <div className="w-[560px] bg-background text-foreground select-none p-5 flex flex-col gap-4 font-sans antialiased">
      {/* Header */}
      <div className="flex items-center justify-between animate-in fade-in duration-500">
        <div className="flex items-center gap-2.5">
          <HoneLogo size={20} alt="Hone Logo" />
          <span className="text-xs font-light tracking-tight text-foreground">
            Hone compose
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground/40 font-mono">
          v{chrome.runtime.getManifest().version}
        </span>
      </div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-2 gap-4 items-stretch">

        {/* LEFT COLUMN */}
        <div className="flex flex-col gap-3 min-w-0">
          {/* Active Engine — double-bezel card */}
          <div className="rounded-xl border border-border/20 bg-foreground/[0.01] p-0.5 animate-in fade-in slide-in-from-left-2 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] fill-mode-backwards">
            <div className="flex flex-col gap-2 rounded-[calc(0.75rem-2px)] bg-foreground/[0.02] p-3.5">
              <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-[0.15em] font-semibold">
                Engine
              </span>
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-foreground leading-none">
                  {getProviderName(provider)}
                </span>
                <span
                  className="text-[9px] text-muted-foreground/50 font-mono mt-0.5 truncate"
                  title={model}
                >
                  {model}
                </span>
              </div>
            </div>
          </div>

          {/* Shortcuts Section */}
          <div className="flex flex-col gap-2.5 animate-in fade-in slide-in-from-left-2 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] fill-mode-backwards" style={{ animationDelay: "80ms" }}>
            <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-[0.15em] font-semibold">
              Key Bindings
            </span>

            <div className="flex flex-col gap-2">
              {/* Open Menu Shortcut */}
              <div className="flex items-center justify-between min-w-0">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-medium text-foreground">
                    Actions menu
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 leading-none">
                    Open the dropdown
                  </span>
                </div>
                <Badge variant="secondary" className="font-mono text-[9px] py-0.5 px-1.5 border-none shrink-0 bg-foreground/[0.04] text-foreground/70">
                  {menuShortcut || "Alt+Shift+D"}
                </Badge>
              </div>

              {/* Quick Action Shortcut */}
              <div className="flex items-center justify-between min-w-0">
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-xs font-medium text-foreground">
                    Quick action
                  </span>
                  <span className="text-[10px] text-muted-foreground/60 leading-none truncate max-w-[150px]" title={quickActionLabel || "Runs default transformation"}>
                    {quickActionLabel ? `"${quickActionLabel}"` : "Not set"}
                  </span>
                </div>
                {quickShortcut ? (
                  <Badge variant="secondary" className="font-mono text-[9px] py-0.5 px-1.5 border-none shrink-0 bg-foreground/[0.04] text-foreground/70">
                    {quickShortcut}
                  </Badge>
                ) : (
                  <span className="text-[9px] text-muted-foreground/30 shrink-0">
                    —
                  </span>
                )}
              </div>

              {/* Built-in system commands */}
              {manifestCommands.length > 0 && (
                <>
                  <div className="h-px bg-border/20 my-0.5" />
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] font-mono text-muted-foreground/40 uppercase tracking-[0.15em] font-semibold">
                      System
                    </span>
                    {manifestCommands.map((cmd) => (
                      <div
                        key={cmd.name}
                        className="flex items-center justify-between min-w-0"
                      >
                        <span className="text-[11px] text-muted-foreground truncate max-w-[150px]">
                          {cmd.description}
                        </span>
                        <Badge variant="outline" className="font-mono text-[8px] py-0 px-1 shrink-0 bg-transparent border-border/20 text-muted-foreground/50">
                          {cmd.shortcut}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="flex flex-col gap-3 min-w-0">
          {/* Quick Start Guide — double-bezel card */}
          <div className="flex-1 rounded-xl border border-border/20 bg-foreground/[0.01] p-0.5 animate-in fade-in slide-in-from-right-2 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] fill-mode-backwards" style={{ animationDelay: "40ms" }}>
            <div className="flex flex-col gap-3 rounded-[calc(0.75rem-2px)] bg-foreground/[0.02] p-3.5 h-full">
              <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-[0.15em] font-semibold">
                How to Use
              </span>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="text-[9px] font-mono text-muted-foreground/30 mt-px shrink-0 w-3 text-right">1</span>
                  <span className="text-[11px] text-muted-foreground leading-relaxed">
                    Select any input or textarea on a web page.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-[9px] font-mono text-muted-foreground/30 mt-px shrink-0 w-3 text-right">2</span>
                  <span className="text-[11px] text-muted-foreground leading-relaxed">
                    Press <kbd className="font-mono bg-foreground/[0.04] px-1 py-px rounded text-[9px] text-foreground/70 border border-border/30">{menuShortcut || "Alt+Shift+D"}</kbd> or click the dot.
                  </span>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="text-[9px] font-mono text-muted-foreground/30 mt-px shrink-0 w-3 text-right">3</span>
                  <span className="text-[11px] text-muted-foreground leading-relaxed">
                    Pick an action — text transforms in-place.
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Hide Floating Trigger Dot row */}
          <div className="rounded-lg border border-border/20 bg-foreground/[0.01] p-0.5 animate-in fade-in slide-in-from-right-2 duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] fill-mode-backwards" style={{ animationDelay: "120ms" }}>
            <button
              type="button"
              onClick={() => toggleHideDot(!hideDot)}
              className="flex items-center justify-between w-full rounded-[calc(0.5rem-2px)] bg-foreground/[0.02] hover:bg-foreground/[0.04] px-3 py-2.5 cursor-pointer transition-colors duration-200 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-medium text-foreground leading-none cursor-pointer">
                  Hide floating dot
                </span>
                <span className="text-[10px] text-muted-foreground/60 leading-none">
                  Keyboard-only mode
                </span>
              </div>
              <MaterialDesign3Switch
                variant="primary"
                size="sm"
                checked={hideDot}
                onCheckedChange={toggleHideDot}
                haptic="none"
              />
            </button>
          </div>

          {/* Footer Settings Button */}
          <MaterialDesign3Button
            variant="default"
            size="default"
            shape="round"
            onClick={openOptions}
            className="w-full shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            Open settings
          </MaterialDesign3Button>
        </div>
      </div>
    </div>
  );
}
