import { generateText } from 'ai';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogle } from '@ai-sdk/google';
import { createGroq } from '@ai-sdk/groq';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createDeepSeek } from '@ai-sdk/deepseek';
import { ALL_PROVIDER_IDS, ALL_STORAGE_KEYS, getProviderLabel, isProviderConfigured } from '../providers';
import type { ProviderId } from '../providers';
import { ActionRegistry } from '../content/actions';
import type { PromptPayload } from '../content/actions';
import { checkGrammarAndSpelling, getLinter } from './grammar-worker';

import { addHistoryEntry, saveActionConfig } from '../content/storage';
import type { CustomAction } from '../content/storage';

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

function cleanAiResponse(text: string): string {
  if (!text) return "";
  return text
    .replace(/<\/?(assistant|assitant|system|user|thought)>/gi, "")
    .trim();
}

async function saveToHistory(item: Omit<HistoryItem, 'id' | 'timestamp'>) {
  try {
    await addHistoryEntry({
      ...item,
      rewrittenText: cleanAiResponse(item.rewrittenText),
    });
    chrome.runtime.sendMessage({ type: 'HISTORY_UPDATED' }).catch(() => {});
  } catch (err) {
    console.error('Failed to save history:', err);
  }
}

// Prompt building via ActionRegistry
let _registry: ActionRegistry | null = null;

async function getRegistry(): Promise<ActionRegistry> {
  if (!_registry) {
    _registry = new ActionRegistry();
    await _registry.loadActions();
  }
  return _registry;
}

function buildSystemPrompt(payload: PromptPayload): { system?: string; user: string } {
  if (payload.system) {
    return {
      system: payload.system,
      user: payload.user,
    };
  }
  return { user: payload.user };
}

let activeAIAbort: AbortController | null = null;

function mergeAbortSignals(timeoutMs: number, external?: AbortSignal): AbortSignal {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const abort = () => controller.abort();
  external?.addEventListener('abort', abort);

  controller.signal.addEventListener(
    'abort',
    () => {
      clearTimeout(timeoutId);
      external?.removeEventListener('abort', abort);
    },
    { once: true },
  );

  return controller.signal;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = 12000,
  externalSignal?: AbortSignal,
): Promise<Response> {
  const signal = mergeAbortSignals(timeoutMs, externalSignal);
  return fetch(url, { ...options, signal });
}

