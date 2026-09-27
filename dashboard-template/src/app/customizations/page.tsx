"use client";

import CustomizationsTab from "@/options/tabs/CustomizationsTab";
import { useOptionsState } from "@/options/options-context";

export default function CustomizationsPage() {
  const s = useOptionsState();
  return (
    <CustomizationsTab
      hideDot={s.hideDot}
      setHideDot={s.setHideDot}
      previewInCard={s.previewInCard}
      setPreviewInCard={s.setPreviewInCard}
      enableProviderFallback={s.enableProviderFallback}
      setEnableProviderFallback={s.setEnableProviderFallback}
      autoSpellcheckMode={s.autoSpellcheckMode}
      setAutoSpellcheckMode={s.setAutoSpellcheckMode}
      autoSpellcheckWordThreshold={s.autoSpellcheckWordThreshold}
      setAutoSpellcheckWordThreshold={s.setAutoSpellcheckWordThreshold}
      historyLimit={s.historyLimit}
      setHistoryLimit={s.setHistoryLimit}
    />
  );
}
