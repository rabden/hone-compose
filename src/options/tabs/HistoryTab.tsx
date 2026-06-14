import { useRef, useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Button as MaterialDesign3Button } from "@/components/ui/material-design-3-button";
import { ExpandingSearchDock } from "@/components/ui/expanding-search-dock";
import type { ExpandingSearchDockHandle } from "@/components/ui/expanding-search-dock";
import { TagGroup, Tag } from "@/components/ui/tag";
import { Badge } from "@/components/ui/badge";
import { Trash2, Copy, Check, Search } from "lucide-react";
import { Ripple } from "@/components/ui/ripple";
import { HistoryList } from "@/components/history-list";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/material-dialog";

interface HistoryItem {
  id: string;
  timestamp: number;
  url: string;
  action: string;
  originalText: string;
  rewrittenText: string;
  provider: string;
  model: string;
}

interface HistoryTabProps {
  history: HistoryItem[];
  historySearch: string;
  setHistorySearch: (val: string) => void;
  selectedHistoryItem: HistoryItem | null;
  setSelectedHistoryItem: (item: HistoryItem | null) => void;
  historyDialogOpen: boolean;
  setHistoryDialogOpen: (val: boolean) => void;
  clearAllDialogOpen: boolean;
  setClearAllDialogOpen: (val: boolean) => void;
  copiedId: string | null;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  filteredHistory: HistoryItem[];
  getActionName: (code: string) => string;
  handleCopyHistory: (text: string, id: string) => void;
  handleDeleteHistory: (id: string) => Promise<void>;
  handleClearAllHistory: () => Promise<void>;
}

