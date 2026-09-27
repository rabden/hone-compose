"use client";

import HistoryTab from "@/options/tabs/HistoryTab";
import { useOptionsState } from "@/options/options-context";

export default function HistoryPage() {
  const s = useOptionsState();
  return (
    <HistoryTab
      history={s.history}
      historySearch={s.historySearch}
      setHistorySearch={s.setHistorySearch}
      selectedHistoryItem={s.selectedHistoryItem}
      setSelectedHistoryItem={s.setSelectedHistoryItem}
      historyDialogOpen={s.historyDialogOpen}
      setHistoryDialogOpen={s.setHistoryDialogOpen}
      clearAllDialogOpen={s.clearAllDialogOpen}
      setClearAllDialogOpen={s.setClearAllDialogOpen}
      copiedId={s.copiedId}
      contentRef={s.contentRef}
      filteredHistory={s.filteredHistory}
      getActionName={s.getActionName}
      handleCopyHistory={s.handleCopyHistory}
      handleDeleteHistory={s.handleDeleteHistory}
      handleClearAllHistory={s.handleClearAllHistory}
    />
  );
}
