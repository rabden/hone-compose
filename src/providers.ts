export type ProviderId =
  | "openai_compatible"
  | "anthropic_shape"
  | "google_ai_studio"
  | "groq"
  | "openrouter"
  | "deepseek";

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  desc: string;
  defaultModel: string;
  keyPlaceholder: string;
  modelPlaceholder: string;
  modelDesc: string;
  getKeyUrl: string;
  supportsBaseUrl: boolean;
  baseUrlPlaceholder?: string;
  baseUrlLabel?: string;
  baseUrlDesc?: string;
  keyStorageKey: string;
  modelStorageKey: string;
  baseUrlStorageKey?: string;
}

export const PROVIDERS: ProviderConfig[] = [
  {
    id: "groq",
    label: "Groq",
    desc: "Ultra-fast open models",
    defaultModel: "groq/compound-mini",
    keyPlaceholder: "gsk_...",
    modelPlaceholder: "groq/compound-mini",
    modelDesc: "Model available on GroqCloud (e.g. llama-3.3-70b-versatile).",
    getKeyUrl: "https://console.groq.com/keys",
    supportsBaseUrl: false,
    keyStorageKey: "groqKey",
    modelStorageKey: "groqModel",
  },
  {
    id: "google_ai_studio",
    label: "Google AI Studio",
    desc: "Gemini & Gemma models",
    defaultModel: "gemma-4-26b-a4b-it",
    keyPlaceholder: "AIzaSy...",
    modelPlaceholder: "gemma-4-26b-a4b-it",
    modelDesc: "Gemini or Gemma model engine string.",
    getKeyUrl: "https://aistudio.google.com/app/apikey",
    supportsBaseUrl: false,
    keyStorageKey: "googleAiStudioKey",
    modelStorageKey: "googleAiStudioModel",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    desc: "DeepSeek V3 & R1 reasoning models",
    defaultModel: "deepseek-chat",
    keyPlaceholder: "sk-...",
    modelPlaceholder: "deepseek-chat",
    modelDesc: "Model name (e.g. deepseek-chat, deepseek-reasoner).",
    getKeyUrl: "https://platform.deepseek.com/api_keys",
    supportsBaseUrl: false,
    keyStorageKey: "deepseekKey",
    modelStorageKey: "deepseekModel",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    desc: "Unified API for 100+ models",
    defaultModel: "anthropic/claude-sonnet-4-6",
    keyPlaceholder: "sk-or-v1-...",
    modelPlaceholder: "anthropic/claude-sonnet-4-6",
    modelDesc: "Model slug from openrouter.ai/models.",
    getKeyUrl: "https://openrouter.ai/keys",
    supportsBaseUrl: false,
    keyStorageKey: "openrouterKey",
    modelStorageKey: "openrouterModel",
  },
  {
    id: "openai_compatible",
    label: "OpenAI Compatible",
    desc: "OpenAI-compatible APIs",
    defaultModel: "gpt-5-mini",
    keyPlaceholder: "sk-proj-...",
    modelPlaceholder: "gpt-5-mini",
    modelDesc: "Model identifier (e.g. gpt-5-mini, gpt-oss-120b).",
    getKeyUrl: "https://platform.openai.com/api-keys",
    supportsBaseUrl: true,
    baseUrlPlaceholder: "https://api.openai.com/v1",
    baseUrlLabel: "Custom Base URL",
    baseUrlDesc:
      "Base URL for any OpenAI-compatible API — proxy, gateway, or local instance (e.g. http://localhost:8080/v1).",
    keyStorageKey: "openaiCompatibleKey",
    modelStorageKey: "openaiCompatibleModel",
    baseUrlStorageKey: "openaiCompatibleBaseUrl",
  },
  {
    id: "anthropic_shape",
    label: "Anthropic Shape",
    desc: "Anthropic-compatible APIs",
    defaultModel: "claude-sonnet-4-6",
    keyPlaceholder: "sk-ant-...",
    modelPlaceholder: "claude-sonnet-4-6",
    modelDesc: "Model name (e.g. claude-sonnet-4-6).",
    getKeyUrl: "https://console.anthropic.com/settings/keys",
    supportsBaseUrl: true,
    baseUrlPlaceholder: "https://api.anthropic.com/v1",
    baseUrlLabel: "Custom Base URL",
    baseUrlDesc:
      "Base URL for any Anthropic-compatible API — proxy or local instance (e.g. http://localhost:8080/v1).",
    keyStorageKey: "anthropicShapeKey",
    modelStorageKey: "anthropicShapeModel",
    baseUrlStorageKey: "anthropicShapeBaseUrl",
  },
];

export const PROVIDER_MAP: Record<string, ProviderConfig> = Object.fromEntries(
  PROVIDERS.map((p) => [p.id, p]),
);

export const ALL_PROVIDER_IDS = PROVIDERS.map((p) => p.id);

export const ALL_STORAGE_KEYS = PROVIDERS.flatMap((p) =>
  [p.keyStorageKey, p.modelStorageKey, p.baseUrlStorageKey].filter(
    (k): k is string => !!k,
  ),
);

export function getProvider(id: string): ProviderConfig | undefined {
  return PROVIDER_MAP[id];
}

export function getProviderLabel(id: string): string {
  return PROVIDER_MAP[id]?.label ?? id;
}

export function getDefaultModel(id: string): string {
  return PROVIDER_MAP[id]?.defaultModel ?? "";
}

export function getProviderKeyPlaceholder(id: string): string {
  return PROVIDER_MAP[id]?.keyPlaceholder ?? "";
}

export function isProviderConfigured(
  id: string,
  settings: Record<string, unknown>,
): boolean {
  const cfg = PROVIDER_MAP[id];
  if (!cfg) return false;
  const key = settings[cfg.keyStorageKey];
  return typeof key === "string" && key.trim().length > 0;
}
