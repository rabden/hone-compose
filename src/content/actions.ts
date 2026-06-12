import type { CustomAction } from "./storage";
import { loadAllActionConfigs, saveAllActionConfigs } from "./storage";
import { BUILTIN_ACTION_DEFAULTS } from "./builtin-defaults";

export interface ActionContext {
  hostname?: string;
  language?: string;
}

export interface PromptPayload {
  system?: string;
  user: string;
}

export interface ActionItem {
  id: string;
  name: string;
  description?: string;
  type: "builtin" | "custom" | "marketplace";
  icon?: string;
  color?: string;
  category?: string;
  shortcut?: { key: string; ctrl: boolean; alt: boolean; shift: boolean };
  replaceMode?: "replace" | "preview";
  enabled: boolean;
  isLocal?: boolean;
}

export interface ActionHandler extends ActionItem {
  provider?: string;
  model?: string;
  temperature?: number;
  buildPrompt(input: string, context: ActionContext): PromptPayload;
}

export class ActionRegistry {
  private handlers = new Map<string, ActionHandler>();

  async loadActions(): Promise<void> {
    this.handlers.clear();

    let storedConfigs = await loadAllActionConfigs();

    const hasBuiltins = storedConfigs.some((c) => c.type === "builtin");
    if (!hasBuiltins) {
      storedConfigs = [...BUILTIN_ACTION_DEFAULTS, ...storedConfigs];
      await saveAllActionConfigs(storedConfigs);
    }

    const configMap = new Map<string, CustomAction>();
    for (const config of storedConfigs) {
      configMap.set(config.id, config);
    }

    for (const config of storedConfigs) {
      const isBuiltin = config.type === "builtin";
      const isMarketplace = config.type === "marketplace";
      // Skip disabled builtins and disabled marketplace actions (don't delete them)
      if (!config.enabled && (isBuiltin || isMarketplace)) continue;
      this.handlers.set(config.id, this.configToHandler(config));
    }
  }

  private configToHandler(ca: CustomAction): ActionHandler {
    return {
      id: ca.id,
      name: ca.name,
      description: ca.description,
      type: ca.type === "builtin" ? "builtin" : ca.type === "marketplace" ? "marketplace" : "custom",
      icon: ca.icon,
      color: ca.color,
      category: ca.category || "custom",
      shortcut: ca.shortcut,
      replaceMode: ca.replaceMode,
      enabled: ca.enabled,
      isLocal: ca.isLocal,
      provider: ca.provider,
      model: ca.model,
      temperature: ca.temperature,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      buildPrompt(input: string, _ctx: ActionContext): PromptPayload {
        const user = ca.promptTemplate.replace(/\{\{input\}\}/g, input);
        return { system: ca.systemPrompt, user };
      },
    };
  }

  getAll(): ActionHandler[] {
    return Array.from(this.handlers.values()).filter((h) => h.enabled);
  }

  get(id: string): ActionHandler | undefined {
    return this.handlers.get(id);
  }

  getByCategory(category: string): ActionHandler[] {
    return this.getAll().filter((h) => h.category === category);
  }

  buildPrompt(
    id: string,
    input: string,
    context?: ActionContext,
  ): PromptPayload {
    const handler = this.get(id);
    if (!handler) throw new Error(`Unknown action: ${id}`);
    return handler.buildPrompt(input, context || {});
  }
}