export default function HistoryTab({
  history,
  historySearch, setHistorySearch,
  selectedHistoryItem, setSelectedHistoryItem,
  historyDialogOpen, setHistoryDialogOpen,
  clearAllDialogOpen, setClearAllDialogOpen,
  copiedId,
  contentRef,
  filteredHistory,
  getActionName,
  handleCopyHistory,
  handleDeleteHistory,
  handleClearAllHistory,
}: HistoryTabProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<ExpandingSearchDockHandle>(null);
  const [showFloatingBar, setShowFloatingBar] = useState(false);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setShowFloatingBar(!entry.isIntersecting),
      { threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col animate-in fade-in duration-500 w-full min-w-0 mx-auto max-w-4xl">
      <div
        className={cn(
          "sticky top-0 z-40 h-0 overflow-visible pointer-events-none transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
        )}
      >
        <div
          className={cn(
            "pointer-events-auto bg-card border border-border/40 shadow-lg rounded-full p-4 pl-8 flex items-center justify-between transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]",
            showFloatingBar ? "translate-y-1 opacity-100" : "-translate-y-full opacity-0",
          )}
        >
          <span className="text-sm font-light text-foreground">
            Rewrite History
          </span>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  contentRef?.current?.scrollTo({ top: 0, behavior: "smooth" });
                  setTimeout(() => searchRef.current?.expand(), 200);
                }}
                className="relative overflow-hidden flex h-8 w-8 items-center justify-center rounded-full bg-background hover:bg-muted transition-colors"
                aria-label="Search history"
              >
                <Ripple />
                <Search className="w-3.5 h-3.5 text-muted-foreground relative z-10 pointer-events-none" />
              </button>
            </div>
            {history.length > 0 && (
              <MaterialDesign3Button
                variant="destructive"
                size="sm"
                shape="round"
                onClick={() => setClearAllDialogOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </MaterialDesign3Button>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-10 py-4">
        <div ref={headerRef} className="space-y-3">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            History
          </span>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-light tracking-tight text-foreground leading-tight">
                Rewrite History
              </h1>
              <p className="text-sm text-muted-foreground/80 max-w-2xl leading-relaxed mt-1">
                Review past Hone transformations, text replacements, and copies.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <ExpandingSearchDock
                ref={searchRef}
                onSearch={setHistorySearch}
                placeholder="Search history..."
              />
              {history.length > 0 && (
                <MaterialDesign3Button
                  variant="destructive"
                  size="sm"
                  shape="round"
                  onClick={() => setClearAllDialogOpen(true)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Clear All
                </MaterialDesign3Button>
              )}
            </div>
          </div>
        </div>

      <HistoryList
        items={filteredHistory}
        onItemClick={(item) => {
          setSelectedHistoryItem(item);
          setHistoryDialogOpen(true);
        }}
        getActionName={getActionName}
        emptyTitle={historySearch ? "No results found." : undefined}
        emptyDescription={historySearch ? "Try a different search term." : undefined}
      />

      <Dialog
        open={historyDialogOpen}
        onOpenChange={setHistoryDialogOpen}
      >
        <DialogContent className="max-w-2xl w-full">
          {selectedHistoryItem && (
            <>
              <DialogTitle>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-mono border-border/40"
                  >
                    {getActionName(selectedHistoryItem.action)}
                  </Badge>
                  <span className="text-sm font-light">Details</span>
                </div>
              </DialogTitle>

              <div className="flex flex-col gap-5 px-6 pt-5 pb-6">
                <TagGroup>
                  <Tag variant="non-interactive">
                    {selectedHistoryItem.provider} ·{" "}
                    {selectedHistoryItem.model}
                  </Tag>
                  <Tag variant="non-interactive">
                    {new Date(selectedHistoryItem.timestamp).toLocaleString()}
                  </Tag>
                </TagGroup>

                <div className="flex flex-col gap-1">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wide">
                    Source URL
                  </span>
                  <a
                    href={selectedHistoryItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-foreground/70 hover:text-foreground hover:underline truncate"
                  >
                    {selectedHistoryItem.url}
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-muted-foreground uppercase font-semibold tracking-wide">
                      Original
                    </span>
                    <div className="flex flex-col rounded-lg bg-background relative overflow-hidden">
                      <div
                        className="overflow-y-auto text-xs leading-normal select-text whitespace-pre-wrap max-h-44"
                        style={{
                          fontFamily: '"Geist Variable", system-ui, sans-serif',
                          padding: "12px",
                        }}
                      >
                        {selectedHistoryItem.originalText}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9px] text-foreground/80 uppercase font-semibold tracking-wide">
                      Rewritten
                    </span>
                    <div className="flex flex-col rounded-lg bg-background relative overflow-hidden">
                      <div
                        className="overflow-y-auto text-xs leading-normal select-text whitespace-pre-wrap max-h-44"
                        style={{
                          fontFamily: '"Geist Variable", system-ui, sans-serif',
                          padding: "12px",
                        }}
                      >
                        {selectedHistoryItem.rewrittenText}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 justify-end pt-3">
                  <MaterialDesign3Button
                    variant="destructive"
                    size="sm"
                    shape="round"
                    onClick={() => {
                      handleDeleteHistory(selectedHistoryItem.id);
                      setHistoryDialogOpen(false);
                      setSelectedHistoryItem(null);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete
                  </MaterialDesign3Button>
                  <MaterialDesign3Button
                    variant="default"
                    size="sm"
                    shape="round"
                    onClick={() =>
                      handleCopyHistory(
                        selectedHistoryItem.rewrittenText,
                        selectedHistoryItem.id,
                      )
                    }
                  >
                    {copiedId === selectedHistoryItem.id ? (
                      <Check className="w-3.5 h-3.5" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedId === selectedHistoryItem.id
                      ? "Copied"
                      : "Copy"}
                  </MaterialDesign3Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={clearAllDialogOpen}
        onOpenChange={setClearAllDialogOpen}
      >
        <DialogContent className="max-w-sm w-full">
          <DialogTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm font-light text-foreground">
                Clear All History
              </span>
            </div>
          </DialogTitle>
          <div className="px-6 pb-5 pt-4 flex flex-col gap-5">
            <p className="text-xs text-muted-foreground/70 leading-normal">
              Are you sure you want to clear your entire
              transformation history? This cannot be undone.
            </p>
            <div className="flex gap-2 justify-end">
              <MaterialDesign3Button
                variant="ghost"
                size="sm"
                shape="round"
                onClick={() => setClearAllDialogOpen(false)}
              >
                Cancel
              </MaterialDesign3Button>
              <MaterialDesign3Button
                variant="destructive"
                size="sm"
                shape="round"
                onClick={handleClearAllHistory}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear All
              </MaterialDesign3Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
