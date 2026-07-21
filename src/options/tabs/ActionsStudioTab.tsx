import { useState, useMemo, useCallback } from "react";
import {
  saveActionConfig,
  saveAllActionConfigs,
  deleteActionConfig,
  loadAllActionConfigs,
} from "../../content/storage";
import { BUILTIN_ACTION_DEFAULTS } from "../../content/builtin-defaults";
import type { CustomAction } from "../../content/storage";
import { DEFAULT_ACTION_ICON, normalizeActionIconName } from "@/lib/action-icons";
import type { Registry, RegistryAction } from "./actionstudio/types";

// View components
import { OverviewView } from "./actionstudio/OverviewView";
import { MarketplaceView } from "./actionstudio/MarketplaceView";
import { EditorView } from "./actionstudio/EditorView";

interface ActionsStudioTabProps {
  actionConfigs: CustomAction[];
  setActionConfigs: (configs: CustomAction[]) => void;
  editingAction: CustomAction | null;
  setEditingAction: (action: CustomAction | null) => void;
  isNewAction: boolean;
  setIsNewAction: (val: boolean) => void;
  testInput: string;
  setTestInput: (val: string) => void;
  testResult: string;
  setTestResult: (val: string) => void;
  testLoading: boolean;
  setTestLoading: (val: boolean) => void;
  triggerSaveStatus: (message: string, type: "success" | "error") => void;
}

