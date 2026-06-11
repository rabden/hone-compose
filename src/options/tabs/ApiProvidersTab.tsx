import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioCardGroupGrouped } from "@/components/ui/radio-card";
import { Info } from "lucide-react";

const OPENROUTER_FREE_MODELS = [
  { id: "google/gemma-4-31b-it:free", label: "Gemma 4 31B" },
  { id: "openai/gpt-oss-120b:free", label: "GPT-OSS 120B" },
  { id: "z-ai/glm-4.5-air:free", label: "GLM 4.5 Air" },
  { id: "moonshotai/kimi-k2.6:free", label: "Kimi K2.6" },
  { id: "google/gemma-4-26b-a4b-it:free", label: "Gemma 4 26B" },
  { id: "poolside/laguna-xs.2:free", label: "Laguna XS.2" },
  { id: "openai/gpt-oss-20b:free", label: "GPT-OSS 20B" },
  { id: "nvidia/nemotron-3-nano-30b-a3b:free", label: "Nemotron 3 Nano 30B" },
  { id: "nvidia/nemotron-3-super-120b-a12b:free", label: "Nemotron 3 Super" },
  { id: "poolside/laguna-m.1:free", label: "Laguna M.1" },
  { id: "nvidia/nemotron-nano-9b-v2:free", label: "Nemotron Nano 9B V2" },
  { id: "openrouter/owl-alpha:free", label: "Owl Alpha" },
];

interface ApiProvidersTabProps {
  activeProvider: string;
  setActiveProvider: (val: string) => void;
  openaiKey: string;
  setOpenaiKey: (val: string) => void;
  openaiModel: string;
  setOpenaiModel: (val: string) => void;
  openaiEndpoint: string;
  setOpenaiEndpoint: (val: string) => void;
  anthropicKey: string;
  setAnthropicKey: (val: string) => void;
  anthropicModel: string;
  setAnthropicModel: (val: string) => void;
  openrouterKey: string;
  setOpenrouterKey: (val: string) => void;
  openrouterModel: string;
  setOpenrouterModel: (val: string) => void;
  openrouterPaidKey: string;
  setOpenrouterPaidKey: (val: string) => void;
  openrouterPaidModel: string;
  setOpenrouterPaidModel: (val: string) => void;
  googleAiStudioKey: string;
  setGoogleAiStudioKey: (val: string) => void;
  googleAiStudioModel: string;
  setGoogleAiStudioModel: (val: string) => void;
  groqKey: string;
  setGroqKey: (val: string) => void;
  groqModel: string;
  setGroqModel: (val: string) => void;
}

const PROVIDERS = [
  { id: "groq", label: "Groq", desc: "Ultra-fast open models" },
  {
    id: "google_ai_studio",
    label: "Google AI Studio",
    desc: "Gemma via GenAI SDK",
  },
  {
    id: "openrouter",
    label: "OpenRouter Free",
    desc: "Auto-cycling free models",
  },
  {
    id: "openrouter_paid",
    label: "OpenRouter Paid",
    desc: "Custom model identifier",
  },
  { id: "openai", label: "OpenAI Capable", desc: "GPT-5, Custom Endpoints" },
  { id: "anthropic", label: "Anthropic Claude", desc: "Claude Sonnet 4.6" },
];

