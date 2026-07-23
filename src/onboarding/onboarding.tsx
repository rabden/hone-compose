import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { HugeiconsIcon } from "@/components/ui/hugeicons";
import {
  Tick01Icon,
  ArrowRight01Icon,
  ArrowLeftIcon,
  KeyIcon,
  PlayIcon,
  Link01Icon,
  LayoutAlignLeftIcon,
  CursorPointer01Icon,
  DocumentCodeIcon,
  Settings05Icon,
  SparklesIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/material-design-3-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioCardGroupGrouped } from "@/components/ui/radio-card";
import { HoneLogo } from "@/components/hone-logo";
import { Ripple } from "@/components/ui/ripple";
import { getRounded } from "@/options/tabs/actionstudio/getRounded";
import usingExtensionGif from "@/assets/using-extension.gif";

const PROVIDERS = [
  { id: "groq", label: "Groq", desc: "Ultra-fast open models", getKeyUrl: "https://console.groq.com/keys" },
  { id: "google_ai_studio", label: "Google AI Studio", desc: "Gemma via GenAI SDK", getKeyUrl: "https://aistudio.google.com/app/apikey" },
  { id: "openrouter", label: "OpenRouter Free", desc: "Auto-cycling free models", getKeyUrl: "https://openrouter.ai/keys" },
  { id: "openrouter_paid", label: "OpenRouter Paid", desc: "Custom model identifier", getKeyUrl: "https://openrouter.ai/keys" },
  { id: "openai", label: "OpenAI Capable", desc: "GPT-4o, GPT-5, Custom Endpoints", getKeyUrl: "https://platform.openai.com/api-keys" },
  { id: "anthropic", label: "Anthropic Claude", desc: "Claude Sonnet & Opus", getKeyUrl: "https://console.anthropic.com/settings/keys" },
];

