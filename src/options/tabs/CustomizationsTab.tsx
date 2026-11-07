import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { SwitchCardGroup } from "@/components/ui/switch-card";

interface CustomizationsTabProps {
  hideDot: boolean;
  setHideDot: (val: boolean) => void;
  previewInCard: boolean;
  setPreviewInCard: (val: boolean) => void;
  enableProviderFallback: boolean;
  setEnableProviderFallback: (val: boolean) => void;
  liveProofread: boolean;
  setLiveProofread: (val: boolean) => void;
  historyLimit: number;
  setHistoryLimit: (val: number) => void;
}

export default function CustomizationsTab({
  hideDot,
  setHideDot,
  previewInCard,
  setPreviewInCard,
  enableProviderFallback,
  setEnableProviderFallback,
  liveProofread,
  setLiveProofread,
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

        {/* Provider Fallback Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
          <div className="pr-4">
            <Label className="text-xs font-semibold text-foreground">
              Provider Fallback
            </Label>
            <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
              Control whether your text may be sent to your other configured
              AI providers when the active one fails.
            </p>
          </div>
          <div className="md:col-span-2">
            <SwitchCardGroup
              items={[
                {
                  id: "provider-fallback",
                  label: "Try other providers when the active one fails",
                  description:
                    "If the active AI provider fails, Hone can retry the same text with your other configured providers until one succeeds, and tells you when it did. Disable to keep all text strictly with the active provider.",
                  checked: enableProviderFallback,
                  onCheckedChange: (checked: boolean) =>
                    setEnableProviderFallback(checked),
                },
              ]}
            />
          </div>
        </div>

        {/* Live Proofreading Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
          <div className="pr-4">
            <Label className="text-xs font-semibold text-foreground">
              Live Proofreading
            </Label>
            <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
              Spelling and grammar are checked locally with Harper as you type
              (after a short pause). Errors are underlined in the field, and
              hovering one opens a card with every suggested fix. Nothing is
              sent anywhere — the check runs entirely in your browser.
            </p>
          </div>
          <div className="md:col-span-2">
            <SwitchCardGroup
              items={[
                {
                  id: "live-proofread",
                  label: "Underline errors while typing",
                  description:
                    "Red underlines for spelling, blue for grammar. Hover or click an underlined word or phrase to review Harper's fixes, apply one, add it to your dictionary, or ignore it for good.",
                  checked: liveProofread,
                  onCheckedChange: (checked: boolean) => setLiveProofread(checked),
                },
              ]}
            />
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