export default function ApiProvidersTab({
  activeProvider,
  setActiveProvider,
  openaiKey,
  setOpenaiKey,
  openaiModel,
  setOpenaiModel,
  openaiEndpoint,
  setOpenaiEndpoint,
  anthropicKey,
  setAnthropicKey,
  anthropicModel,
  setAnthropicModel,
  openrouterKey,
  setOpenrouterKey,
  openrouterModel,
  setOpenrouterModel,
  openrouterPaidKey,
  setOpenrouterPaidKey,
  openrouterPaidModel,
  setOpenrouterPaidModel,
  googleAiStudioKey,
  setGoogleAiStudioKey,
  googleAiStudioModel,
  setGoogleAiStudioModel,
  groqKey,
  setGroqKey,
  groqModel,
  setGroqModel,
}: ApiProvidersTabProps) {
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

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
          <div className="pr-4">
            <Label className="text-xs font-semibold text-foreground">
              {activeProvider === "openrouter" && "OpenRouter API Key"}
              {activeProvider === "openrouter_paid" && "OpenRouter API Key"}
              {activeProvider === "openai" && "OpenAI Capable API Key"}
              {activeProvider === "anthropic" && "Anthropic API Key"}
              {activeProvider === "groq" && "Groq API Key"}
              {activeProvider === "google_ai_studio" &&
                "Google AI Studio API Key"}
            </Label>
            <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
              {activeProvider === "openrouter" &&
                "Credentials for openrouter.ai free tier access."}
              {activeProvider === "openrouter_paid" &&
                "Credentials for openrouter.ai paid tier access."}
              {activeProvider === "openai" &&
                "Authentication key for OpenAI or any compatible custom gateway."}
              {activeProvider === "anthropic" &&
                "Key generated in Anthropic Developer Console."}
              {activeProvider === "groq" && "API key from console.groq.com."}
              {activeProvider === "google_ai_studio" &&
                "API key from aistudio.google.com."}
            </p>
          </div>
          <div className="md:col-span-2">
            <Input
              type="password"
              placeholder={
                activeProvider === "openai"
                  ? "sk-proj-..."
                  : activeProvider === "anthropic"
                    ? "sk-ant-..."
                    : activeProvider.startsWith("openrouter")
                      ? "sk-or-v1-..."
                      : activeProvider === "groq"
                        ? "gsk_..."
                        : "AIzaSy..."
              }
              value={
                activeProvider === "openrouter"
                  ? openrouterKey
                  : activeProvider === "openrouter_paid"
                    ? openrouterPaidKey
                    : activeProvider === "openai"
                      ? openaiKey
                      : activeProvider === "anthropic"
                        ? anthropicKey
                        : activeProvider === "groq"
                          ? groqKey
                          : googleAiStudioKey
              }
              onChange={(e) => {
                const val = e.target.value;
                if (activeProvider === "openrouter") setOpenrouterKey(val);
                else if (activeProvider === "openrouter_paid")
                  setOpenrouterPaidKey(val);
                else if (activeProvider === "openai") setOpenaiKey(val);
                else if (activeProvider === "anthropic") setAnthropicKey(val);
                else if (activeProvider === "groq") setGroqKey(val);
                else setGoogleAiStudioKey(val);
              }}
              required={activeProvider === "openrouter"}
              className="w-full bg-background border border-border/60 rounded-lg text-xs placeholder:text-muted-foreground/40 h-9 font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 border-b border-border/30">
          <div className="pr-4">
            <Label className="text-xs font-semibold text-foreground">
              {activeProvider === "openrouter"
                ? "Preferred Starting Model"
                : "Model Engine"}
            </Label>
            <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
              {activeProvider === "openrouter" &&
                "First fallback target. Error cycles others automatically."}
              {activeProvider === "openrouter_paid" &&
                "Model slug available on openrouter.ai/models."}
              {activeProvider === "openai" &&
                "Model identifier target (e.g. gpt-5-mini)."}
              {activeProvider === "anthropic" &&
                "Model name identifier (e.g. claude-sonnet-4-6)."}
              {activeProvider === "groq" &&
                "Model available on GroqCloud (e.g. llama-3.3-70b-versatile)."}
              {activeProvider === "google_ai_studio" &&
                "Gemini or Gemma model engine string."}
            </p>
          </div>
          <div className="md:col-span-2 flex flex-col gap-2">
            {activeProvider === "openrouter" ? (
              <Select
                value={openrouterModel}
                onValueChange={(val) => setOpenrouterModel(val)}
              >
                <SelectTrigger className="bg-background border border-border/60 rounded-lg text-xs h-9 justify-between w-full">
                  <SelectValue placeholder="Select starting model..." />
                </SelectTrigger>
                <SelectContent className="bg-card border border-border rounded-lg shadow-sm">
                  {OPENROUTER_FREE_MODELS.map((m) => (
                    <SelectItem key={m.id} value={m.id} className="text-xs">
                      <span className="font-medium">{m.label}</span>
                      <span className="ml-2 text-muted-foreground/60 font-mono text-[10px]">
                        {m.id}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                type="text"
                value={
                  activeProvider === "openrouter_paid"
                    ? openrouterPaidModel
                    : activeProvider === "openai"
                      ? openaiModel
                      : activeProvider === "anthropic"
                        ? anthropicModel
                        : activeProvider === "groq"
                          ? groqModel
                          : googleAiStudioModel
                }
                onChange={(e) => {
                  const val = e.target.value;
                  if (activeProvider === "openrouter_paid")
                    setOpenrouterPaidModel(val);
                  else if (activeProvider === "openai") setOpenaiModel(val);
                  else if (activeProvider === "anthropic")
                    setAnthropicModel(val);
                  else if (activeProvider === "groq") setGroqModel(val);
                  else setGoogleAiStudioModel(val);
                }}
                placeholder={
                  activeProvider === "openrouter_paid"
                    ? "e.g. anthropic/claude-sonnet-4-6"
                    : activeProvider === "openai"
                      ? "gpt-5-mini"
                      : activeProvider === "anthropic"
                        ? "claude-sonnet-4-6"
                        : activeProvider === "groq"
                          ? "groq/compound-mini"
                          : "gemma-3-27b-it"
                }
                className="bg-background border border-border/60 rounded-lg text-xs h-9 font-mono w-full"
              />
            )}

            {activeProvider === "openrouter" && (
              <p className="text-[10px] text-muted-foreground/60 leading-normal">
                On error, all 5 models are tried in sequence, repeated 3 times
                (15 total attempts).
              </p>
            )}
            {activeProvider === "openrouter_paid" && (
              <p className="text-[10px] text-muted-foreground/60 leading-normal">
                Use any model slug from openrouter.ai/models — e.g.{" "}
                <span className="font-mono text-foreground/80">
                  openai/gpt-4o
                </span>
                .
              </p>
            )}
            {activeProvider === "google_ai_studio" && (
              <p className="text-[10px] text-muted-foreground/60 leading-normal">
                Supports any model accessible via the Gemini API — e.g.{" "}
                <span className="font-mono text-foreground/80">
                  gemma-4-26b-a4b-it
                </span>
                .
              </p>
            )}
          </div>
        </div>

        {activeProvider === "openai" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6">
            <div className="pr-4">
              <Label className="text-xs font-semibold text-foreground">
                Custom API Endpoint
              </Label>
              <p className="text-[10px] text-muted-foreground/70 mt-1 leading-normal">
                Custom base target URL for OpenAI-compatible proxy, gateway, or
                local instance.
              </p>
            </div>
            <div className="md:col-span-2">
              <Input
                type="text"
                value={openaiEndpoint}
                onChange={(e) => setOpenaiEndpoint(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="w-full bg-background border border-border/60 rounded-lg text-xs h-9 font-mono"
              />
            </div>
          </div>
        )}

        {(activeProvider === "openrouter" ||
          activeProvider === "openrouter_paid" ||
          activeProvider === "google_ai_studio" ||
          activeProvider === "groq") && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
            <div className="md:col-span-3">
              {activeProvider === "openrouter" && (
                <div className="flex gap-3 text-xs text-muted-foreground leading-relaxed px-4 py-3 rounded-lg bg-foreground/[0.02] border border-border/30 animate-in fade-in duration-200">
                  <Info className="w-4 h-4 shrink-0 text-foreground/40 mt-0.5" />
                  <div>
                    A free OpenRouter API key is required (create one at{" "}
                    <strong className="text-foreground/80">
                      openrouter.ai
                    </strong>
                    ). Select your{" "}
                    <strong className="text-foreground/80">
                      preferred starting model
                    </strong>
                    ; if it fails, the extension tries all other free models —
                    cycling through the full list up to{" "}
                    <strong className="text-foreground/80">3 times</strong>{" "}
                    before giving up.
                  </div>
                </div>
              )}
              {activeProvider === "openrouter_paid" && (
                <div className="flex gap-3 text-xs text-muted-foreground leading-relaxed px-4 py-3 rounded-lg bg-foreground/[0.02] border border-border/30 animate-in fade-in duration-200">
                  <Info className="w-4 h-4 shrink-0 text-foreground/40 mt-0.5" />
                  <div>
                    Enter any model identifier available on{" "}
                    <strong className="text-foreground/80">
                      openrouter.ai
                    </strong>{" "}
                    — paid or otherwise. Your API key must have sufficient
                    credits for the chosen model.
                  </div>
                </div>
              )}
              {activeProvider === "google_ai_studio" && (
                <div className="flex gap-3 text-xs text-muted-foreground leading-relaxed px-4 py-3 rounded-lg bg-foreground/[0.02] border border-border/30 animate-in fade-in duration-200">
                  <Info className="w-4 h-4 shrink-0 text-foreground/40 mt-0.5" />
                  <div>
                    Uses{" "}
                    <strong className="text-foreground/80">
                      @google/genai
                    </strong>{" "}
                    SDK with thinking config (MINIMAL). Get a free API key from{" "}
                    <strong className="text-foreground/80">
                      aistudio.google.com
                    </strong>{" "}
                    — generous free tier. Supports Gemma models like{" "}
                    <span className="font-mono text-foreground/80">
                      gemma-4-26b-a4b-it
                    </span>
                    .
                  </div>
                </div>
              )}
              {activeProvider === "groq" && (
                <div className="flex gap-3 text-xs text-muted-foreground leading-relaxed px-4 py-3 rounded-lg bg-foreground/[0.02] border border-border/30 animate-in fade-in duration-200">
                  <Info className="w-4 h-4 shrink-0 text-foreground/40 mt-0.5" />
                  <div>
                    Uses OpenAI-compatible{" "}
                    <strong className="text-foreground/80">api.groq.com</strong>{" "}
                    endpoint with ultra-fast LPU inference. Get a free API key
                    from{" "}
                    <strong className="text-foreground/80">
                      console.groq.com
                    </strong>
                    . Supports Llama, Mixtral, Gemma, and other open models at
                    300–800 tokens/s.
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
