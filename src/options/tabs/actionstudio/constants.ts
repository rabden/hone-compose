import { PROVIDERS } from "../../../providers";

export const ACTION_PROVIDER_OPTIONS = [
  { value: "__default__", label: "Use global default" },
  ...PROVIDERS.map((p) => ({ value: p.id, label: p.label })),
] as const;
