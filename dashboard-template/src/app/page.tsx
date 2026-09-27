"use client";

import DashboardTab from "@/options/tabs/DashboardTab";
import { useOptionsState } from "@/options/options-context";

export default function DashboardPage() {
  const s = useOptionsState();
  return (
    <DashboardTab
      setActiveTab={s.setActiveTab}
      activeProvider={s.activeProvider}
      openrouterKey={s.openrouterKey}
      openaiCompatibleKey={s.openaiCompatibleKey}
      anthropicShapeKey={s.anthropicShapeKey}
      googleAiStudioKey={s.googleAiStudioKey}
      groqKey={s.groqKey}
      openaiCompatibleModel={s.openaiCompatibleModel}
      anthropicShapeModel={s.anthropicShapeModel}
      openrouterModel={s.openrouterModel}
      googleAiStudioModel={s.googleAiStudioModel}
      groqModel={s.groqModel}
      deepseekKey={s.deepseekKey}
      deepseekModel={s.deepseekModel}
      dropdownShortcutKey={s.dropdownShortcutKey}
      dropdownShortcutCtrl={s.dropdownShortcutCtrl}
      dropdownShortcutAlt={s.dropdownShortcutAlt}
      dropdownShortcutShift={s.dropdownShortcutShift}
      dropdownShortcutMeta={s.dropdownShortcutMeta}
      hideDot={s.hideDot}
      history={s.history}
      customActions={s.customActions}
    />
  );
}
