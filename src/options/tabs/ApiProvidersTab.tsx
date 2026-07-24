import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioCardGroupGrouped } from "@/components/ui/radio-card";
import { HugeiconsIcon } from "@/components/ui/hugeicons";
import { BadgeInfoIcon } from "@hugeicons/core-free-icons";
import { PROVIDERS, getProvider } from "../../providers";

interface ApiProvidersTabProps {
  activeProvider: string;
  setActiveProvider: (val: string) => void;
  openaiCompatibleKey: string;
  setOpenaiCompatibleKey: (val: string) => void;
  openaiCompatibleModel: string;
  setOpenaiCompatibleModel: (val: string) => void;
  openaiCompatibleBaseUrl: string;
  setOpenaiCompatibleBaseUrl: (val: string) => void;
  anthropicShapeKey: string;
  setAnthropicShapeKey: (val: string) => void;
  anthropicShapeModel: string;
  setAnthropicShapeModel: (val: string) => void;
  anthropicShapeBaseUrl: string;
  setAnthropicShapeBaseUrl: (val: string) => void;
  openrouterKey: string;
  setOpenrouterKey: (val: string) => void;
  openrouterModel: string;
  setOpenrouterModel: (val: string) => void;
  googleAiStudioKey: string;
  setGoogleAiStudioKey: (val: string) => void;
  googleAiStudioModel: string;
  setGoogleAiStudioModel: (val: string) => void;
  groqKey: string;
  setGroqKey: (val: string) => void;
  groqModel: string;
  setGroqModel: (val: string) => void;
  deepseekKey: string;
  setDeepseekKey: (val: string) => void;
  deepseekModel: string;
  setDeepseekModel: (val: string) => void;
}

