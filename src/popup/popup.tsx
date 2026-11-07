import { useCallback, useEffect, useState } from "react";
import { HugeiconsIcon } from "@/components/ui/hugeicons";
import {
  AlertCircleIcon,
  CheckmarkCircle01Icon,
  ChevronDownIcon,
  Copy01Icon,
  Settings03Icon,
} from "@hugeicons/core-free-icons";
import { Button as MaterialDesign3Button } from "@/components/ui/material-design-3-button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/modern-dropdown";
import { SwitchCardGroup } from "@/components/ui/switch-card";
import { HoneLogo } from "@/components/hone-logo";
import { cn } from "@/lib/utils";
import { formatShortcutCombo, getActionLabel } from "@/lib/shortcuts";
import {
  getHistory,
  loadCustomActions,
  type HistoryEntry,
} from "../content/storage";
import {
  ALL_STORAGE_KEYS,
  PROVIDERS,
  PROVIDER_MAP,
  getDefaultModel,
  isProviderConfigured,
  type ProviderId,
} from "../providers";

/**
 * The popup closes on blur and has no room for text entry, so it only reads
 * what it can render: the active engine, key presence (never key values), and
 * the four quick settings. Everything else stays in the options page.
 */
const STORAGE_KEYS = [
  "activeProvider",
  "previewInCard",
  "hideDot",
  "liveProofread",
  "dropdownShortcutKey",
  "dropdownShortcutCtrl",
  "dropdownShortcutAlt",
  "dropdownShortcutShift",
  "dropdownShortcutMeta",
  "shortcutKey",
  "shortcutCtrl",
  "shortcutAlt",
  "shortcutShift",
  "shortcutMeta",
  "shortcutAction",
  ...ALL_STORAGE_KEYS,
];

// Matches the Customizations tab row-label design (`text-xs` semibold,
// normal casing) so both surfaces read as the same settings.
const ROW_LABEL = "text-xs font-semibold text-foreground";

function toProviderId(value: unknown): ProviderId {
  const id = typeof value === "string" ? value : "";
  return PROVIDER_MAP[id] ? (id as ProviderId) : "openrouter";
}