export default function ActionsStudioTab({
  actionConfigs,
  setActionConfigs,
  editingAction,
  setEditingAction,
  isNewAction,
  setIsNewAction,
  testInput,
  setTestInput,
  testResult,
  setTestResult,
  testLoading,
  setTestLoading,
  triggerSaveStatus,
}: ActionsStudioTabProps) {
  const [viewMode, setViewMode] = useState<
    "overview" | "editor" | "marketplace"
  >("overview");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Marketplace state
  const [marketplaceRegistry, setMarketplaceRegistry] =
    useState<Registry | null>(null);
  const [marketplaceLoading, setMarketplaceLoading] = useState(false);
  const [marketplaceError, setMarketplaceError] = useState<string | null>(null);
  const [installingId, setInstallingId] = useState<string | null>(null);

  const builtinConfigs = useMemo(
    () => actionConfigs.filter((a) => a.type === "builtin"),
    [actionConfigs],
  );
  const customConfigs = useMemo(
    () => actionConfigs.filter((a) => a.type === "custom" || !a.type),
    [actionConfigs],
  );
  const marketplaceConfigs = useMemo(
    () => actionConfigs.filter((a) => a.type === "marketplace"),
    [actionConfigs],
  );

  const handleOpenEditor = (action: CustomAction | null) => {
    if (action) {
      setEditingAction(action);
      setIsNewAction(false);
    } else {
      setEditingAction({
        id: crypto.randomUUID(),
        name: "",
        description: "",
        promptTemplate: "",
        systemPrompt: "",
        icon: DEFAULT_ACTION_ICON,
        color: "#8B5CF6",
        type: "custom",
        category: "custom",
        replaceMode: "replace",
        enabled: true,
        createdAt: Date.now(),
      });
      setIsNewAction(true);
    }
    setViewMode("editor");
  };

  const handleBackToOverview = () => {
    setEditingAction(null);
    setIsNewAction(false);
    setViewMode("overview");
  };

  const handleSave = async () => {
    if (!editingAction) return;
    const updated = {
      ...editingAction,
      icon: normalizeActionIconName(editingAction.icon),
      color: editingAction.color || "#8B5CF6",
    };
    await saveActionConfig(updated);
    const all = await loadAllActionConfigs();
    setActionConfigs(all);
    setIsNewAction(false);
    triggerSaveStatus("Action saved successfully!", "success");
  };

  const handleSaveMarketplace = async () => {
    if (!editingAction) return;
    await saveActionConfig(editingAction);
    const all = await loadAllActionConfigs();
    setActionConfigs(all);
    triggerSaveStatus("Action updated.", "success");
  };

  const handleResetBuiltin = async () => {
    if (!editingAction || editingAction.type !== "builtin") return;
    const defaults = await loadAllActionConfigs();
    const defaultAction = BUILTIN_ACTION_DEFAULTS.find(
      (d) => d.id === editingAction.id,
    );
    if (!defaultAction) return;
    const idx = defaults.findIndex((a) => a.id === editingAction.id);
    if (idx >= 0) {
      defaults[idx] = { ...defaultAction };
    } else {
      defaults.push({ ...defaultAction });
    }
    await saveAllActionConfigs(defaults);
    setActionConfigs(defaults);
    setEditingAction({ ...defaultAction });
    triggerSaveStatus("Action reset to defaults.", "success");
  };

  const handleDelete = async () => {
    if (!editingAction) return;
    await deleteActionConfig(editingAction.id);
    const all = await loadAllActionConfigs();
    setActionConfigs(all);
    setEditingAction(null);
    setViewMode("overview");
    setDeleteDialogOpen(false);
    triggerSaveStatus("Action deleted.", "success");
  };

  const fetchMarketplace = useCallback(async (forceRefresh = false) => {
    setMarketplaceLoading(true);
    setMarketplaceError(null);
    try {
      const response = (await chrome.runtime.sendMessage({
        type: "MARKETPLACE_FETCH_REGISTRY",
        forceRefresh,
      })) as { success: boolean; registry?: Registry; error?: string };
      if (response?.success && response.registry) {
        setMarketplaceRegistry(response.registry);
      } else {
        setMarketplaceError(response?.error || "Failed to load marketplace.");
      }
    } catch (err) {
      setMarketplaceError(
        err instanceof Error ? err.message : "Failed to load marketplace.",
      );
    } finally {
      setMarketplaceLoading(false);
    }
  }, []);

  const handleOpenMarketplace = useCallback(() => {
    if (!marketplaceRegistry) {
      setMarketplaceLoading(true);
      void fetchMarketplace();
    }
    setViewMode("marketplace");
  }, [marketplaceRegistry, fetchMarketplace]);

  const handleInstallAction = useCallback(
    async (registryAction: RegistryAction) => {
      setInstallingId(registryAction.id);
      try {
        const response = (await chrome.runtime.sendMessage({
          type: "MARKETPLACE_INSTALL_ACTION",
          sourceId: registryAction.id,
          path: registryAction.path,
        })) as { success: boolean; error?: string };
        if (response?.success) {
          const all = await loadAllActionConfigs();
          setActionConfigs(all);
          triggerSaveStatus(`"${registryAction.name}" installed!`, "success");
        } else {
          triggerSaveStatus(response?.error || "Install failed.", "error");
        }
      } catch (err) {
        triggerSaveStatus(
          err instanceof Error ? err.message : "Install failed.",
          "error",
        );
      } finally {
        setInstallingId(null);
      }
    },
    [setActionConfigs, triggerSaveStatus],
  );

  const handleUpdateAction = useCallback(
    async (registryAction: RegistryAction) => {
      setInstallingId(registryAction.id);
      try {
        // Find the installed action to preserve enabled state
        const installed = actionConfigs.find(
          (a) => a.sourceId === registryAction.id || a.id === registryAction.id,
        );
        const response = (await chrome.runtime.sendMessage({
          type: "MARKETPLACE_INSTALL_ACTION",
          sourceId: registryAction.id,
          path: registryAction.path,
        })) as { success: boolean; error?: string };
        if (response?.success) {
          // Restore the user's enabled state after update
          if (installed && installed.enabled === false) {
            const all = await loadAllActionConfigs();
            const idx = all.findIndex((a) => a.id === registryAction.id);
            if (idx >= 0) {
              all[idx] = { ...all[idx], enabled: false };
              await saveActionConfig(all[idx]);
            }
          }
          const all = await loadAllActionConfigs();
          setActionConfigs(all);
          triggerSaveStatus(`"${registryAction.name}" updated!`, "success");
        } else {
          triggerSaveStatus(response?.error || "Update failed.", "error");
        }
      } catch (err) {
        triggerSaveStatus(
          err instanceof Error ? err.message : "Update failed.",
          "error",
        );
      } finally {
        setInstallingId(null);
      }
    },
    [actionConfigs, setActionConfigs, triggerSaveStatus],
  );

  const handleUninstallAction = useCallback(
    async (registryAction: RegistryAction) => {
      await deleteActionConfig(registryAction.id);
      const all = await loadAllActionConfigs();
      setActionConfigs(all);
      triggerSaveStatus(`"${registryAction.name}" uninstalled.`, "success");
    },
    [setActionConfigs, triggerSaveStatus],
  );

  const handleRunTest = useCallback(async () => {
    if (!editingAction) return;
    setTestLoading(true);
    setTestResult("");
    try {
      const response = await chrome.runtime.sendMessage({
        type: "PROCESS_TEXT",
        action: editingAction.id,
        text: testInput,
      });
      if (response?.success && response.text) {
        setTestResult(response.text);
      } else {
        setTestResult(`Error: ${response?.error || "Unknown error"}`);
      }
    } catch (err: unknown) {
      setTestResult(`Error: ${(err as Error).message}`);
    }
    setTestLoading(false);
  }, [editingAction, testInput, setTestLoading, setTestResult]);

  if (viewMode === "marketplace") {
    return (
      <MarketplaceView
        registry={marketplaceRegistry}
        loading={marketplaceLoading || !marketplaceRegistry}
        error={marketplaceError}
        actionConfigs={actionConfigs}
        installingId={installingId}
        onInstall={handleInstallAction}
        onUpdate={handleUpdateAction}
        onUninstall={handleUninstallAction}
        onRetry={() => fetchMarketplace(true)}
        onBack={() => setViewMode("overview")}
      />
    );
  }

  if (viewMode === "overview") {
    return (
      <OverviewView
        actionConfigs={actionConfigs}
        builtinConfigs={builtinConfigs}
        customConfigs={customConfigs}
        marketplaceConfigs={marketplaceConfigs}
        onOpenEditor={handleOpenEditor}
        onOpenMarketplace={handleOpenMarketplace}
      />
    );
  }

  if (!editingAction) {
    return (
      <OverviewView
        actionConfigs={actionConfigs}
        builtinConfigs={builtinConfigs}
        customConfigs={customConfigs}
        marketplaceConfigs={marketplaceConfigs}
        onOpenEditor={handleOpenEditor}
        onOpenMarketplace={handleOpenMarketplace}
      />
    );
  }

  return (
    <EditorView
      editingAction={editingAction}
      isNewAction={isNewAction}
      builtinConfigs={builtinConfigs}
      customConfigs={customConfigs}
      marketplaceConfigs={marketplaceConfigs}
      actionConfigs={actionConfigs}
      onOpenEditor={handleOpenEditor}
      onChange={setEditingAction}
      onBack={handleBackToOverview}
      onSave={handleSave}
      onSaveMarketplace={handleSaveMarketplace}
      onReset={handleResetBuiltin}
      onRequestDelete={() => setDeleteDialogOpen(true)}
      deleteDialogOpen={deleteDialogOpen}
      onDeleteDialogChange={setDeleteDialogOpen}
      onDelete={handleDelete}
      testInput={testInput}
      onTestInputChange={setTestInput}
      testResult={testResult}
      testLoading={testLoading}
      onRunTest={handleRunTest}
    />
  );
}