async function runProviderModel(
  providerId: string,
  settings: Record<string, string | undefined>,
  prompt: string,
  system: string | undefined,
  signal?: AbortSignal,
): Promise<{ text: string; model: string }> {
  const abortSignal = mergeAbortSignals(20000, signal);

  switch (providerId) {
    case 'openai_compatible': {
      const apiKey = settings.openaiCompatibleKey;
      const modelId = settings.openaiCompatibleModel || 'gpt-5-mini';
      const baseURL = settings.openaiCompatibleBaseUrl || 'https://api.openai.com/v1';
      if (!apiKey) throw new Error('OpenAI Compatible API Key is missing.');
      const provider = createOpenAICompatible({ name: 'openai-compatible', apiKey, baseURL });
      const { text } = await generateText({
        model: provider.chatModel(modelId),
        system, prompt, temperature: 0.7, abortSignal,
      });
      if (!text.trim()) throw new Error('Empty response received from OpenAI Compatible.');
      return { text: text.trim(), model: modelId };
    }
    case 'anthropic_shape': {
      const apiKey = settings.anthropicShapeKey;
      const modelId = settings.anthropicShapeModel || 'claude-sonnet-4-6';
      if (!apiKey) throw new Error('Anthropic Shape API Key is missing.');
      const baseURL = settings.anthropicShapeBaseUrl || undefined;
      const provider = createAnthropic({ apiKey, ...(baseURL ? { baseURL } : {}) });
      const { text } = await generateText({
        model: provider(modelId),
        system, prompt, temperature: 0.7, abortSignal,
      });
      if (!text.trim()) throw new Error('Empty response received from Anthropic Shape.');
      return { text: text.trim(), model: modelId };
    }
    case 'google_ai_studio': {
      const apiKey = settings.googleAiStudioKey;
      const modelId = settings.googleAiStudioModel || 'gemma-4-26b-a4b-it';
      if (!apiKey) throw new Error('Google AI Studio API Key is missing.');
      const provider = createGoogle({ apiKey });
      const { text } = await generateText({
        model: provider(modelId),
        system, prompt, temperature: 0.7, abortSignal,
        providerOptions: { google: { thinkingConfig: { thinkingLevel: 'minimal' } } },
      });
      if (!text.trim()) throw new Error('Empty response received from Google AI Studio.');
      return { text: text.trim(), model: modelId };
    }
    case 'groq': {
      const apiKey = settings.groqKey;
      const modelId = settings.groqModel || 'groq/compound-mini';
      if (!apiKey) throw new Error('Groq API Key is missing.');
      const provider = createGroq({ apiKey });
      const { text } = await generateText({
        model: provider(modelId),
        system, prompt, temperature: 0.7, abortSignal,
      });
      if (!text.trim()) throw new Error('Empty response received from Groq.');
      return { text: text.trim(), model: modelId };
    }
    case 'deepseek': {
      const apiKey = settings.deepseekKey;
      const modelId = settings.deepseekModel || 'deepseek-chat';
      if (!apiKey) throw new Error('DeepSeek API Key is missing.');
      const provider = createDeepSeek({ apiKey });
      const { text } = await generateText({
        model: provider(modelId),
        system, prompt, temperature: 0.7, abortSignal,
      });
      if (!text.trim()) throw new Error('Empty response received from DeepSeek.');
      return { text: text.trim(), model: modelId };
    }
    case 'openrouter': {
      const apiKey = settings.openrouterKey;
      const modelId = settings.openrouterModel || 'anthropic/claude-sonnet-4-6';
      if (!apiKey) throw new Error('OpenRouter API Key is missing.');
      const provider = createOpenRouter({ apiKey });
      const { text } = await generateText({
        model: provider.chat(modelId),
        system, prompt, temperature: 0.7, abortSignal,
      });
      if (!text.trim()) throw new Error('Empty response received from OpenRouter.');
      return { text: text.trim(), model: modelId };
    }
    default:
      throw new Error(`Unknown provider: ${providerId}`);
  }
}

