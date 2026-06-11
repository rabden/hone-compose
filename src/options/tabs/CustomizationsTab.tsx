import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { RadioCardGroupGrouped } from "@/components/ui/radio-card";
import { SwitchCardGroup } from "@/components/ui/switch-card";
import type { AutoSpellcheckMode } from "../../content/storage";

interface CustomizationsTabProps {
  hideDot: boolean;
  setHideDot: (val: boolean) => void;
  previewInCard: boolean;
  setPreviewInCard: (val: boolean) => void;
  autoSpellcheckMode: AutoSpellcheckMode;
  setAutoSpellcheckMode: (val: AutoSpellcheckMode) => void;
  autoSpellcheckWordThreshold: number;
  setAutoSpellcheckWordThreshold: (val: number) => void;
  historyLimit: number;
  setHistoryLimit: (val: number) => void;
}

export default function CustomizationsTab({
  hideDot,
  setHideDot,
  previewInCard,
  setPreviewInCard,
  autoSpellcheckMode,
  setAutoSpellcheckMode,
  autoSpellcheckWordThreshold,
  setAutoSpellcheckWordThreshold,
  historyLimit,
  setHistoryLimit,
}: CustomizationsTabProps) {
  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500 w-full py-4 mx-auto max-w-4xl">
      <div className="space-y-3">
        <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Customizations
        </span>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground leading-tight">
          Customizations
        </h1>
        <p className="text-sm text-muted-foreground/80 max-w-2xl leading-relaxed">
          Configure overlay visuals and automatic spellcheck behavior.
        </p>
      </div>
      <div className="flex flex-col">
        {/* Overlay Settings Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
          <div className="pr-4">
            <Label className="text-xs font-semibold text-foreground">
              Overlay Visuals
            </Label>
            <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
              Configure how Hone visual elements present themselves in inputs.
            </p>
          </div>
          <div className="md:col-span-2">
            <SwitchCardGroup
              items={[
                {
                  id: "hide-dot",
                  label: "Hide Trigger Dot",
                  description:
                    "Completely hide the white arrow-up trigger dot from webpage inputs. You will still be able to open the dropdown menu anytime by focusing an input and pressing your dropdown shortcut.",
                  checked: hideDot,
                  onCheckedChange: (checked: boolean) => setHideDot(checked),
                },
                {
                  id: "preview-in-card",
                  label: "Preview AI results in card",
                  description:
                    "When enabled, selecting an action generates the response inside the right-hand preview card, keeping the menu open. You can then review and apply it manually. When disabled, the menu closes immediately and applies the result directly.",
                  checked: previewInCard,
                  onCheckedChange: (checked: boolean) => setPreviewInCard(checked),
                },
              ]}
            />
          </div>
        </div>

        {/* Automatic Spellcheck Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
          <div className="pr-4">
            <Label className="text-xs font-semibold text-foreground">
              Automatic Spellcheck
            </Label>
            <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
              Controls the automatic spellcheck flow. Text under the threshold
              uses Hone&apos;s local spelling and grammar algorithm. Text over
              the threshold uses your AI API for correction, and can be gated by
              the browser proofreader or local detector first.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="rounded-xl border border-border/20 bg-foreground/[0.01] p-0.5">
              <div className="flex flex-col gap-4 rounded-[calc(0.75rem-2px)] bg-foreground/[0.02] p-4">
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-foreground">
                    Long text auto-check mode
                  </Label>
                  <p className="text-[10px] text-muted-foreground/70 leading-normal">
                    When text is longer than the threshold, Hone can stay off,
                    run only when the browser proofreader or fallback detector
                    finds an issue, or always run the AI spellcheck.
                  </p>
                </div>
                <RadioCardGroupGrouped
                  options={[
                    { value: "disabled", label: "Off", description: "AI spellcheck is disabled for long text" },
                    { value: "browser_only", label: "Only if errors are detected", description: "Runs only when the browser proofreader or fallback detector finds an issue" },
                    { value: "always", label: "Always run", description: "Always runs the AI spellcheck for long text" },
                  ]}
                  value={autoSpellcheckMode}
                  onValueChange={(val) =>
                    setAutoSpellcheckMode(val as AutoSpellcheckMode)
                  }
                  columns={1}
                />
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <Label className="text-xs font-semibold text-foreground">
                      Long text threshold
                    </Label>
                    <span className="text-[10px] font-medium text-muted-foreground tabular-nums">
                      {autoSpellcheckWordThreshold} words
                    </span>
                  </div>
                  <Slider
                    value={[autoSpellcheckWordThreshold]}
                    min={10}
                    max={50}
                    step={10}
                    showTooltip
                    onValueChange={(value) =>
                      setAutoSpellcheckWordThreshold(value[0] ?? 20)
                    }
                  />
                  <p className="text-[10px] text-muted-foreground/70 leading-normal">
                    Shorter text uses the local algorithm. Longer text crosses
                    this threshold and may trigger detection first, then your AI
                    API depending on the mode above. Range: 10 – 50 words.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* History Limit Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
          <div className="pr-4">
            <Label className="text-xs font-semibold text-foreground">
              History Limit
            </Label>
            <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
              Maximum number of rewrite history entries stored locally. When the
              limit is reached, the oldest entries are automatically removed to
              make room for new ones.
            </p>
          </div>
          <div className="md:col-span-2">
            <div className="rounded-xl border border-border/20 bg-foreground/[0.01] p-0.5">
              <div className="flex flex-col gap-4 rounded-[calc(0.75rem-2px)] bg-foreground/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <Label className="text-xs font-semibold text-foreground">
                    Max history items
                  </Label>
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">
                    {historyLimit}
                  </span>
                </div>
                <Slider
                  value={[historyLimit]}
                  min={200}
                  max={2000}
                  step={200}
                  showTooltip
                  formatLabel={(val) => `${val}`}
                  onValueChange={(value) =>
                    setHistoryLimit(value[0] ?? 1000)
                  }
                />
                <p className="text-[10px] text-muted-foreground/70 leading-normal">
                  Stored in IndexedDB. Default is 1,000. Range: 200 – 2,000.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
