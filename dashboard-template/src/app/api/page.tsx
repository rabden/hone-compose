"use client";

import ApiProvidersTab from "@/options/tabs/ApiProvidersTab";
import { useOptionsState } from "@/options/options-context";

export default function ApiProvidersPage() {
  const s = useOptionsState();
  return (
    <ApiProvidersTab
      activeProvider={s.activeProvider}
      setActiveProvider={s.setActiveProvider}
      openaiCompatibleKey={s.openaiCompatibleKey}
      setOpenaiCompatibleKey={s.setOpenaiCompatibleKey}
      openaiCompatibleModel={s.openaiCompatibleModel}
      setOpenaiCompatibleModel={s.setOpenaiCompatibleModel}
      openaiCompatibleBaseUrl={s.openaiCompatibleBaseUrl}
      setOpenaiCompatibleBaseUrl={s.setOpenaiCompatibleBaseUrl}
      anthropicShapeKey={s.anthropicShapeKey}
      setAnthropicShapeKey={s.setAnthropicShapeKey}
      anthropicShapeModel={s.anthropicShapeModel}
      setAnthropicShapeModel={s.setAnthropicShapeModel}
      anthropicShapeBaseUrl={s.anthropicShapeBaseUrl}
      setAnthropicShapeBaseUrl={s.setAnthropicShapeBaseUrl}
      openrouterKey={s.openrouterKey}
      setOpenrouterKey={s.setOpenrouterKey}
      openrouterModel={s.openrouterModel}
      setOpenrouterModel={s.setOpenrouterModel}
      googleAiStudioKey={s.googleAiStudioKey}
      setGoogleAiStudioKey={s.setGoogleAiStudioKey}
      googleAiStudioModel={s.googleAiStudioModel}
      setGoogleAiStudioModel={s.setGoogleAiStudioModel}
      groqKey={s.groqKey}
      setGroqKey={s.setGroqKey}
      groqModel={s.groqModel}
      setGroqModel={s.setGroqModel}
      deepseekKey={s.deepseekKey}
      setDeepseekKey={s.setDeepseekKey}
      deepseekModel={s.deepseekModel}
      setDeepseekModel={s.setDeepseekModel}
    />
  );
}