// Helper to make API calls
async function callAIProvider(
  actionId: string,
  text: string,
  url: string,
  signal?: AbortSignal,
  extraParams?: Record<string, string>,
): Promise<{ text: string; fallbackUsed?: string }> {
  const result = await callAIProviderRaw(actionId, text, url, signal, extraParams);
  return {
    text: cleanAiResponse(result.text),
    fallbackUsed: result.fallbackUsed,
  };
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function callAIProviderRaw(
  actionId: string,
  text: string,
  url: string,
  signal?: AbortSignal,
  extraParams?: Record<string, string>,
): Promise<{ text: string; provider: string; model: string; fallbackUsed?: string }> {
  const rawSettings = await chrome.storage.local.get([
    'activeProvider',
    ...ALL_STORAGE_KEYS,
  ]);
  const settings = rawSettings as Record<string, string | undefined>;
  const registry = await getRegistry();

  const primaryProvider = (settings.activeProvider as ProviderId) || 'openrouter';
  const { system, user: rawPrompt } = buildSystemPrompt(registry.buildPrompt(actionId, text));

  let prompt = rawPrompt;
  if (extraParams) {
    for (const [key, val] of Object.entries(extraParams)) {
      prompt = prompt.replaceAll(`{{${key}}}`, val);
    }
  }

  // 1. Try the primary provider
  try {
    const res = await runProviderModel(primaryProvider, settings, prompt, system, signal);
    await saveToHistory({ originalText: text, rewrittenText: res.text, action: actionId, url, provider: primaryProvider, model: res.model });
    return { text: res.text, provider: primaryProvider, model: res.model };
  } catch (primaryErr: unknown) {
    if (signal?.aborted) throw primaryErr;
    console.warn(`Primary provider ${primaryProvider} failed:`, errMsg(primaryErr));

    const altProviders = ALL_PROVIDER_IDS
      .filter(p => p !== primaryProvider)
      .filter(p => isProviderConfigured(p, settings));

    if (altProviders.length === 0) throw primaryErr;

    console.log(`Smart Fallback: Trying alternative configured providers in order:`, altProviders);

    let lastError: unknown = primaryErr;
    for (const altProvider of altProviders) {
      try {
        console.log(`Smart Fallback: Attempting alternate provider: ${altProvider}`);
        const res = await runProviderModel(altProvider, settings, prompt, system, signal);
        console.log(`Smart Fallback: Successfully fell back to: ${getProviderLabel(altProvider)}`);
        await saveToHistory({ originalText: text, rewrittenText: res.text, action: actionId, url, provider: altProvider, model: res.model });
        return { text: res.text, provider: altProvider, model: res.model, fallbackUsed: altProvider };
      } catch (altErr: unknown) {
        if (signal?.aborted) throw altErr;
        console.warn(`Fallback provider ${altProvider} failed:`, errMsg(altErr));
        lastError = altErr;
      }
    }

    throw new Error(`Primary provider (${primaryProvider}) failed: ${errMsg(primaryErr)}. All alternatives also failed. Last error: ${errMsg(lastError)}`, { cause: primaryErr });
  }
}

// ── Marketplace constants ──
const REGISTRY_URL = 'https://raw.githubusercontent.com/rabden/Hone-Actions-Registry/main/registry.json';
const REGISTRY_BASE_URL = 'https://raw.githubusercontent.com/rabden/Hone-Actions-Registry/main/';
const REGISTRY_CACHE_KEY = 'marketplaceRegistryCache';
const REGISTRY_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const VALID_ACTION_PATH_RE = /^actions\/[a-z0-9-]+\.json$/;

interface RegistryAction {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  version: string;
  author: string;
  tags: string[];
  path: string;
}

interface Registry {
  schemaVersion: number;
  actions: RegistryAction[];
}

interface RegistryCache {
  registry: Registry;
  fetchedAt: number;
}

// ── Marketplace handlers ──
async function handleFetchRegistry(forceRefresh: boolean): Promise<{ success: boolean; registry?: Registry; error?: string }> {
  try {
    // Check cache first
    if (!forceRefresh) {
      const stored = await chrome.storage.local.get(REGISTRY_CACHE_KEY);
      const cached = stored[REGISTRY_CACHE_KEY] as RegistryCache | undefined;
      if (cached && Date.now() - cached.fetchedAt < REGISTRY_CACHE_TTL_MS) {
        return { success: true, registry: cached.registry };
      }
    }

    const res = await fetchWithTimeout(REGISTRY_URL, { method: 'GET' }, 12000);
    if (!res.ok) {
      throw new Error(`Registry fetch failed: ${res.statusText}`);
    }
    const registry = await res.json() as Registry;
    if (!registry || typeof registry.schemaVersion !== 'number' || !Array.isArray(registry.actions)) {
      throw new Error('Invalid registry format');
    }

    const cache: RegistryCache = { registry, fetchedAt: Date.now() };
    await chrome.storage.local.set({ [REGISTRY_CACHE_KEY]: cache });

    return { success: true, registry };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function handleInstallAction(sourceId: string, path: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Validate path strictly before fetching
    if (!VALID_ACTION_PATH_RE.test(path)) {
      return { success: false, error: 'Invalid action path format.' };
    }

    const url = REGISTRY_BASE_URL + path;
    const res = await fetchWithTimeout(url, { method: 'GET' }, 12000);
    if (!res.ok) {
      throw new Error(`Action fetch failed: ${res.statusText}`);
    }

    const raw = await res.json() as Record<string, unknown>;

    // Strict field validation — never blind-spread fetched JSON
    const name = typeof raw.name === 'string' ? raw.name.trim() : '';
    const promptTemplate = typeof raw.promptTemplate === 'string' ? raw.promptTemplate : '';
    const description = typeof raw.description === 'string' ? raw.description.trim() : '';
    const icon = typeof raw.icon === 'string' ? raw.icon.trim() : 'Sparkles';
    const color = typeof raw.color === 'string' ? raw.color.trim() : '#8B5CF6';
    const systemPrompt = typeof raw.systemPrompt === 'string' ? raw.systemPrompt : undefined;
    const version = typeof raw.version === 'string' ? raw.version.trim() : '1.0.0';
    const author = typeof raw.author === 'string' ? raw.author.trim() : '';
    const tags = Array.isArray(raw.tags) ? (raw.tags as unknown[]).filter((t): t is string => typeof t === 'string') : [];

    // Validation rules
    if (!name || name.length > 80) {
      return { success: false, error: 'Action name is missing or too long (max 80 chars).' };
    }
    if (!promptTemplate) {
      return { success: false, error: 'Action is missing a prompt template.' };
    }
    if (!promptTemplate.includes('{{input}}')) {
      return { success: false, error: 'Prompt template must contain {{input}} placeholder.' };
    }
    if (promptTemplate.length > 4000) {
      return { success: false, error: 'Prompt template exceeds 4000 characters.' };
    }

    // Construct the action with only whitelisted fields
    const action: CustomAction = {
      id: sourceId,
      name,
      description: description || undefined,
      icon,
      color,
      promptTemplate,
      systemPrompt,
      // Store with category 'custom' so the floating action menu renders it:
      // app.tsx and floating-action-menu.tsx group strictly by
      // primary/custom/tone/length. Marketplace identity is tracked via type/sourceId.
      category: 'custom',
      type: 'marketplace',
      sourceId,
      version,
      author: author || undefined,
      tags: tags.length > 0 ? tags : undefined,
      installedAt: Date.now(),
      enabled: true,
      replaceMode: 'replace',
      createdAt: Date.now(),
    };

    await saveActionConfig(action);
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Trigger onboarding tab on extension install; migrate old storage keys on update
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('onboarding.html') });
  }

  // ponytail: one-shot migration — old provider keys → new schema. Runs on every install/update.
  const MIGRATION_KEY = 'providersMigratedV2';
  const { [MIGRATION_KEY]: already } = await chrome.storage.local.get(MIGRATION_KEY);
  if (already) return;

  const old = await chrome.storage.local.get([
    'activeProvider', 'openaiKey', 'openaiModel', 'openaiEndpoint',
    'anthropicKey', 'anthropicModel',
    'openrouterKey', 'openrouterModel',
    'openrouterPaidKey', 'openrouterPaidModel',
    'geminiKey', 'geminiModel',
  ]) as Record<string, string | undefined>;

  const updates: Record<string, string> = {};
  const toDelete: string[] = [];

  // Provider ID migration
  if (typeof old.activeProvider === 'string') {
    const idMap: Record<string, string> = {
      openai: 'openai_compatible',
      anthropic: 'anthropic_shape',
      openrouter_paid: 'openrouter',
      gemini: 'openrouter', // orphaned legacy provider → fallback to openrouter
    };
    updates.activeProvider = idMap[old.activeProvider] || old.activeProvider;
  }

  // openai → openai_compatible
  if (old.openaiKey) { updates.openaiCompatibleKey = old.openaiKey; toDelete.push('openaiKey'); }
  if (old.openaiModel) { updates.openaiCompatibleModel = old.openaiModel; toDelete.push('openaiModel'); }
  if (old.openaiEndpoint) { updates.openaiCompatibleBaseUrl = old.openaiEndpoint; toDelete.push('openaiEndpoint'); }

  // anthropic → anthropic_shape
  if (old.anthropicKey) { updates.anthropicShapeKey = old.anthropicKey; toDelete.push('anthropicKey'); }
  if (old.anthropicModel) { updates.anthropicShapeModel = old.anthropicModel; toDelete.push('anthropicModel'); }

  // openrouter_paid → openrouter (overwrite old free-tier keys)
  if (old.openrouterPaidKey) { updates.openrouterKey = old.openrouterPaidKey; toDelete.push('openrouterPaidKey'); }
  if (old.openrouterPaidModel) { updates.openrouterModel = old.openrouterPaidModel; toDelete.push('openrouterPaidModel'); }

  // Delete old free-tier openrouter keys if paid migrated over them
  if (old.openrouterPaidKey && old.openrouterKey) { toDelete.push('openrouterKey'); }
  if (old.openrouterPaidModel && old.openrouterModel) { toDelete.push('openrouterModel'); }

  // Delete legacy gemini keys
  if (old.geminiKey) toDelete.push('geminiKey');
  if (old.geminiModel) toDelete.push('geminiModel');

  if (Object.keys(updates).length > 0 || toDelete.length > 0) {
    updates[MIGRATION_KEY] = '1';
    await chrome.storage.local.set(updates);
    if (toDelete.length > 0) await chrome.storage.local.remove(toDelete);
    console.log('Provider storage migrated:', { updates: Object.keys(updates), deleted: toDelete });
  } else {
    await chrome.storage.local.set({ [MIGRATION_KEY]: '1' });
  }
});

