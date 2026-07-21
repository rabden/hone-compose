export const ACTION_PROVIDER_OPTIONS = [
  { value: "__default__", label: "Use global default" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "openrouter", label: "OpenRouter Free" },
  { value: "openrouter_paid", label: "OpenRouter Paid" },
  { value: "google_ai_studio", label: "Google AI Studio" },
  { value: "groq", label: "Groq" },
] as const;
