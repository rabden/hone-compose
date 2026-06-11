import { Label } from "@/components/ui/label";
import { Button as MaterialDesign3Button } from "@/components/ui/material-design-3-button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Keyboard, ShieldAlert } from "lucide-react";
import { BUILTIN_SHORTCUT_ACTIONS, getActionLabel } from "@/lib/shortcuts";
import type { CustomAction } from "../../content/storage";

interface KeyBindingsTabProps {
  shortcutKey: string;
  setShortcutKey: (val: string) => void;
  shortcutCtrl: boolean;
  setShortcutCtrl: (val: boolean) => void;
  shortcutAlt: boolean;
  setShortcutAlt: (val: boolean) => void;
  shortcutShift: boolean;
  setShortcutShift: (val: boolean) => void;
  shortcutMeta: boolean;
  setShortcutMeta: (val: boolean) => void;
  shortcutAction: string;
  setShortcutAction: (val: string) => void;
  isRecordingKey: boolean;
  setIsRecordingKey: (val: boolean) => void;
  dropdownShortcutKey: string;
  setDropdownShortcutKey: (val: string) => void;
  dropdownShortcutCtrl: boolean;
  setDropdownShortcutCtrl: (val: boolean) => void;
  dropdownShortcutAlt: boolean;
  setDropdownShortcutAlt: (val: boolean) => void;
  dropdownShortcutShift: boolean;
  setDropdownShortcutShift: (val: boolean) => void;
  dropdownShortcutMeta: boolean;
  setDropdownShortcutMeta: (val: boolean) => void;
  isRecordingDropdownKey: boolean;
  setIsRecordingDropdownKey: (val: boolean) => void;
  customActions: CustomAction[];
}