export default function Onboarding() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [direction, setDirection] = useState<1 | -1>(1);

  const goToStep = (newStep: 1 | 2 | 3 | 4) => {
    setDirection(newStep > step ? 1 : -1);
    setStep(newStep);
  };

  // Provider config state
  const [activeProvider, setActiveProvider] = useState("groq");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("groq/compound-mini");
  const [endpoint, setEndpoint] = useState("");

  // Key testing state
  const [testStatus, setTestStatus] = useState<"idle" | "testing" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  // On provider change, update default model placeholder/value
  const handleProviderChange = (providerId: string) => {
    setActiveProvider(providerId);
    setTestStatus("idle");
    setTestMessage("");

    switch (providerId) {
      case "groq":
        setModel("groq/compound-mini");
        break;
      case "google_ai_studio":
        setModel("gemma-4-31b-it");
        break;
      case "openrouter":
        setModel("google/gemma-4-31b-it:free");
        break;
      case "openrouter_paid":
        setModel("anthropic/claude-3.5-sonnet");
        break;
      case "openai":
        setModel("gpt-4o-mini");
        break;
      case "anthropic":
        setModel("claude-3-5-sonnet-20241022");
        break;
    }
  };

  // Load any existing provider settings if user had partial config
  useEffect(() => {
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      chrome.storage.local.get(["activeProvider", "groqKey", "googleAiStudioKey", "openrouterKey", "openaiKey", "anthropicKey"], (res: Record<string, unknown>) => {
        const activeProv = typeof res.activeProvider === "string" ? res.activeProvider : undefined;
        if (activeProv) {
          setActiveProvider(activeProv);
        }
        const keyMap: Record<string, string | undefined> = {
          groq: typeof res.groqKey === "string" ? res.groqKey : undefined,
          google_ai_studio: typeof res.googleAiStudioKey === "string" ? res.googleAiStudioKey : undefined,
          openrouter: typeof res.openrouterKey === "string" ? res.openrouterKey : undefined,
          openai: typeof res.openaiKey === "string" ? res.openaiKey : undefined,
          anthropic: typeof res.anthropicKey === "string" ? res.anthropicKey : undefined,
        };
        const currentKey = keyMap[activeProv || "groq"];
        if (currentKey) {
          setApiKey(currentKey);
        }
      });
    }
  }, []);

  // Save current provider settings
  const saveProviderSettings = async () => {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;

    const storagePayload: Record<string, string> = {
      activeProvider,
    };

    if (activeProvider === "groq") {
      storagePayload.groqKey = apiKey;
      storagePayload.groqModel = model;
    } else if (activeProvider === "google_ai_studio") {
      storagePayload.googleAiStudioKey = apiKey;
      storagePayload.googleAiStudioModel = model;
    } else if (activeProvider === "openrouter") {
      storagePayload.openrouterKey = apiKey;
      storagePayload.openrouterModel = model;
    } else if (activeProvider === "openrouter_paid") {
      storagePayload.openrouterPaidKey = apiKey;
      storagePayload.openrouterPaidModel = model;
    } else if (activeProvider === "openai") {
      storagePayload.openaiKey = apiKey;
      storagePayload.openaiModel = model;
      if (endpoint) storagePayload.openaiEndpoint = endpoint;
    } else if (activeProvider === "anthropic") {
      storagePayload.anthropicKey = apiKey;
      storagePayload.anthropicModel = model;
    }

    await chrome.storage.local.set(storagePayload);
  };

  // Test connection
  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      setTestStatus("error");
      setTestMessage("Please enter an API key first.");
      return;
    }

    setTestStatus("testing");
    setTestMessage("");

    await saveProviderSettings();

    try {
      const response = await chrome.runtime.sendMessage({
        type: "PROCESS_TEXT",
        action: "fix_spelling",
        text: "Hone writing test.",
      });

      if (response?.success && response.text) {
        setTestStatus("success");
        setTestMessage("Connection successful! Provider is configured.");
      } else {
        setTestStatus("error");
        setTestMessage(response?.error || "Failed to connect to provider. Check your key.");
      }
    } catch (err) {
      setTestStatus("error");
      setTestMessage(err instanceof Error ? err.message : "Connection failed.");
    }
  };

  // Finish setup
  const handleFinishSetup = async () => {
    await saveProviderSettings();
    goToStep(4);
  };

  const selectedProviderInfo = PROVIDERS.find((p) => p.id === activeProvider);

  return (
    <div className="min-h-screen bg-card text-foreground flex flex-col items-center justify-between p-3 md:p-6 relative overflow-x-hidden select-none">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-foreground/[0.03] via-transparent to-transparent pointer-events-none rounded-full blur-3xl" />

      {/* Top Header */}
      <header className="w-full max-w-3xl flex items-center justify-between z-10 py-1 shrink-0">
        <div className="flex items-center gap-2.5">
          <HoneLogo size={24} alt="Hone Logo" />
          <span className="font-semibold text-sm tracking-wide text-foreground">Hone compose</span>
        </div>

        {/* Step Indicator Pills */}
        <div className="flex items-center gap-1.5">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                step === s
                  ? "w-7 bg-foreground"
                  : step > s
                  ? "w-3 bg-foreground/40"
                  : "w-3 bg-foreground/10"
              )}
            />
          ))}
        </div>
      </header>

      {/* Main Container without card wrapper */}
      <div className="w-full max-w-3xl flex-1 flex flex-col justify-between my-auto py-6 z-10 min-h-0 overflow-x-hidden">
        {/* Step Header Area (Fixed Top Text Header with AnimatePresence) */}
        <div className="shrink-0 pb-4 flex flex-col justify-center min-h-[96px] relative overflow-hidden">
          <AnimatePresence mode="wait" initial={false}>
            {step === 1 && (
              <motion.div
                key="s1-head"
                initial={{ opacity: 0, x: direction * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-1.5"
              >
                <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Welcome
                </span>
                <h1 className="text-3xl md:text-4xl font-light tracking-tight leading-tight text-foreground">
                  AI writing assistance, right inside every input.
                </h1>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                  Hone supercharges textareas, inputs, and rich-text editors across the web. Focus any field, invoke Hone, and transform your writing in place.
                </p>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="s2-head"
                initial={{ opacity: 0, x: direction * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-1.5"
              >
                <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Workflow
                </span>
                <h1 className="text-3xl md:text-4xl font-light tracking-tight leading-tight text-foreground">
                  How to use Hone on any webpage
                </h1>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                  Three simple steps to write better anywhere on the web.
                </p>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="s3-head"
                initial={{ opacity: 0, x: direction * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-1.5"
              >
                <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Setup Engine
                </span>
                <h1 className="text-3xl md:text-4xl font-light tracking-tight leading-tight text-foreground">
                  Connect your AI Provider
                </h1>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                  Hone uses your own API key to power transformations directly. Your keys stay local in your browser.
                </p>
              </motion.div>
            )}

            {step === 4 && (
              <motion.div
                key="s4-head"
                initial={{ opacity: 0, x: direction * 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -20 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="space-y-1.5"
              >
                <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Success
                </span>
                <h1 className="text-3xl md:text-4xl font-light tracking-tight leading-tight text-foreground">
                  You're all set!
                </h1>
                <p className="text-sm text-muted-foreground/80 leading-relaxed">
                  Hone is ready to help you write faster and better on any webpage.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reserved Center Content Area */}
        <main className="w-full flex-1 overflow-x-hidden overflow-y-auto py-4 flex flex-col justify-center min-h-0 relative">
          <AnimatePresence mode="wait" initial={false}>
            {/* STEP 1: Welcome Content */}
            {step === 1 && (
              <motion.div
                key="s1-content"
                initial={{ opacity: 0, x: direction * 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -30 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-6"
              >
                {/* Feature Cards Grid (Grouped Material UI Expressive design) */}
                <div className="flex flex-wrap gap-[2px]">
                  {[
                    {
                      title: "Works Everywhere",
                      icon: LayoutAlignLeftIcon,
                      desc: "Gmail, Notion, Twitter/X, Discord, Slack, and any standard webpage text input.",
                    },
                    {
                      title: "Smart Targeting",
                      icon: CursorPointer01Icon,
                      desc: "Automatically infers selection, current sentence, paragraph, or full input field.",
                    },
                    {
                      title: "Actions Studio",
                      icon: DocumentCodeIcon,
                      desc: "Paraphrase, fix spelling, change tone, or create custom prompts in Actions Studio.",
                    },
                  ].map((card, idx, arr) => {
                    const rounded = getRounded(idx, arr.length, 3);
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.title}
                        style={{
                          width: "calc((100% - 4px) / 3)",
                        }}
                        className={cn(
                          "relative flex flex-col p-5 cursor-default transition-[background-color,border-radius] duration-[600ms] ease-[cubic-bezier(0.2,0.8,0.2,1.2)] outline-none overflow-hidden select-none bg-background hover:bg-background/50 border border-transparent group text-left",
                          rounded,
                        )}
                      >
                        <Ripple />
                        <div className="absolute inset-0 bg-gradient-to-br from-foreground/2 to-transparent pointer-events-none" />
                        <div className="relative z-10 pointer-events-none flex flex-col gap-3">
                          {/* Top Row: Icon and Title side by side */}
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-foreground/[0.04]">
                              <HugeiconsIcon icon={Icon} className="size-4 text-foreground/70" />
                            </div>
                            <h3 className="text-xs font-semibold text-foreground truncate">
                              {card.title}
                            </h3>
                          </div>
                          {/* Bottom Row: Subtext */}
                          <p className="text-[10px] text-muted-foreground/60 leading-normal">
                            {card.desc}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STEP 2: How It Works Content */}
            {step === 2 && (
              <motion.div
                key="s2-content"
                initial={{ opacity: 0, x: direction * 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -30 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-4 max-w-2xl mx-auto w-full"
              >
                {/* Gif Preview inside Material Expressive double-bezel container */}
                <div className="p-[2px] rounded-3xl bg-background border border-border/20 overflow-hidden shadow-sm max-w-[450px] w-full">
                  <div className="rounded-[calc(1.5rem-2px)] bg-background overflow-hidden flex items-center justify-center">
                    <img
                      src={usingExtensionGif}
                      alt="Hone extension in action"
                      className="max-w-[450px] max-h-[300px] w-auto h-auto object-contain rounded-[calc(1.5rem-2px)]"
                    />
                  </div>
                </div>

                {/* Process Steps Row with Arrow Icons between items (containerless) */}
                <div className="flex items-center justify-center gap-3 w-full px-2">
                  {[
                    "Focus any text field on a website",
                    "Choose an action from the menu",
                    "Text transforms inline instantly",
                  ].map((text, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-muted-foreground leading-normal text-center">
                        {text}
                      </span>
                      {idx < 2 && (
                        <HugeiconsIcon icon={ArrowRight01Icon} className="size-3.5 shrink-0 text-muted-foreground/40" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* STEP 3: API Key & Provider Setup Content */}
            {step === 3 && (
              <motion.div
                key="s3-content"
                initial={{ opacity: 0, x: direction * 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -30 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col gap-5"
              >
                {/* Provider Cards */}
                <div className="flex flex-col gap-1.5">
                  <Label className="text-xs font-semibold text-foreground">Select Active Provider</Label>
                  <RadioCardGroupGrouped
                    options={PROVIDERS.map((p) => ({
                      value: p.id,
                      label: p.label,
                      description: p.desc,
                    }))}
                    value={activeProvider}
                    onValueChange={handleProviderChange}
                    columns={3}
                  />
                </div>

                {/* Provider Credentials Form */}
                <div className="p-[2px] rounded-3xl bg-background border border-border/20 overflow-hidden">
                  <div className="p-4 rounded-[calc(1.5rem-2px)] bg-background flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <HugeiconsIcon icon={KeyIcon} className="size-4 text-foreground/60" />
                        <span className="text-xs font-semibold text-foreground">
                          {selectedProviderInfo?.label} Credentials
                        </span>
                      </div>

                      {selectedProviderInfo?.getKeyUrl && (
                        <a
                          href={selectedProviderInfo.getKeyUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-medium text-foreground/70 hover:text-foreground flex items-center gap-1 underline underline-offset-2 transition-colors"
                        >
                          Get {selectedProviderInfo.label} API Key
                          <HugeiconsIcon icon={Link01Icon} className="size-3" />
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1">
                        <Label className="text-[10px] font-medium text-muted-foreground">API Key</Label>
                        <Input
                          type="password"
                          value={apiKey}
                          onChange={(e) => {
                            setApiKey(e.target.value);
                            setTestStatus("idle");
                          }}
                          placeholder={
                            activeProvider === "groq"
                              ? "gsk_..."
                              : activeProvider === "google_ai_studio"
                              ? "AIzaSy..."
                              : activeProvider.startsWith("openrouter")
                              ? "sk-or-v1-..."
                              : activeProvider === "openai"
                              ? "sk-proj-..."
                              : "sk-ant-..."
                          }
                          className="bg-background border border-border/60 rounded-lg text-xs h-8 font-mono"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <Label className="text-[10px] font-medium text-muted-foreground">Model Name</Label>
                        <Input
                          type="text"
                          value={model}
                          onChange={(e) => setModel(e.target.value)}
                          placeholder="Model identifier"
                          className="bg-background border border-border/60 rounded-lg text-xs h-8 font-mono"
                        />
                      </div>
                    </div>

                    {activeProvider === "openai" && (
                      <div className="flex flex-col gap-1">
                        <Label className="text-[10px] font-medium text-muted-foreground">Custom Base Endpoint (Optional)</Label>
                        <Input
                          type="text"
                          value={endpoint}
                          onChange={(e) => setEndpoint(e.target.value)}
                          placeholder="https://api.openai.com/v1"
                          className="bg-background border border-border/60 rounded-lg text-xs h-8 font-mono"
                        />
                      </div>
                    )}

                    {/* Test Connection Button & Status */}
                    <div className="flex items-center gap-3 pt-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        shape="round"
                        onClick={handleTestKey}
                        disabled={testStatus === "testing" || !apiKey.trim()}
                        className="gap-1.5 text-xs h-8"
                      >
                        {testStatus === "testing" ? (
                          <Loader2 className="size-3 animate-spin" />
                        ) : (
                          <HugeiconsIcon icon={PlayIcon} className="size-3" />
                        )}
                        Test Connection
                      </Button>

                      {testStatus === "success" && (
                        <span className="text-xs text-emerald-500 font-medium flex items-center gap-1.5">
                          <Check className="size-3.5" />
                          {testMessage}
                        </span>
                      )}

                      {testStatus === "error" && (
                        <span className="text-xs text-red-400 font-medium flex items-center gap-1.5">
                          <AlertCircle className="size-3.5" />
                          {testMessage}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Success Content */}
            {step === 4 && (
              <motion.div
                key="s4-content"
                initial={{ opacity: 0, x: direction * 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction * -30 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center justify-center text-center gap-6 py-4 my-auto"
              >
                <div className="w-16 h-16 rounded-3xl bg-foreground/5 border border-border/40 flex items-center justify-center relative">
                  <Ripple />
                  <HugeiconsIcon icon={Tick01Icon} className="size-8 text-foreground" />
                </div>

                {/* Config Summary Badge */}
                <div className="p-[2px] rounded-3xl bg-background border border-border/20 w-full max-w-md overflow-hidden">
                  <div className="p-4 rounded-[calc(1.5rem-2px)] bg-background flex items-center justify-between text-left">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-foreground/5">
                        <HugeiconsIcon icon={KeyIcon} className="size-4 text-foreground/70" />
                      </div>
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground block font-semibold">
                          Engine Status
                        </span>
                        <span className="text-xs font-semibold text-foreground">
                          {selectedProviderInfo?.label}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <kbd className="px-2 py-1 rounded bg-muted font-mono text-xs border border-border/40 font-semibold text-foreground">
                        Alt + Shift + D
                      </kbd>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Dynamic Navigation CTA Bar (Fixed Bottom) */}
        <div className="shrink-0 pt-4 flex items-center justify-between">
          {step === 1 && (
            <>
              <div />
              <Button
                variant="default"
                size="lg"
                shape="round"
                onClick={() => goToStep(2)}
                className="gap-2 font-medium"
              >
                See How It Works
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button
                variant="ghost"
                size="default"
                shape="round"
                onClick={() => goToStep(1)}
                className="gap-2"
              >
                <HugeiconsIcon icon={ArrowLeftIcon} className="size-4" />
                Back
              </Button>

              <Button
                variant="default"
                size="lg"
                shape="round"
                onClick={() => goToStep(3)}
                className="gap-2 font-medium"
              >
                Configure AI Provider
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </Button>
            </>
          )}

          {step === 3 && (
            <>
              <Button
                variant="ghost"
                size="default"
                shape="round"
                onClick={() => goToStep(2)}
                className="gap-2"
              >
                <HugeiconsIcon icon={ArrowLeftIcon} className="size-4" />
                Back
              </Button>

              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="default"
                  shape="round"
                  onClick={handleFinishSetup}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Configure Later
                </Button>

                <Button
                  variant="default"
                  size="lg"
                  shape="round"
                  onClick={handleFinishSetup}
                  className="gap-2 font-medium"
                >
                  Finish Setup
                  <HugeiconsIcon icon={Tick01Icon} className="size-4" />
                </Button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <Button
                variant="ghost"
                size="default"
                shape="round"
                onClick={() => {
                  if (typeof chrome !== "undefined" && chrome.runtime?.openOptionsPage) {
                    chrome.runtime.openOptionsPage();
                  } else {
                    window.open("options.html", "_blank");
                  }
                }}
                className="gap-2"
              >
                <HugeiconsIcon icon={Settings05Icon} className="size-4" />
                Open Settings
              </Button>

              <Button
                variant="default"
                size="lg"
                shape="round"
                onClick={() => window.close()}
                className="gap-2 font-medium"
              >
                Start Writing
                <HugeiconsIcon icon={SparklesIcon} className="size-4" />
              </Button>
            </>
          )}
        </div>

      </div>

      {/* Footer */}
      <footer className="w-full max-w-3xl flex items-center justify-between text-[11px] text-muted-foreground/50 z-10 py-1.5 border-t border-border/20 shrink-0">
        <span>Hone compose v{typeof chrome !== "undefined" && chrome.runtime?.getManifest ? chrome.runtime.getManifest().version : "0.1.0"}</span>
        <span>Press Alt + Shift + D anywhere on the web</span>
      </footer>
    </div>
  );
}
