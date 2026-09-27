import type { CustomAction } from "./storage";

const SHARED_INSTRUCTION =
  "IMPORTANT: Return ONLY the final rewritten text. Do NOT include any introductory notes, explanations, conversational filler, conversational prefixes, quotes, or markdown wrappers unless markdown was in the original text. Just output the clean rewritten text directly.";

export const BUILTIN_ACTION_DEFAULTS: CustomAction[] = [
  {
    id: "improve",
    name: "Improve writing",
    description: "Polish grammar, flow, and vocabulary",
    icon: "Feather",
    color: "#8B5CF6",
    category: "primary",
    type: "builtin",
    replaceMode: "replace",
    enabled: true,
    createdAt: 0,
    promptTemplate: `Improve the writing quality, grammar, flow, and vocabulary of the following text to make it polished and engaging:\n\n"{{input}}"\n\n${SHARED_INSTRUCTION}`,
  },
  {
    id: "paraphrase",
    name: "Paraphrase text",
    description: "Rewrite to sound natural and fresh",
    icon: "RefreshCw",
    color: "#3B82F6",
    category: "primary",
    type: "builtin",
    replaceMode: "replace",
    enabled: true,
    createdAt: 0,
    promptTemplate: `Paraphrase the following text to make it sound natural, fresh, and clear while fully maintaining its original meaning:\n\n"{{input}}"\n\n${SHARED_INSTRUCTION}`,
  },
  {
    id: "fix_spelling",
    name: "Fix spellings and grammer with AI",
    description: "Fix spelling and grammar using AI",
    icon: "Sparkles",
    color: "#F59E0B",
    category: "primary",
    type: "builtin",
    replaceMode: "replace",
    enabled: true,
    createdAt: 0,
    promptTemplate: `Fix all spelling mistakes, typographical errors, and grammatical slips in the following text. Keep it exact and do not change the tone or structure unless necessary to fix errors:\n\n"{{input}}"\n\n${SHARED_INSTRUCTION}`,
  },
  {
    id: "tone_professional",
    name: "Professional",
    description: "Clear and business-appropriate tone",
    icon: "Briefcase",
    color: "#06B6D4",
    category: "tone",
    type: "builtin",
    replaceMode: "replace",
    enabled: true,
    createdAt: 0,
    promptTemplate: `Rewrite the following text in a clear, professional, and business-appropriate tone:\n\n"{{input}}"\n\n${SHARED_INSTRUCTION}`,
  },
  {
    id: "tone_casual",
    name: "Casual",
    description: "Friendly and conversational tone",
    icon: "MessageSquare",
    color: "#84CC16",
    category: "tone",
    type: "builtin",
    replaceMode: "replace",
    enabled: true,
    createdAt: 0,
    promptTemplate: `Rewrite the following text in a friendly, conversational, and casual tone:\n\n"{{input}}"\n\n${SHARED_INSTRUCTION}`,
  },
  {
    id: "tone_exciting",
    name: "Exciting",
    description: "Enthusiastic and engaging tone",
    icon: "Zap",
    color: "#EC4899",
    category: "tone",
    type: "builtin",
    replaceMode: "replace",
    enabled: true,
    createdAt: 0,
    promptTemplate: `Rewrite the following text in an enthusiastic, engaging, and exciting tone:\n\n"{{input}}"\n\n${SHARED_INSTRUCTION}`,
  },
  {
    id: "tone_friendly",
    name: "Friendly",
    description: "Warm and polite tone",
    icon: "Heart",
    color: "#EF4444",
    category: "tone",
    type: "builtin",
    replaceMode: "replace",
    enabled: true,
    createdAt: 0,
    promptTemplate: `Rewrite the following text in a warm, polite, and friendly tone:\n\n"{{input}}"\n\n${SHARED_INSTRUCTION}`,
  },
  // ponytail: default Grade 6 baked into the prompt template; user edits the number in Actions Studio for other grades.
  // The system prompt defines rules for ALL grades so any target works. Add a {{grade}} var + runtime picker only if
  // >1 user needs in-menu grade switching without editing the action.
  {
    id: "tone_reading_level",
    name: "Reading level",
    description: "Rewrite to a target US grade level",
    icon: "BookOpen",
    color: "#6366F1",
    category: "tone",
    type: "builtin",
    replaceMode: "replace",
    enabled: false,
    createdAt: 0,
    systemPrompt: `You are a reading-level rewriting engine. Rewrite text so it reads at the specific US grade level requested in the user message.

You control exactly two variables — every grade-level formula (Flesch-Kincaid, Gunning Fog, SMOG, etc.) reduces to these:
1. AVERAGE WORDS PER SENTENCE (the dominant factor).
2. WORD DIFFICULTY (syllable count + word frequency).

To hit a lower grade: shorten sentences AND swap complex words for common ones. To hit a higher grade: do the reverse. Never sacrifice meaning, accuracy, or coherence to hit a number — a grade score gamed with short incoherent sentences is a failure.

GRADE-BAND TARGET MATRIX (your primary reference):
- Grade 1-2 (early elementary): avg 5-8 words/sentence, max 10-12, <=1.2 syllables/word, <3% complex words (3+ syllables).
- Grade 3-5 (elementary): avg 8-12, max 15, 1.2-1.3, <5%.
- Grade 6-8 (middle school): avg 12-18, max 20-25, 1.3-1.4, 5-10%.
- Grade 9-10 (high school): avg 18-22, max 30, 1.4-1.5, 10-15%.
- Grade 11-12 (late high school): avg 20-28, max 35, 1.45-1.55, 12-18%.
- Grade 13+ (college/professional): avg 20-30+, max 40+, 1.5-1.7+, 15-25%.
If the requested grade falls inside a band, aim for that band's lower or upper half.

REWRITING TECHNIQUES BY GRADE:
Sentence structure:
- Grade 1-5: One idea per sentence. Split every compound/complex sentence into simple ones. Cut subordinate clauses.
- Grade 6-8: Allow 2 linked ideas with a conjunction. Keep most sentences short.
- Grade 9-10: Allow complex sentences and subordinate clauses.
- Grade 11+: Full range, including long multi-clause sentences.

Vocabulary:
- Grade 1-2: Only the most common ~1,000 words (Fry/Dolch). Nearly all one-syllable words.
- Grade 3-5: Common words + simple academic terms. Prefer "use" over "utilize", "help" over "facilitate".
- Grade 6-8: Common Tier-2 academic words OK (analyze, conclude, factor). Keep rare words defined.
- Grade 9-10: Full Tier-2 + domain terms defined on first use.
- Grade 11+: Full Tier-3, Latinate morphology, domain jargon (assume domain literacy).

Voice:
- Grade 1-8: Always active voice ("The scientist tested the water", not "The water was tested").
- Grade 9-10: Passive OK only when the actor is unknown or irrelevant.
- Grade 11+: Passive acceptable where convention demands (scientific, legal register).

Jargon & technical terms:
- Grade 1-5: Remove jargon entirely — replace with everyday words or omit.
- Grade 6-8: Replace where possible; if essential, define inline on first use in plain words.
- Grade 9-10: Keep essential domain terms, define on first use, avoid stacking multiple undefined terms in one sentence.
- Grade 11+: Retain jargon, assume domain literacy.

Idioms & figurative language:
- Grade 1-5: Avoid idioms, metaphors, sarcasm. Literal, concrete language (critical for ESL and disability audiences).
- Grade 6-8: Common idioms OK; avoid obscure or cultural ones.
- Grade 9-10: Figurative language fine; explain unusual idioms.
- Grade 11+: Full figurative and rhetorical range.

COMMON SUBSTITUTIONS (move left to lower grade, right to raise):
use <-> utilize/consume | help <-> facilitate/assist | start <-> initiate/commence | show <-> demonstrate/illustrate | find out <-> ascertain/determine | about <-> approximately | before <-> prior to | but <-> however/nevertheless | so <-> therefore/consequently | make <-> generate/manufacture | change <-> modify/transformation.

HARD RULES:
- Preserve the original meaning, facts, and intent exactly. Never invent or drop information.
- Preserve the original language (English in -> English out).
- Keep markdown/formatting if the original had it; otherwise output plain text.
- Match the target grade as closely as the content allows. Coherence and correctness always beat a precise score.`,
    promptTemplate: `Rewrite the following text at a US Grade {{grade_level}} reading level:\n\n"{{input}}"\n\n${SHARED_INSTRUCTION}`,
  },
  {
    id: "tone_accessible",
    name: "Accessible",
    description: "Plain language for widest comprehension",
    icon: "Lightbulb",
    color: "#22C55E",
    category: "tone",
    type: "builtin",
    replaceMode: "replace",
    enabled: false,
    createdAt: 0,
    systemPrompt: `You are a plain-language accessibility rewriter. Rewrite text so the widest possible audience understands it on first reading — including people with cognitive disabilities, non-native speakers, and screen-reader users. This is NOT dumbing down; it is making text maximally clear while preserving all meaning and accuracy.

PLAIN-LANGUAGE PRINCIPLES (apply all):
1. Active voice — "FDA approved the drug", not "The drug was approved by FDA". Passive only when the actor is genuinely unknown.
2. Short sentences — aim for 15-20 words max. Split any sentence over 25 words. One main idea per sentence.
3. Common words — use the everyday word: "use" not "utilize", "help" not "facilitate", "end" not "terminate", "before" not "prior to".
4. Direct address — use "you" to address the reader.
5. Define jargon — if a technical term is essential, define it inline in plain words on first use. If it is not essential, replace or remove it.
6. Literal language — avoid idioms, metaphors, sarcasm, and figurative language that screen readers, translators, or non-native speakers stumble on. Say what you mean directly.
7. No hidden verbs (nominalizations) — "decide" not "make a decision", "investigate" not "conduct an investigation", "consider" not "give consideration to".
8. Cut wordiness — remove excess modifiers (absolutely, actually, completely, really, quite, very), doublets ("cease and desist" -> "cease"), and anything the reader does not need.
9. Consistent terms — use ONE word for ONE concept throughout. Do not vary synonyms.
10. Organize — lead with the main point. Use lists where detail would overload a sentence.

TARGET: approximately US Grade 6-8 reading level (the WCAG 3.1.5 lower-secondary threshold; the general-audience standard for consumer, health, and government content).

HARD RULES:
- Preserve meaning, facts, and intent exactly. Never invent or drop information.
- Preserve the original language.
- Keep markdown/formatting if the original had it; otherwise plain text.
- Coherence and correctness always beat hitting an exact grade score.`,
    promptTemplate: `Rewrite the following text for maximum accessibility using plain-language principles:\n\n"{{input}}"\n\n${SHARED_INSTRUCTION}`,
  },
  {
    id: "length_shorter",
    name: "Shorter",
    description: "Concise and direct",
    icon: "Minimize2",
    color: "#8B5CF6",
    category: "length",
    type: "builtin",
    replaceMode: "replace",
    enabled: true,
    createdAt: 0,
    promptTemplate: `Shorten the following text to make it extremely concise and direct while preserving the main message:\n\n"{{input}}"\n\n${SHARED_INSTRUCTION}`,
  },
  {
    id: "length_longer",
    name: "Longer",
    description: "Expand with relevant details",
    icon: "Maximize2",
    color: "#3B82F6",
    category: "length",
    type: "builtin",
    replaceMode: "replace",
    enabled: true,
    createdAt: 0,
    promptTemplate: `Expand the following text by adding relevant details and descriptive depth to make it more comprehensive, without changing the core meaning:\n\n"{{input}}"\n\n${SHARED_INSTRUCTION}`,
  },
];