export default function ApiProvidersTab(props: ApiProvidersTabProps) {
  const { activeProvider, setActiveProvider } = props;
  const cfg = getProvider(activeProvider);

  const getKey = (): string => {
    switch (activeProvider) {
      case "openai_compatible": return props.openaiCompatibleKey;
      case "anthropic_shape": return props.anthropicShapeKey;
      case "google_ai_studio": return props.googleAiStudioKey;
      case "groq": return props.groqKey;
      case "deepseek": return props.deepseekKey;
      case "openrouter": return props.openrouterKey;
      default: return "";
    }
  };

  const getModel = (): string => {
    switch (activeProvider) {
      case "openai_compatible": return props.openaiCompatibleModel;
      case "anthropic_shape": return props.anthropicShapeModel;
      case "google_ai_studio": return props.googleAiStudioModel;
      case "groq": return props.groqModel;
      case "deepseek": return props.deepseekModel;
      case "openrouter": return props.openrouterModel;
      default: return "";
    }
  };

  const setKey = (v: string) => {
    switch (activeProvider) {
      case "openai_compatible": props.setOpenaiCompatibleKey(v); break;
      case "anthropic_shape": props.setAnthropicShapeKey(v); break;
      case "google_ai_studio": props.setGoogleAiStudioKey(v); break;
      case "groq": props.setGroqKey(v); break;
      case "deepseek": props.setDeepseekKey(v); break;
      case "openrouter": props.setOpenrouterKey(v); break;
    }
  };

  const setModel = (v: string) => {
    switch (activeProvider) {
      case "openai_compatible": props.setOpenaiCompatibleModel(v); break;
      case "anthropic_shape": props.setAnthropicShapeModel(v); break;
      case "google_ai_studio": props.setGoogleAiStudioModel(v); break;
      case "groq": props.setGroqModel(v); break;
      case "deepseek": props.setDeepseekModel(v); break;
      case "openrouter": props.setOpenrouterModel(v); break;
    }
  };

  const getBaseUrl = (): string => {
    switch (activeProvider) {
      case "openai_compatible": return props.openaiCompatibleBaseUrl;
      case "anthropic_shape": return props.anthropicShapeBaseUrl;
      default: return "";
    }
  };

  const setBaseUrl = (v: string) => {
    switch (activeProvider) {
      case "openai_compatible": props.setOpenaiCompatibleBaseUrl(v); break;
      case "anthropic_shape": props.setAnthropicShapeBaseUrl(v); break;
    }
  };

  return (
    <div className="flex flex-col gap-10 animate-in fade-in duration-500 w-full py-4 mx-auto max-w-4xl">
      <div className="space-y-3">
        <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Configuration
        </span>
        <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground leading-tight">
          API Providers
        </h1>
        <p className="text-sm text-muted-foreground/80 max-w-2xl leading-relaxed">
          Select and configure the AI engine that powers your text
          transformations across the web.
        </p>
      </div>

      <div className="flex flex-col">
        {/* Active Provider Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
          <div className="pr-4">
            <Label className="text-xs font-semibold text-foreground">
              Active Provider
            </Label>
            <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
              Choose the service provider to run your transformations.
            </p>
          </div>
          <div className="md:col-span-2">
            <RadioCardGroupGrouped
              options={PROVIDERS.map((p) => ({
                value: p.id,
                label: p.label,
                description: p.desc,
              }))}
              value={activeProvider}
              onValueChange={setActiveProvider}
              columns={3}
            />
          </div>
        </div>

        {cfg && (
          <>
            {/* API Key Input */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
              <div className="pr-4">
                <Label className="text-xs font-semibold text-foreground">
                  {cfg.label} API Key
                </Label>
                <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                  Authentication key for {cfg.label}.
                </p>
              </div>
              <div className="md:col-span-2">
                <Input
                  type="password"
                  placeholder={cfg.keyPlaceholder}
                  value={getKey()}
                  onChange={(e) => setKey(e.target.value)}
                  className="w-full bg-background border border-border/60 rounded-lg text-xs placeholder:text-muted-foreground/40 h-9 font-mono"
                />
              </div>
            </div>

            {/* Model Input */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
              <div className="pr-4">
                <Label className="text-xs font-semibold text-foreground">
                  Model Engine
                </Label>
                <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                  {cfg.modelDesc}
                </p>
              </div>
              <div className="md:col-span-2 flex flex-col gap-2">
                <Input
                  type="text"
                  value={getModel()}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={cfg.modelPlaceholder}
                  className="bg-background border border-border/60 rounded-lg text-xs h-9 font-mono w-full"
                />
              </div>
            </div>

            {/* Base URL Input (for providers that support it) */}
            {cfg.supportsBaseUrl && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
                <div className="pr-4">
                  <Label className="text-xs font-semibold text-foreground">
                    {cfg.baseUrlLabel}
                  </Label>
                  <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                    {cfg.baseUrlDesc}
                  </p>
                </div>
                <div className="md:col-span-2">
                  <Input
                    type="text"
                    value={getBaseUrl()}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={cfg.baseUrlPlaceholder}
                    className="w-full bg-background border border-border/60 rounded-lg text-xs h-9 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Info Callout */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
              <div className="md:col-span-3">
                <div className="flex gap-3 text-xs text-muted-foreground leading-relaxed px-4 py-3 rounded-lg bg-foreground/[0.02] border border-border/30 animate-in fade-in duration-200">
                  <HugeiconsIcon icon={BadgeInfoIcon} className="w-4 h-4 shrink-0 text-foreground/40 mt-0.5" />
                  <div>
                    {activeProvider === "openrouter" && (
                      <>
                        Enter any model identifier available on{" "}
                        <strong className="text-foreground/80">openrouter.ai</strong>{" "}
                        — paid or free. Your API key must have sufficient credits.
                      </>
                    )}
                    {activeProvider === "google_ai_studio" && (
                      <>
                        Uses{" "}
                        <strong className="text-foreground/80">AI SDK</strong>{" "}
                        with minimal thinking config. Get a free API key from{" "}
                        <strong className="text-foreground/80">
                          aistudio.google.com
                        </strong>{" "}
                        — supports Gemini and Gemma models.
                      </>
                    )}
                    {activeProvider === "groq" && (
                      <>
                        Uses{" "}
                        <strong className="text-foreground/80">api.groq.com</strong>{" "}
                        with ultra-fast LPU inference. Get a free API key from{" "}
                        <strong className="text-foreground/80">console.groq.com</strong>
                        . Supports Llama, Mixtral, Gemma, and other open models.
                      </>
                    )}
                    {activeProvider === "deepseek" && (
                      <>
                        Direct access to{" "}
                        <strong className="text-foreground/80">DeepSeek</strong>{" "}
                        models — V3 for general chat, R1 for deep reasoning.
                        Extremely cost-effective. Get an API key from{" "}
                        <strong className="text-foreground/80">platform.deepseek.com</strong>
                        .
                      </>
                    )}
                    {activeProvider === "openai_compatible" && (
                      <>
                        Works with any OpenAI-compatible API — OpenAI, local LLMs
                        (Ollama, LM Studio), proxies, or gateways. Set a custom
                        base URL for non-OpenAI endpoints, including localhost.
                      </>
                    )}
                    {activeProvider === "anthropic_shape" && (
                      <>
                        Works with any Anthropic-compatible API — Anthropic,
                        proxies, or local instances. Set a custom base URL for
                        non-Anthropic endpoints, including localhost.
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
