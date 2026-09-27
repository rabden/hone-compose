/**
 * Local stand-in for the extension's service-worker message channel.
 *
 * `sendMessage` mirrors the responses ActionsStudioTab expects from the
 * extension's runtime message channel, but everything resolves locally: the
 * marketplace is a small built-in catalog, installs persist to the local
 * storage layer, and the test playground transforms text with the action's
 * own prompt template. No network, no API keys — the UI is unchanged.
 */

import {
  loadAllActionConfigs,
  saveActionConfig,
  type CustomAction,
} from "./storage";
import type { Registry, RegistryAction } from "@/options/tabs/actionstudio/types";

const LOCAL_REGISTRY: Registry = {
  schemaVersion: 1,
  actions: [
    {
      id: "explain-simple",
      name: "Explain Simply",
      description: "Rewrite the selection as a plain-language explanation.",
      icon: "lightbulb",
      color: "#F59E0B",
      version: "1.0.0",
      author: "Hone Templates",
      tags: ["writing", "clarity"],
      path: "local://explain-simple",
    },
    {
      id: "bullet-summary",
      name: "Bullet Summary",
      description: "Condense the selection into a short bullet list.",
      icon: "list",
      color: "#3B82F6",
      version: "1.1.0",
      author: "Hone Templates",
      tags: ["summary"],
      path: "local://bullet-summary",
    },
    {
      id: "polite-decline",
      name: "Polite Decline",
      description: "Turn the selection into a courteous pass.",
      icon: "mail",
      color: "#EC4899",
      version: "1.0.2",
      author: "Hone Templates",
      tags: ["email", "tone"],
      path: "local://polite-decline",
    },
  ],
};

function registryActionToCustomAction(
  registryAction: RegistryAction,
): CustomAction {
  return {
    id: registryAction.id,
    sourceId: registryAction.id,
    name: registryAction.name,
    description: registryAction.description,
    icon: registryAction.icon,
    color: registryAction.color,
    promptTemplate: `{{input}}`,
    replaceMode: "replace",
    enabled: true,
    type: "marketplace",
    category: "marketplace",
    createdAt: Date.now(),
    installedAt: Date.now(),
    version: registryAction.version,
    author: registryAction.author,
    tags: registryAction.tags,
    isLocal: true,
  };
}

export interface LocalMessage {
  type: string;
  forceRefresh?: boolean;
  sourceId?: string;
  path?: string;
  action?: string;
  text?: string;
}

export async function sendMessage(
  message: LocalMessage,
): Promise<Record<string, unknown>> {
  switch (message.type) {
    case "MARKETPLACE_FETCH_REGISTRY": {
      // The catalog is local; refreshes are instant by construction.
      return { success: true, registry: LOCAL_REGISTRY };
    }

    case "MARKETPLACE_INSTALL_ACTION": {
      const sourceId = message.sourceId;
      if (!sourceId || !message.path) {
        return { success: false, error: "Missing sourceId or path." };
      }
      const registryAction = LOCAL_REGISTRY.actions.find(
        (a) => a.id === sourceId,
      );
      if (!registryAction) {
        return { success: false, error: "Action not found in catalog." };
      }
      await saveActionConfig(registryActionToCustomAction(registryAction));
      return { success: true };
    }

    case "PROCESS_TEXT": {
      const configs = await loadAllActionConfigs();
      const action = configs.find((a) => a.id === message.action);
      if (!action) {
        return {
          success: false,
          error: "Action not found — save it before running the test.",
        };
      }
      const text = message.text ?? "";
      const output = (action.promptTemplate || "{{input}}")
        .replaceAll("{{input}}", text)
        .replaceAll("{{selection}}", text);
      // Small delay so the playground's loading state is observable.
      await new Promise((resolve) => setTimeout(resolve, 300));
      return { success: true, text: output };
    }

    default:
      return { success: false, error: `Unsupported message: ${message.type}` };
  }
}