export default function Popup() {
  const [provider, setProvider] = useState<ProviderId>("openrouter");
  const [model, setModel] = useState(() => getDefaultModel("openrouter"));
  const [previewInCard, setPreviewInCard] = useState(true);
  const [hideDot, setHideDot] = useState(false);
  const [liveProofread, setLiveProofread] = useState(true);
  const [store, setStore] = useState<Record<string, unknown>>({});
  const [menuShortcut, setMenuShortcut] = useState<string | null>(null);
  const [quickShortcut, setQuickShortcut] = useState<string | null>(null);
  const [quickActionLabel, setQuickActionLabel] = useState<string>(
    "Fix spelling & grammar",
  );
  // undefined = still loading, null = no rewrites yet
  const [lastRewrites, setLastRewrites] = useState<HistoryEntry[] | null | undefined>(
    undefined,
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const applyStore = useCallback((res: Record<string, unknown>) => {
    const active = toProviderId(res.activeProvider);
    const cfg = PROVIDER_MAP[active];
    const storedModel = res[cfg.modelStorageKey];

    setProvider(active);
    setModel(
      typeof storedModel === "string" && storedModel.trim().length > 0
        ? storedModel
        : getDefaultModel(active),
    );
    // Mirrors the options page default so both surfaces never disagree.
    setPreviewInCard(res.previewInCard !== undefined ? !!res.previewInCard : true);
    setHideDot(!!res.hideDot);
    setLiveProofread(res.liveProofread !== undefined ? !!res.liveProofread : true);
    setMenuShortcut(
      formatShortcutCombo({
        key: (res.dropdownShortcutKey as string) || "d",
        ctrl: !!res.dropdownShortcutCtrl,
        alt:
          res.dropdownShortcutAlt !== undefined
            ? !!res.dropdownShortcutAlt
            : true,
        shift:
          res.dropdownShortcutShift !== undefined
            ? !!res.dropdownShortcutShift
            : true,
        meta: !!res.dropdownShortcutMeta,
      }),
    );
    const quick = formatShortcutCombo({
      key: res.shortcutKey as string | undefined,
      ctrl: !!res.shortcutCtrl,
      alt: !!res.shortcutAlt,
      shift: !!res.shortcutShift,
      meta: !!res.shortcutMeta,
    });
    setQuickShortcut(quick);
    const actionId = (res.shortcutAction as string) || "fix_spelling";
    setQuickActionLabel(getActionLabel(actionId));
    void loadCustomActions().then((custom) => {
      setQuickActionLabel(getActionLabel(actionId, custom));
    });
    setStore(res);
  }, []);

  // One batched read on open. `storage.onChanged` keeps the popup honest if the
  // options page writes the same keys while the popup is still focused, so a
  // stale popup can never clobber a fresh value.
  useEffect(() => {
    let alive = true;
    const reload = () =>
      chrome.storage.local.get(STORAGE_KEYS, (res) => {
        if (alive) applyStore(res as Record<string, unknown>);
      });

    reload();

    const onChanged = (
      _changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area === "local") reload();
    };
    chrome.storage.onChanged.addListener(onChanged);

    return () => {
      alive = false;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, [applyStore]);

  // Two newest rewrites — one indexed read, no full list to render.
  useEffect(() => {
    let alive = true;
    getHistory({ limit: 2 })
      .then((entries) => {
        if (alive) setLastRewrites(entries.length > 0 ? entries : null);
      })
      .catch(() => {
        if (alive) setLastRewrites(null);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Every control applies instantly — the service worker reads settings at
  // action time, so there is nothing to save and nothing to confirm.
  const write = (patch: Record<string, unknown>) => {
    void chrome.storage.local.set(patch);
  };

  const openOptions = () => chrome.runtime.openOptionsPage();

  // Deep-link into the options page: ?tab= selects the tab, ?historyId=
  // additionally opens that rewrite's detail modal (see options.tsx).
  const openOptionsTab = (tab: string, historyId?: string) => {
    const params = new URLSearchParams({ tab });
    if (historyId) params.set("historyId", historyId);
    void chrome.tabs.create({
      url: chrome.runtime.getURL(`options.html?${params.toString()}`),
    });
  };

  const openRewrite = (entry: HistoryEntry) => {
    if (!entry.id) return;
    openOptionsTab("history", entry.id);
  };

  const onRewriteKeyDown = (e: React.KeyboardEvent, entry: HistoryEntry) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openRewrite(entry);
    }
  };

  const copyRewrite = (e: React.SyntheticEvent, entry: HistoryEntry) => {
    e.stopPropagation();
    if (!entry.id) return;
    const id = entry.id;
    navigator.clipboard
      .writeText(entry.rewrittenText)
      .then(() => {
        setCopiedId(id);
        window.setTimeout(
          () => setCopiedId((current) => (current === id ? null : current)),
          1500,
        );
      })
      .catch(() => {
        // Clipboard unavailable — stay silent, the modal has its own copy.
      });
  };

  const onCopyKeyDown = (e: React.KeyboardEvent, entry: HistoryEntry) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      copyRewrite(e, entry);
    }
  };

  const chooseProvider = (id: ProviderId) => {
    write({ activeProvider: id });
  };

  const togglePreview = (checked: boolean) => {
    setPreviewInCard(checked);
    write({ previewInCard: checked });
  };

  const toggleHideDot = (checked: boolean) => {
    setHideDot(checked);
    write({ hideDot: checked });
  };

  const toggleLiveProofread = (checked: boolean) => {
    setLiveProofread(checked);
    write({ liveProofread: checked });
  };

  const providerLabel = PROVIDER_MAP[provider].label;
  const providerReady = isProviderConfigured(provider, store);

  return (
    <div className="w-[640px] bg-card text-foreground select-none p-5 flex flex-col gap-4 font-sans antialiased">
      {/* Header */}
      <div className="flex items-center justify-between animate-in fade-in duration-150">
        <div className="flex items-center gap-2.5">
          <HoneLogo size={18} alt="Hone Logo" />
          <span className="text-xs font-light tracking-tight text-foreground">
            Hone compose
          </span>
        </div>
        <span className="text-[9px] text-muted-foreground/50 font-mono">
          v{chrome.runtime.getManifest().version}
        </span>
      </div>

      <div className="grid grid-cols-[264px_minmax(0,1fr)] gap-4 items-start">
        {/* LEFT — engine */}
        <div className="flex flex-col gap-3 min-w-0">

      {/* Engine — label + model live outside the card, like other sections */}
      <div className="flex flex-col gap-2">
        <span className={ROW_LABEL}>AI provider</span>
        <div className="rounded-3xl border border-border/20 p-0.5 overflow-hidden">
          <DropdownMenu>
            <DropdownMenuTrigger className="w-full rounded-3xl bg-background px-4 py-2.5 gap-2 text-left hover:bg-background/50">
              <span className="flex w-full items-center justify-between gap-2">
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <span
                    className={cn(
                      "size-1.5 rounded-full shrink-0",
                      providerReady ? "bg-emerald-500" : "bg-amber-500",
                    )}
                  />
                  <span className="flex flex-col gap-0.5 min-w-0 flex-1">
                    <span className="text-xs font-semibold text-foreground truncate">
                      {providerLabel}
                    </span>
                    <span
                      className="text-[10px] font-mono text-muted-foreground/60 truncate"
                      title={model}
                    >
                      {model}
                    </span>
                  </span>
                </span>
                <HugeiconsIcon
                  icon={ChevronDownIcon}
                  className="size-3.5 shrink-0 text-muted-foreground/60 transition-transform duration-200 group-data-[state=open]:rotate-180"
                />
              </span>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              align="start"
              className="min-w-[var(--radix-dropdown-menu-trigger-width)]"
            >
              <DropdownMenuRadioGroup
                value={provider}
                onValueChange={(id) => chooseProvider(toProviderId(id))}
              >
                {PROVIDERS.map((p) => (
                  <DropdownMenuRadioItem key={p.id} value={p.id}>
                    <span className="flex-1 truncate">{p.label}</span>
                    <span
                      className={cn(
                        "size-1.5 rounded-full shrink-0",
                        isProviderConfigured(p.id, store)
                          ? "bg-emerald-500"
                          : "bg-amber-500/70",
                      )}
                    />
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {!providerReady && (
          <div className="flex items-start gap-1.5 px-1 text-[10px] leading-normal text-amber-600 dark:text-amber-500">
            <HugeiconsIcon
              icon={AlertCircleIcon}
              className="size-3 shrink-0 mt-px"
            />
            <span>
              No API key for {providerLabel}.{" "}
              <button
                type="button"
                onClick={openOptions}
                className="underline underline-offset-2 hover:no-underline"
              >
                Add one in settings
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Shortcuts — live bindings straight from Key Bindings settings */}
      <div className="flex flex-col gap-2">
        <span className={ROW_LABEL}>Shortcuts</span>
        <div className="rounded-3xl border border-border/20 p-0.5 overflow-hidden flex flex-col gap-0.5">
          <button
            type="button"
            onClick={() => openOptionsTab("shortcut")}
            title="Change in Key Bindings"
            className="flex items-center justify-between gap-2 rounded-t-3xl rounded-b-md bg-background px-4 py-2.5 text-left cursor-default transition-colors hover:bg-background/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          >
            <span className="text-[11px] text-muted-foreground">
              Open menu
            </span>
            <kbd className="font-mono bg-foreground/[0.06] px-1.5 py-0.5 rounded text-[10px] text-foreground/80 border border-border/30 whitespace-nowrap">
              {menuShortcut || "Alt+Shift+D"}
            </kbd>
          </button>
          <button
            type="button"
            onClick={() => openOptionsTab("shortcut")}
            title={
              quickShortcut ? "Change in Key Bindings" : "Set up in Key Bindings"
            }
            className="flex items-center justify-between gap-2 rounded-b-3xl rounded-t-md border-t border-border/10 bg-background px-4 py-2.5 text-left cursor-default transition-colors hover:bg-background/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
          >
            {quickShortcut ? (
              <>
                <span
                  className="text-[11px] text-muted-foreground truncate"
                  title={quickActionLabel}
                >
                  {quickActionLabel}
                </span>
                <kbd className="font-mono bg-foreground/[0.06] px-1.5 py-0.5 rounded text-[10px] text-foreground/80 border border-border/30 whitespace-nowrap shrink-0">
                  {quickShortcut}
                </kbd>
              </>
            ) : (
              <>
                <span className="text-[11px] text-muted-foreground">
                  Quick action
                </span>
                <span className="text-[10px] text-muted-foreground/60 shrink-0">
                  Not set — set up &rarr;
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Last rewrites — fixed-size cards, copy inline, open the history modal */}
      <div className="flex flex-col gap-2 min-w-0">
        <span className={ROW_LABEL}>Last rewrites</span>
        {lastRewrites === undefined ? (
          <div className="rounded-3xl border border-border/20 p-4">
            <span className="text-[11px] text-muted-foreground/50 animate-pulse">
              Loading&hellip;
            </span>
          </div>
        ) : lastRewrites === null ? (
          <p className="text-[11px] text-muted-foreground/60 leading-relaxed px-1">
            No rewrites yet — your latest results will land here.
          </p>
        ) : (
          <div className="rounded-3xl border border-border/20 p-0.5 overflow-hidden flex flex-col gap-0.5">
            {lastRewrites.map((entry, i) => {
              const isOnly = lastRewrites.length === 1;
              const isLast = i === lastRewrites.length - 1;
              const copied = !!entry.id && copiedId === entry.id;
              return (
                <div
                  key={entry.id ?? i}
                  role="button"
                  tabIndex={0}
                  onClick={() => openRewrite(entry)}
                  onKeyDown={(e) => onRewriteKeyDown(e, entry)}
                  title="Open in Rewrite History"
                  className={cn(
                    "flex items-center gap-2 bg-background px-4 py-3 w-full overflow-hidden cursor-default transition-colors hover:bg-background/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20",
                    isOnly
                      ? "rounded-3xl"
                      : isLast
                        ? "rounded-b-3xl rounded-t-md border-t border-border/10"
                        : "rounded-t-3xl rounded-b-md",
                  )}
                >
                  <span className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2 flex-1">
                    {entry.rewrittenText}
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    aria-label={copied ? "Copied" : "Copy rewrite"}
                    title={copied ? "Copied" : "Copy rewrite"}
                    onClick={(e) => copyRewrite(e, entry)}
                    onKeyDown={(e) => onCopyKeyDown(e, entry)}
                    className="shrink-0 rounded-md p-1 cursor-default transition-colors hover:bg-foreground/[0.08] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
                  >
                    <HugeiconsIcon
                      icon={copied ? CheckmarkCircle01Icon : Copy01Icon}
                      className={cn(
                        "size-3.5",
                        copied
                          ? "text-emerald-500"
                          : "text-muted-foreground/70",
                      )}
                    />
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
        </div>

        {/* RIGHT — quick settings */}
        <div className="flex flex-col gap-3.5 min-w-0">
      {/* Overlay Visuals — same section + toggles as the Customizations tab */}
      <div className="flex flex-col gap-2">
        <span className={ROW_LABEL}>Overlay Visuals</span>
        <SwitchCardGroup
          items={[
            {
              id: "hide-dot",
              label: "Hide Trigger Dot",
              description: "Keyboard-only mode",
              checked: hideDot,
              onCheckedChange: toggleHideDot,
            },
            {
              id: "preview",
              label: "Preview AI results in card",
              description: "Review the rewrite before it replaces your text",
              checked: previewInCard,
              onCheckedChange: togglePreview,
            },
          ]}
        />
      </div>

      {/* Live Proofreading — same section as the Customizations tab */}
      <div className="flex flex-col gap-2">
        <span className={ROW_LABEL}>Live Proofreading</span>
        <SwitchCardGroup
          items={[
            {
              id: "live-proofread",
              label: "Underline errors while typing",
              description: "Local Harper check, hover or click a red or blue underline to fix",
              checked: liveProofread,
              onCheckedChange: toggleLiveProofread,
            },
          ]}
        />
      </div>

      {/* Footer */}
      <MaterialDesign3Button
        variant="default"
        size="default"
        shape="round"
        onClick={openOptions}
        className="w-full shrink-0"
      >
        <HugeiconsIcon icon={Settings03Icon} className="w-3.5 h-3.5" />
        Open settings
      </MaterialDesign3Button>
        </div>
      </div>
    </div>
  );
}