export default function KeyBindingsTab({
  shortcutKey, setShortcutKey,
  shortcutCtrl, setShortcutCtrl,
  shortcutAlt, setShortcutAlt,
  shortcutShift, setShortcutShift,
  shortcutMeta, setShortcutMeta,
  shortcutAction, setShortcutAction,
  isRecordingKey, setIsRecordingKey,
  dropdownShortcutKey, setDropdownShortcutKey,
  dropdownShortcutCtrl, setDropdownShortcutCtrl,
  dropdownShortcutAlt, setDropdownShortcutAlt,
  dropdownShortcutShift, setDropdownShortcutShift,
  dropdownShortcutMeta, setDropdownShortcutMeta,
  isRecordingDropdownKey, setIsRecordingDropdownKey,
  customActions,
}: KeyBindingsTabProps) {
  const getShortcutDisplay = () => {
    const keys = [];
    if (shortcutCtrl) keys.push("Ctrl");
    if (shortcutAlt) keys.push("Alt");
    if (shortcutShift) keys.push("Shift");
    if (shortcutMeta) keys.push("\u2318");
    if (shortcutKey) keys.push(shortcutKey.toUpperCase());
    return keys.length > 0 ? keys.join(" + ") : "None configured";
  };

  const getDropdownShortcutDisplay = () => {
    const keys = [];
    if (dropdownShortcutCtrl) keys.push("Ctrl");
    if (dropdownShortcutAlt) keys.push("Alt");
    if (dropdownShortcutShift) keys.push("Shift");
    if (dropdownShortcutMeta) keys.push("\u2318");
    if (dropdownShortcutKey) keys.push(dropdownShortcutKey.toUpperCase());
    return keys.length > 0 ? keys.join(" + ") : "None configured";
  };

  const isKnownShortcutAction = (id: string) =>
    BUILTIN_SHORTCUT_ACTIONS.some((a) => a.id === id) ||
    customActions.some((a) => a.id === id);

  const getActionName = (actionCode: string) =>
    getActionLabel(actionCode, customActions);

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500 w-full py-4 mx-auto max-w-4xl">
      <div className="space-y-3">
        <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Key Bindings
        </span>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground leading-tight">
          Key Bindings
        </h1>
        <p className="text-sm text-muted-foreground/80 max-w-2xl leading-relaxed">
          Configure fast global and contextual keyboard shortcuts
          to trigger your text transformations on any webpage.
        </p>
      </div>

      <div className="flex flex-col">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
          <div className="pr-4">
            <Label className="text-xs font-semibold text-foreground">
              Text Transformation Shortcut
            </Label>
            <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
              Combination to execute the chosen transformation
              action instantly on your focused or highlighted text.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="flex gap-3 items-center">
              <div className="bg-background rounded-lg px-4 py-3.5 text-xs text-center flex-1 font-mono font-semibold text-foreground flex items-center justify-center gap-2 select-none min-h-[50px]">
                {isRecordingKey ? (
                  <span className="animate-pulse text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 bg-foreground rounded-full animate-ping" />
                    Press shortcut or Esc to cancel
                  </span>
                ) : (
                  getShortcutDisplay()
                )}
              </div>

              <MaterialDesign3Button
                variant="default"
                size="default"
                shape="round"
                type="button"
                onClick={() => {
                  setShortcutKey("");
                  setShortcutCtrl(false);
                  setShortcutAlt(false);
                  setShortcutShift(false);
                  setShortcutMeta(false);
                  setIsRecordingKey(true);
                }}
              >
                <Keyboard className="w-3.5 h-3.5" />
                Record
              </MaterialDesign3Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
          <div className="pr-4">
            <Label className="text-xs font-semibold text-foreground">
              Shortcut Trigger Action
            </Label>
            <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
              Action that will run when the text transformation key combination is pressed.
            </p>
          </div>
          <div className="md:col-span-2">
            <Select
              value={shortcutAction}
              onValueChange={(val) => setShortcutAction(val)}
            >
              <SelectTrigger className="bg-background border border-border/60 rounded-lg text-xs h-9 justify-between w-full">
                <SelectValue placeholder="Select shortcut action..." />
              </SelectTrigger>
              <SelectContent className="bg-card border border-border rounded-lg shadow-sm max-h-72">
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                    Built-in actions
                  </SelectLabel>
                  {BUILTIN_SHORTCUT_ACTIONS.map((action) => (
                    <SelectItem
                      key={action.id}
                      value={action.id}
                      className="text-xs"
                    >
                      {action.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
                {customActions.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1">
                      Custom actions
                    </SelectLabel>
                    {customActions.map((action) => (
                      <SelectItem
                        key={action.id}
                        value={action.id}
                        className="text-xs"
                      >
                        {action.name || "Untitled action"}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
                {shortcutAction &&
                  !isKnownShortcutAction(shortcutAction) && (
                    <SelectGroup>
                      <SelectItem
                        value={shortcutAction}
                        className="text-xs text-muted-foreground"
                      >
                        {getActionName(shortcutAction)} (unavailable)
                      </SelectItem>
                    </SelectGroup>
                  )}
              </SelectContent>
            </Select>

            <div className="flex gap-3 text-xs text-muted-foreground leading-relaxed px-4 py-3 rounded-lg bg-foreground/[0.02] border border-border/30 mt-4 animate-in fade-in duration-200">
              <ShieldAlert className="w-4 h-4 shrink-0 text-foreground/40 mt-0.5" />
              <div>
                <strong className="text-foreground/80">Pro Tip:</strong>{" "}
                Pressing this combination while focusing on any input or textarea on any webpage will extract the selected text (or all text if nothing is selected) and replace it with the corrected version from your active AI provider.
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
          <div className="pr-4">
            <Label className="text-xs font-semibold text-foreground">
              Menu Toggle Shortcut
            </Label>
            <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
              Key combination to trigger the contextual dropdown helper menu on active inputs.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="flex gap-3 items-center">
              <div className="bg-background rounded-lg px-4 py-3.5 text-xs text-center flex-1 font-mono font-semibold text-foreground flex items-center justify-center gap-2 select-none min-h-[50px]">
                {isRecordingDropdownKey ? (
                  <span className="animate-pulse text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 bg-foreground rounded-full animate-ping" />
                    Press shortcut or Esc to cancel
                  </span>
                ) : (
                  getDropdownShortcutDisplay()
                )}
              </div>

              <MaterialDesign3Button
                variant="default"
                size="default"
                shape="round"
                type="button"
                onClick={() => {
                  setDropdownShortcutKey("");
                  setDropdownShortcutCtrl(false);
                  setDropdownShortcutAlt(false);
                  setDropdownShortcutShift(false);
                  setDropdownShortcutMeta(false);
                  setIsRecordingDropdownKey(true);
                }}
              >
                <Keyboard className="w-3.5 h-3.5" />
                Record
              </MaterialDesign3Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