// Listen for keyboard shortcuts from Chrome manifest.json commands
// These are more reliable than content script keyboard listeners
// Works even when websites intercept keys (Gmail, Notion, etc.)
chrome.commands.onCommand.addListener((command: string) => {
  // Map manifest commands to content script actions
  const actionMap: Record<string, string> = {
    'toggle-menu': 'toggle_menu',
    'improve-writing': 'improve',
    'fix-spelling': 'fix_spelling',
    'paraphrase': 'paraphrase',
  };

  const action = actionMap[command];
  if (!action) return;

  // Send command to active tab's content script
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]?.id) {
      chrome.tabs.sendMessage(tabs[0].id, {
        type: 'COMMAND_TRIGGERED',
        action,
      }).catch((err) => {
        // Content script might not be loaded on this tab
        console.debug(`Command '${command}' sent to tab ${tabs[0].id}, but no response:`, err.message);
      });
    }
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message: Record<string, unknown>, sender: chrome.runtime.MessageSender, sendResponse: (response?: unknown) => void) => {
  if (message.type === 'ABORT_PROCESS_TEXT') {
    activeAIAbort?.abort();
    activeAIAbort = null;
    sendResponse({ success: true });
    return false;
  }

  if (message.type === 'MARKETPLACE_FETCH_REGISTRY') {
    const forceRefresh = message.forceRefresh === true;
    handleFetchRegistry(forceRefresh).then(sendResponse);
    return true;
  }

  if (message.type === 'MARKETPLACE_INSTALL_ACTION') {
    const sourceId = message.sourceId as string;
    const path = message.path as string;
    if (!sourceId || !path) {
      sendResponse({ success: false, error: 'Missing sourceId or path.' });
      return false;
    }
    handleInstallAction(sourceId, path).then(sendResponse);
    return true;
  }

  if (message.type === 'PROCESS_TEXT') {
    const { action, text, requestId, extraParams } = message;
    const url = sender.tab?.url || 'unknown webpage';

    activeAIAbort?.abort();
    const controller = new AbortController();
    activeAIAbort = controller;

    callAIProvider(action as string, text as string, url, controller.signal, extraParams as Record<string, string>)
      .then((res) => {
        sendResponse({ success: true, text: res.text, fallbackUsed: res.fallbackUsed, requestId });
      })
      .catch((error: unknown) => {
        const err = error instanceof Error ? error : new Error(String(error));
        const aborted =
          err.name === 'AbortError' || controller.signal.aborted;
        if (!aborted) {
          console.error('AI processing error:', err);
        }
        sendResponse({
          success: false,
          aborted,
          error: aborted ? undefined : err.message,
          requestId,
        });
      })
      .finally(() => {
        if (activeAIAbort === controller) {
          activeAIAbort = null;
        }
      });

    return true;
  }

  if (message.type === 'CHECK_GRAMMAR') {
    const text = message.text as string;
    checkGrammarAndSpelling(text)
      .then((corrected) => {
        sendResponse({ success: true, text: corrected });
      })
      .catch((err) => {
        console.error("Grammar check failed in background:", err);
        sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
      });
    return true;
  }

  if (message.type === 'WARMUP_LINTER') {
    getLinter()
      .then(() => sendResponse({ success: true }))
      .catch((err) => {
        console.error("Warmup linter failed in background:", err);
        sendResponse({ success: false, error: err instanceof Error ? err.message : String(err) });
      });
    return true;
  }
});
