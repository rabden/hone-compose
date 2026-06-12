import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { ActionRegistry } from '../content/actions';
import type { PromptPayload } from '../content/actions';

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

function chatMessages(system?: string, prompt?: string) {
  const msgs: { role: string; content: string }[] = [];
  if (system) msgs.push({ role: 'system', content: system });
  if (prompt) msgs.push({ role: 'user', content: prompt });
  return msgs;
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

async function fetchOpenRouter(
  apiKey: string,
  model: string,
  prompt: string,
  system?: string,
  externalSignal?: AbortSignal,
): Promise<string> {
  const res = await fetchWithTimeout('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey || ''}`,
      'HTTP-Referer': 'https://github.com/hone-extension',
      'X-Title': 'Hone'
    },
    body: JSON.stringify({
      model,
      messages: chatMessages(system, prompt),
      temperature: 0.7,
      reasoning: {
        effort: "none"  // Disable reasoning to speed up response time
      }
    })
  }, 15000, externalSignal);

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `OpenRouter request failed: ${res.statusText}`);
  }

  const data = await res.json();
  const resultText = data.choices?.[0]?.message?.content?.trim();
  if (!resultText) throw new Error('Empty response received from OpenRouter.');
  return resultText;
}

// Helper to make API calls
async function callAIProvider(
  actionId: string,
  text: string,
  url: string,
  signal?: AbortSignal,
): Promise<{ text: string; fallbackUsed?: string }> {
  const result = await callAIProviderRaw(actionId, text, url, signal);
  return {
    text: cleanAiResponse(result.text),
    fallbackUsed: result.fallbackUsed,
  };
}

async function tryOpenAI(
  settings: Record<string, string | undefined>,
  prompt: string,
  system?: string,
  signal?: AbortSignal
): Promise<{ text: string; model: string }> {
  const apiKey = settings.openaiKey;
  const model = settings.openaiModel || 'gpt-5-mini';
  const endpoint = settings.openaiEndpoint || 'https://api.openai.com/v1/chat/completions';

  if (!apiKey) throw new Error('OpenAI API Key is missing.');

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: chatMessages(system, prompt),
      temperature: 0.7
    })
  }, 15000, signal);

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `OpenAI request failed: ${res.statusText}`);
  }

  const data = await res.json();
  const resultText = data.choices?.[0]?.message?.content?.trim();
  if (!resultText) throw new Error('Empty response received from OpenAI.');
  return { text: resultText, model };
}

async function tryAnthropic(
  settings: Record<string, string | undefined>,
  prompt: string,
  system?: string,
  signal?: AbortSignal
): Promise<{ text: string; model: string }> {
  const apiKey = settings.anthropicKey;
  const model = settings.anthropicModel || 'claude-sonnet-4-6';

  if (!apiKey) throw new Error('Anthropic API Key is missing.');

  const body: Record<string, unknown> = {
    model,
    max_tokens: 8192,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7
  };
  if (system) {
    body.system = [{ text: system }];
  }

  const res = await fetchWithTimeout('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'dangerously-allow-browser': 'true'
    },
    body: JSON.stringify(body)
  }, 20000, signal);

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `Anthropic request failed: ${res.statusText}`);
  }

  const data = await res.json();
  const resultText = data.content?.[0]?.text?.trim();
  if (!resultText) throw new Error('Empty response received from Anthropic.');
  return { text: resultText, model };
}

async function tryGemini(
  settings: Record<string, string | undefined>,
  prompt: string,
  system?: string,
  signal?: AbortSignal
): Promise<{ text: string; model: string }> {
  const apiKey = settings.geminiKey;
  const model = settings.geminiModel || 'gemini-1.5-flash';

  if (!apiKey) throw new Error('Gemini API Key is missing.');

  const body: Record<string, unknown> = {
    contents: [{
      parts: [{ text: prompt }]
    }]
  };
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const res = await fetchWithTimeout(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  }, 15000, signal);

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `Gemini request failed: ${res.statusText}`);
  }

  const data = await res.json();
  const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
  if (!resultText) throw new Error('Empty response received from Gemini.');
  return { text: resultText, model };
}

async function tryOpenRouterPaid(
  settings: Record<string, string | undefined>,
  prompt: string,
  system?: string,
  signal?: AbortSignal
): Promise<{ text: string; model: string }> {
  const apiKey = settings.openrouterPaidKey;
  const model = settings.openrouterPaidModel;

  if (!apiKey) throw new Error('OpenRouter Paid API Key is missing.');
  if (!model) throw new Error('OpenRouter Paid Model Name is missing.');

  const resultText = await fetchOpenRouter(apiKey, model, prompt, system, signal);
  return { text: resultText, model };
}

