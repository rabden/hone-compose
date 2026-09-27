"use client";

import KeyBindingsTab from "@/options/tabs/KeyBindingsTab";
import { useOptionsState } from "@/options/options-context";

export default function KeyBindingsPage() {
  const s = useOptionsState();
  return (
    <KeyBindingsTab
      shortcutKey={s.shortcutKey}
      setShortcutKey={s.setShortcutKey}
      shortcutCtrl={s.shortcutCtrl}
      setShortcutCtrl={s.setShortcutCtrl}
      shortcutAlt={s.shortcutAlt}
      setShortcutAlt={s.setShortcutAlt}
      shortcutShift={s.shortcutShift}
      setShortcutShift={s.setShortcutShift}
      shortcutMeta={s.shortcutMeta}
      setShortcutMeta={s.setShortcutMeta}
      shortcutAction={s.shortcutAction}
      setShortcutAction={s.setShortcutAction}
      isRecordingKey={s.isRecordingKey}
      setIsRecordingKey={s.setIsRecordingKey}
      dropdownShortcutKey={s.dropdownShortcutKey}
      setDropdownShortcutKey={s.setDropdownShortcutKey}
      dropdownShortcutCtrl={s.dropdownShortcutCtrl}
      setDropdownShortcutCtrl={s.setDropdownShortcutCtrl}
      dropdownShortcutAlt={s.dropdownShortcutAlt}
      setDropdownShortcutAlt={s.setDropdownShortcutAlt}
      dropdownShortcutShift={s.dropdownShortcutShift}
      setDropdownShortcutShift={s.setDropdownShortcutShift}
      dropdownShortcutMeta={s.dropdownShortcutMeta}
      setDropdownShortcutMeta={s.setDropdownShortcutMeta}
      isRecordingDropdownKey={s.isRecordingDropdownKey}
      setIsRecordingDropdownKey={s.setIsRecordingDropdownKey}
      customActions={s.customActions}
    />
  );
}
