"use client";

import ActionsStudioTab from "@/options/tabs/ActionsStudioTab";
import { useOptionsState } from "@/options/options-context";

export default function ActionsStudioPage() {
  const s = useOptionsState();
  return (
    <ActionsStudioTab
      actionConfigs={s.actionConfigs}
      setActionConfigs={s.setActionConfigs}
      editingAction={s.editingAction}
      setEditingAction={s.setEditingAction}
      isNewAction={s.isNewAction}
      setIsNewAction={s.setIsNewAction}
      testInput={s.testInput}
      setTestInput={s.setTestInput}
      testResult={s.testResult}
      setTestResult={s.setTestResult}
      testLoading={s.testLoading}
      setTestLoading={s.setTestLoading}
      triggerSaveStatus={s.triggerSaveStatus}
    />
  );
}