async function tryGroq(
  settings: Record<string, string | undefined>,
  prompt: string,
  system?: string,
  signal?: AbortSignal
): Promise<{ text: string; model: string }> {
  const apiKey = settings.groqKey;
  const model = settings.groqModel || 'groq/compound-mini';

  if (!apiKey) throw new Error('Groq API Key is missing.');

  const res = await fetchWithTimeout('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: chatMessages(system, prompt),
      temperature: 1,
      max_completion_tokens: 1024,
      top_p: 1,
      stream: false,
      stop: null,
      compound_custom: {
        tools: {
          enabled_tools: [],
        },
      },
    })
  }, 20000, signal);

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson?.error?.message || `Groq request failed: ${res.statusText}`);
  }

  const data = await res.json();
  const resultText = data.choices?.[0]?.message?.content?.trim();
  if (!resultText) throw new Error('Empty response received from Groq.');
  return { text: resultText, model };
}

async function tryGoogleAISudio(
  settings: Record<string, string | undefined>,
  prompt: string,
  system?: string,
  signal?: AbortSignal
): Promise<{ text: string; model: string }> {
  const apiKey = settings.googleAiStudioKey;
  const model = settings.googleAiStudioModel || 'gemma-4-26b-a4b-it';

  if (!apiKey) throw new Error('Google AI Studio API Key is missing.');

  const config: Record<string, unknown> = {
    thinkingConfig: {
      thinkingLevel: ThinkingLevel.MINIMAL, // Minimizes thinking to speed up response time
    },
  };
  if (system) {
    config.systemInstruction = { parts: [{ text: system }] };
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContentStream({
    model,
    config,
    contents: [
      {
        role: 'user',
        parts: [{ text: prompt }]
      }
    ]
  });

  let resultText = '';
  for await (const chunk of response) {
    if (signal?.aborted) {
      throw new DOMException('Aborted', 'AbortError');
    }
    if (chunk.text) {
      resultText += chunk.text;
    }
  }

  if (!resultText.trim()) throw new Error('Empty response received from Google AI Studio.');
  return { text: resultText, model };
}

async function tryOpenRouterFree(
  settings: Record<string, string | undefined>,
  prompt: string,
  system?: string,
  signal?: AbortSignal
): Promise<{ text: string; model: string }> {
  const FREE_MODELS = [
    "google/gemma-4-31b-it:free",
    "openai/gpt-oss-120b:free",
    "z-ai/glm-4.5-air:free",
    "moonshotai/kimi-k2.6:free",
    "google/gemma-4-26b-a4b-it:free",
    "poolside/laguna-xs.2:free",
    "openai/gpt-oss-20b:free",
    "nvidia/nemotron-3-nano-30b-a3b:free",
    "nvidia/nemotron-3-super-120b-a12b:free",
    "poolside/laguna-m.1:free",
    "nvidia/nemotron-nano-9b-v2:free",
    "openrouter/owl-alpha:free",
  ];

  const apiKey = settings.openrouterKey?.trim() || '';
  if (!apiKey) {
    throw new Error('OpenRouter API Key is missing.');
  }

  const selectedBase = settings.openrouterModel || 'google/gemma-4-26b-a4b-it:free';
  const baseModel = FREE_MODELS.includes(selectedBase) ? selectedBase : FREE_MODELS[0];
  const otherModels = FREE_MODELS.filter(m => m !== baseModel);
  const modelCycle = [baseModel, ...otherModels];

  let lastError: Error | null = null;
  for (let idx = 0; idx < modelCycle.length; idx++) {
    const currentModel = modelCycle[idx];
    try {
      console.log(`OpenRouter Free: Attempt ${idx + 1} using model ${currentModel}`);
      const resultText = await fetchOpenRouter(apiKey, currentModel, prompt, system, signal);
      return { text: resultText, model: currentModel };
    } catch (err: unknown) {
      if (signal?.aborted) {
        throw err;
      }
      const error = err as Error;
      console.warn(`OpenRouter Free: Attempt ${idx + 1} (${currentModel}) failed:`, error.message);
      lastError = error;
    }
  }

  throw new Error(`OpenRouter Free failed. Last error: ${lastError ? lastError.message : 'Unknown'}`);
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

async function callAIProviderRaw(
  actionId: string,
  text: string,
  url: string,
  signal?: AbortSignal,
): Promise<{ text: string; provider: string; model: string; fallbackUsed?: string }> {
  const rawSettings = await chrome.storage.local.get([
    'activeProvider',
    'openaiKey',
    'openaiModel',
    'openaiEndpoint',
    'anthropicKey',
    'anthropicModel',
    'geminiKey',
    'geminiModel',
    'openrouterKey',
    'openrouterModel',
    'openrouterPaidKey',
    'openrouterPaidModel',
    'googleAiStudioKey',
    'googleAiStudioModel',
    'groqKey',
    'groqModel'
  ]);
  const settings = rawSettings as Record<string, string | undefined>;
  const registry = await getRegistry();

  const primaryProvider = settings.activeProvider || 'openrouter';
  const { system, user: prompt } = buildSystemPrompt(registry.buildPrompt(actionId, text));

  const runProvider = async (p: string): Promise<{ text: string; model: string }> => {
    switch (p) {
      case 'openai':
        return tryOpenAI(settings, prompt, system, signal);
      case 'anthropic':
        return tryAnthropic(settings, prompt, system, signal);
      case 'gemini':
        return tryGemini(settings, prompt, system, signal);
      case 'google_ai_studio':
        return tryGoogleAISudio(settings, prompt, system, signal);
      case 'groq':
        return tryGroq(settings, prompt, system, signal);
      case 'openrouter_paid':
        return tryOpenRouterPaid(settings, prompt, system, signal);
      case 'openrouter':
        return tryOpenRouterFree(settings, prompt, system, signal);
      default:
        throw new Error(`Unknown provider: ${p}`);
    }
  };

  // 1. Try the primary provider
  try {
    const res = await runProvider(primaryProvider);
    await saveToHistory({ originalText: text, rewrittenText: res.text, action: actionId, url, provider: primaryProvider, model: res.model });
    return { text: res.text, provider: primaryProvider, model: res.model };
  } catch (primaryErr: unknown) {
    if (signal?.aborted) {
      throw primaryErr;
    }
    console.warn(`Primary provider ${primaryProvider} failed:`, errMsg(primaryErr));

    // 2. Identify all alternative configured providers
    const providersList = ['google_ai_studio', 'openai', 'anthropic', 'gemini', 'groq', 'openrouter_paid', 'openrouter'];
    const altProviders = providersList.filter(p => p !== primaryProvider).filter(p => {
      if (p === 'openai' && settings.openaiKey) return true;
      if (p === 'anthropic' && settings.anthropicKey) return true;
      if (p === 'gemini' && settings.geminiKey) return true;
      if (p === 'google_ai_studio' && settings.googleAiStudioKey) return true;
      if (p === 'groq' && settings.groqKey) return true;
      if (p === 'openrouter_paid' && settings.openrouterPaidKey && settings.openrouterPaidModel) return true;
      if (p === 'openrouter' && settings.openrouterKey) return true;
      return false;
    });

    if (altProviders.length === 0) {
      throw primaryErr;
    }

    console.log(`Smart Fallback: Trying alternative configured providers in order:`, altProviders);

    // 3. Cycle through alternative providers
    let lastError: unknown = primaryErr;
    for (const altProvider of altProviders) {
      try {
        console.log(`Smart Fallback: Attempting alternate provider: ${altProvider}`);
        const res = await runProvider(altProvider);
        console.log(`Smart Fallback: Successfully fell back to provider: ${altProvider}`);
        
        await saveToHistory({ originalText: text, rewrittenText: res.text, action: actionId, url, provider: altProvider, model: res.model });
        return { text: res.text, provider: altProvider, model: res.model, fallbackUsed: altProvider };
      } catch (altErr: unknown) {
        if (signal?.aborted) {
          throw altErr;
        }
        console.warn(`Fallback provider ${altProvider} failed:`, errMsg(altErr));
        lastError = altErr;
      }
    }

    throw new Error(`Primary provider (${primaryProvider}) failed: ${errMsg(primaryErr)}. Also all alternative configured providers failed. Last error: ${errMsg(lastError)}`, { cause: primaryErr });
  }
}

// ── Marketplace constants ──
const REGISTRY_URL = 'https://gitlab.com/rabden-group/hone-actions-registry/-/raw/main/registry.json';
const REGISTRY_BASE_URL = 'https://gitlab.com/rabden-group/hone-actions-registry/-/raw/main/';
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
      category: 'marketplace',
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
    const { action, text, requestId } = message;
    const url = sender.tab?.url || 'unknown webpage';

    activeAIAbort?.abort();
    const controller = new AbortController();
    activeAIAbort = controller;

    callAIProvider(action as string, text as string, url, controller.signal)
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
});
