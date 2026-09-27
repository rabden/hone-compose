/**
 * Once-only sample seeding for the rewrite history store.
 *
 * The dashboard template ships with a handful of realistic history entries so
 * the History tab has something to render on first run. This module holds the
 * pure decision logic and sample data; the app's storage backend lives in
 * history-seed-backend.ts. Seeding happens at most once per browser profile:
 * the flag lives in the settings store and is never cleared by Clear All, so
 * an emptied store stays empty. Deliberately import-free at runtime so the
 * whole flow stays unit-testable under `node --test`.
 */

/** Mirrors HistoryEntry from content/storage without the storage-layer id. */
export interface SeedableHistoryEntry {
  action: string;
  originalText: string;
  rewrittenText: string;
  timestamp: number;
  url: string;
  provider: string;
  model: string;
}

export const HISTORY_SEED_FLAG_KEY = "historySampleSeeded";

/** Seed only when the flag is unset AND the store has no entries at all. */
export function shouldSeedHistory(flagSet: boolean, entryCount: number): boolean {
  return !flagSet && entryCount === 0;
}

/** Realistic sample rewrite history. */
export function buildSampleHistoryEntries(now = Date.now()): SeedableHistoryEntry[] {
  const minutes = (n: number) => now - n * 60_000;
  return [
    {
      action: "fix_spelling",
      originalText:
        "The deploy pipleline was failling intermitently last night, we are still investigating the root cause.",
      rewrittenText:
        "The deploy pipeline was failing intermittently last night; we are still investigating the root cause.",
      timestamp: minutes(42),
      url: "https://github.com/hone-labs/hone-compose/pull/482",
      provider: "openrouter",
      model: "gpt-5-mini",
    },
    {
      action: "tone_professional",
      originalText:
        "hey, i can't make today's sync — something came up. can we push it? thx",
      rewrittenText:
        "Hello, I'm unable to attend today's sync due to an unforeseen commitment. Would it be possible to reschedule? Thank you for understanding.",
      timestamp: minutes(190),
      url: "https://mail.google.com/mail/u/0/#inbox",
      provider: "groq",
      model: "groq/compound-mini",
    },
    {
      action: "improve",
      originalText:
        "Our editor detects text fields on any webpage and offers AI rewrites with one shortcut press.",
      rewrittenText:
        "The editor automatically detects text fields across any webpage, letting you apply AI-powered rewrites with a single shortcut press.",
      timestamp: minutes(60 * 26),
      url: "https://docs.google.com/document/d/1hone-doc/edit",
      provider: "google_ai_studio",
      model: "gemma-4-31b-it",
    },
    {
      action: "paraphrase",
      originalText:
        "Token limits are enforced per workspace and reset at the start of each billing cycle.",
      rewrittenText:
        "Each workspace has its own token allowance, which refreshes when a new billing cycle begins.",
      timestamp: minutes(60 * 30),
      url: "https://notion.so/team/handbook-8f2",
      provider: "openrouter",
      model: "gpt-5-mini",
    },
    {
      action: "length_shorter",
      originalText:
        "I wanted to quickly follow up on the message I sent yesterday regarding the quarterly roadmap review, since I know everyone's calendars are pretty packed this week and I don't want this to slip through the cracks.",
      rewrittenText:
        "Following up on yesterday's roadmap-review message — I know calendars are packed, but I'd hate for this to slip.",
      timestamp: minutes(60 * 52),
      url: "https://app.slack.com/client/T04/C0dashboard",
      provider: "deepseek",
      model: "deepseek-chat",
    },
    {
      action: "tone_casual",
      originalText:
        "Per my last message, the staging environment is still unavailable; please advise on the expected restoration time.",
      rewrittenText:
        "Just a nudge — staging is still down. Any word on when it'll be back?",
      timestamp: minutes(60 * 74),
      url: "https://linear.app/hone/issue/HON-312",
      provider: "anthropic_shape",
      model: "claude-sonnet-4-6",
    },
    {
      action: "fix_spelling",
      originalText:
        "Recieved — will circle back tomorow with the updated figma link.",
      rewrittenText:
        "Received — I'll circle back tomorrow with the updated Figma link.",
      timestamp: minutes(60 * 96),
      url: "https://twitter.com/notifications",
      provider: "groq",
      model: "groq/compound-mini",
    },
    {
      action: "length_longer",
      originalText:
        "v0.3 adds history search, a new onboarding flow, and much faster cold starts.",
      rewrittenText:
        "Release 0.3 is a quality-of-life drop: history is now fully searchable, the onboarding flow has been redesigned end to end, and cold starts are dramatically faster thanks to a reworked bootstrap path.",
      timestamp: minutes(60 * 120),
      url: "https://hone.app/changelog",
      provider: "openrouter",
      model: "gpt-5-mini",
    },
  ];
}

/**
 * Storage backend for the seeding flow. The app supplies IndexedDB plus the
 * settings store; tests drive the same logic with an in-memory backend (the
 * same approach as the localStorage shim in tests/settings-store.test.ts).
 */
export interface HistorySeedBackend {
  hasSeedFlag(): Promise<boolean>;
  countEntries(): Promise<number>;
  writeEntries(entries: SeedableHistoryEntry[]): Promise<void>;
  markSeeded(): Promise<void>;
}

let inFlight: Promise<boolean> | null = null;

/**
 * Seed the sample history at most once per browser profile. Returns true if
 * sample entries were written this call.
 */
export async function seedHistoryOnce(
  backend: HistorySeedBackend,
): Promise<boolean> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    const [flagSet, entryCount] = await Promise.all([
      backend.hasSeedFlag(),
      backend.countEntries(),
    ]);
    if (!shouldSeedHistory(flagSet, entryCount)) {
      // History that exists without the flag is the user's own data — adopt
      // the flag so their later Clear All is respected and never re-seeded.
      if (!flagSet) await backend.markSeeded();
      return false;
    }
    await backend.writeEntries(buildSampleHistoryEntries());
    await backend.markSeeded();
    return true;
  })();
  try {
    return await inFlight;
  } finally {
    inFlight = null;
  }
}
