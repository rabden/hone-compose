# Reading-Level Rewriting — Authoritative Reference

> Raw, sourced facts for building a grade-level (G1–G12 + college) AI rewriting feature.
> Numbers only. No prompt engineering. All formulas and claims are cited in §5.

---

## 1. Reading-Level Frameworks

All "grade level" formulas output an approximate US school grade needed for first-reading comprehension. They share two core variables: **sentence length** and **word difficulty** (measured as syllables, characters, or word frequency).

### 1.1 Flesch–Kincaid Grade Level (the de facto standard)

Outputs a US grade level directly. Bundled into MS Word, Grammarly, and most LMS tools. Used by the US military (MIL-STD) and many state insurance laws.

**Formula:**
```
FK grade = 0.39 × (words / sentences) + 11.8 × (syllables / words) − 15.59
```
- `words/sentences` = average words per sentence
- `syllables/words` = average syllables per word
- Emphasizes **sentence length** over word length.
- No upper bound (a 200-char "word" can push it past grade 100). Theoretical minimum is −3.40 ("Go. See. Stop. Rest.").
- *Green Eggs and Ham* scores −1.3 (5.7 wps, 1.02 syl/word).

### 1.2 Flesch Reading Ease (FRES) — companion scale, 0–100

**Formula:**
```
FRES = 206.835 − 1.015 × (words / sentences) − 84.6 × (syllables / words)
```
Higher = easier. Inversely correlated with FK grade. Polysyllabic words swing this score far more than they swing the FK grade.

**Flesch Reading Ease → Grade mapping (Flesch, *How to Write Plain English*):**

| FRES score | US school level | Reading notes |
|------------|-----------------|---------------|
| 100.0–90.0 | 5th grade | Very easy; understood by an average 11-year-old |
| 90.0–80.0 | 6th grade | Easy; conversational English for consumers |
| 80.0–70.0 | 7th grade | Fairly easy |
| 70.0–60.0 | 8th–9th grade | Plain English; ages 13–15 |
| 60.0–50.0 | 10th–12th grade | Fairly difficult |
| 50.0–30.0 | College | Difficult |
| 30.0–10.0 | College graduate | Very difficult |
| ≤10.0 | Professional | Extremely difficult |

**Calibration anchors (real texts):** *Reader's Digest* ≈ 65 (grade 6–7) · *Time* ≈ 52 · average 6th-grader's writing ≈ 60–70 · *Harvard Law Review* ≈ low 30s · US DoD standard for forms/docs = Reading Ease.

### 1.3 Gunning Fog Index (1952)

```
Fog = 0.4 × [ (words / sentences) + 100 × (complex words / words) ]
```
- **Complex word** = 3+ syllables, *excluding* proper nouns, familiar jargon, compound words, and common suffixes (`-es`, `-ed`, `-ing`).
- Designed for ≥100-word passages. Output ≈ years of formal education.
- Conventions: **<12** = suitable for a wide audience; **<8** = near-universal comprehension.

### 1.4 SMOG Index ("Simple Measure of Gobbledygook", 1969)

```
SMOG grade = 1.0430 × √( polysyllables × (30 / sentences) ) + 3.1291
```
- **Polysyllables** = words with 3+ syllables.
- Normed on **30-sentence** samples (statistically invalid below 30 sentences).
- **Preferred for healthcare/health-literacy** material. A 2010 *J R Coll Physicians Edinb* study found Flesch–Kincaid *significantly underestimates* difficulty vs. SMOG (the gold standard).
- Mental-math version: count 3+ syllable words in 3 × 10-sentence samples, take √ of nearest perfect square, +3.

### 1.5 Coleman–Liau Index (1975)

```
CLI = 0.0588 × L − 0.296 × S − 15.8
```
- `L` = average letters per 100 words
- `S` = average sentences per 100 words
- Uses **characters, not syllables** — easier/more accurate for computers than syllable-based formulas.

### 1.6 Automated Readability Index (ARI, 1967)

```
ARI = 4.71 × (characters / words) + 0.5 × (words / sentences) − 21.43
```
- `characters` = letters + numbers.
- Also character-based (like Coleman–Liau). Designed for real-time monitoring on electric typewriters.
- Non-integer scores are **rounded up**.

**ARI score → grade table:**

| ARI | Grade | ARI | Grade |
|-----|-------|-----|-------|
| 1 | K | 8 | 7th |
| 2 | 1st | 9 | 8th |
| 3 | 2nd | 10 | 9th |
| 4 | 3rd | 11 | 10th |
| 5 | 4th | 12 | 11th |
| 6 | 5th | 13 | 12th |
| 7 | 6th | 14 | College |

### 1.7 Lexile (different approach — 1989, MetaMetrics)

**Fundamentally different** from the formulas above:
- Output is a **Lexile measure (L)** on a ~BR300L to 2000L+ scale, **not a grade level**.
- Uses **word frequency** (from the American Heritage Intermediate Corpus) + **sentence length**. Rarer words → higher L. It does *not* count syllables or characters.
- Matches a **reader's Lexile** (from a reading test) to a **text's Lexile** — the framework's purpose is reader–text matching, not just scoring a text.
- Below 0L is reported as **BR** (Beginning Reader), e.g. BR150L.
- Does **not** capture content maturity or multiple levels of meaning. Common Core explicitly says quantitative measures like Lexile *underestimate* the challenge of complex narrative fiction for grade 6+ and recommends qualitative review alongside it.

**Common Core stretch Lexile bands (Appendix A)** — the canonical per-grade quantitative targets:

| Grade band | Lexile range |
|------------|--------------|
| K–1 | N/A (not applicable) |
| 2–3 | 420L–820L |
| 4–5 | 740L–1010L |
| 6–8 | 925L–1185L |
| 9–10 | 1050L–1335L |
| 11–CCR (college/career) | 1185L–1385L |

**Lexile book anchors:** *Green Eggs and Ham* 210L · *Charlotte's Web* 680L · *Harry Potter #1* 880L · *The Hobbit* 1000L · *Pride and Prejudice* 1190L · *A Brief History of Time* 1290L.

**Lexile codes** (prefix context flags): `AD` adult-directed (picture book read to child), `NC` non-conforming (higher than typical for audience), `HL` high-low (low Lexile, high-interest/age), `BR` beginning reader, `NP` non-prose (can't be scored).

### 1.8 ATOS (2000, Renaissance Learning / Accelerated Reader)

```
ATOS uses: words per sentence, average grade level of words, characters per word
```
- Output is a **grade level** (e.g. ATOS 5.5 = grade 5, month 5).
- Developed on a massive corpus: 650 normed reading texts, 474M words across 28,000 books, 30,000+ students' reading records.
- Used to assign book points in the Accelerated Reader program.
- *Harry Potter and the Sorcerer's Stone* = ATOS 5.5.

### 1.9 How they relate
- FK grade, Fog, SMOG, Coleman–Liau, ARI all **output US grade level** and correlate strongly with each other (all reduce to: short sentences + common/short words = easier).
- **Lexile** is the outlier: different scale, frequency-based, used for reader matching.
- **ATOS** is grade-level output but blends character length + word-grade-level + sentence length.
- **Pick FK grade as the default metric** for an LLM rewriting tool: it's the most universally understood, bundled everywhere, and the easiest to steer (two clean variables).

---

## 2. Per-Grade Concrete Targets

The two controllable variables behind every grade-level formula are **(a) average words per sentence** and **(b) average syllables per word / word frequency**. Below are quantitative targets an LLM can hit directly. Words/sentence targets are derived from the FK formula at the stated syllable ratio; Lexile bands are from Common Core Appendix A.

### 2.1 Words-per-sentence targets (derived from Flesch–Kincaid)

Solving `FK = 0.39·WPS + 11.8·SPW − 15.59` for WPS at realistic syllables-per-word (SPW) values:

| Target grade | Words/sentence @ SPW 1.15 (very simple) | @ SPW 1.35 (plain) | @ SPW 1.50 (typical) |
|--------------|------|------|------|
| 2 | ~9 | ~6 | ~3 |
| 4 | ~14 | ~11 | ~7 |
| 6 | ~19 | ~16 | ~12 |
| 8 | — | ~21 | ~18 |
| 10 | — | ~26 | ~23 |
| 12 | — | ~31 | ~28 |
| 14 (college) | — | ~36 | ~33 |

Rule of thumb: **to hold a grade steady while vocabulary gets harder, shorten sentences; to hold it while sentences lengthen, simplify words.**

### 2.2 Grade-band target matrix

| Grade band | Avg words/sentence | Max sentence length (split above this) | Avg syllables/word | Complex words (3+ syl) | Vocabulary tier (Beck) | Lexile band | Paragraph length |
|------------|--------------------|----------------------------------------|--------------------|------------------------|------------------------|-------------|------------------|
| **1–2** early elementary | 5–8 | 10–12 | ≤1.2 | <3% | Tier 1 + Dolch/Fry sight words, decodable | 200L–450L | 1–3 sentences |
| **3–5** elementary | 8–12 | 15 | 1.2–1.3 | <5% | Tier 1 + common Tier 2 | 420L–820L (2–3); 740L–1010L (4–5) | 3–5 sentences |
| **6–8** middle school | 12–18 | 20–25 | 1.3–1.4 | 5–10% | Tier 2 general-academic | 925L–1185L | 4–7 sentences |
| **9–10** high school | 18–22 | 30 | 1.4–1.5 | 10–15% | Tier 2 + domain Tier 3 (defined) | 1050L–1335L | 5–8 sentences |
| **11–12** late high school | 20–28 | 35 | 1.45–1.55 | 12–18% | Tier 2 + Tier 3 | 1185L–1385L | 5–10 sentences |
| **College / professional (13+)** | 20–30+ | 40+ | 1.5–1.7+ | 15–25% | Full Tier 3, jargon, nominalizations | 1300L–1600L+ | 6–12+ sentences |

**Notes on the columns:**
- **Max sentence length:** plain-language convention (APA, plainlanguage.gov) is **20 words max** for general audiences; legal/academic routinely exceeds 30. Hemingway flags sentences >20 as "hard" and >30 as "very hard."
- **Syllables/word:** average English prose ≈ 1.4–1.5. Going below 1.2 (almost all 1-syllable words) is the lever for sub-grade-3.
- **% complex words (3+ syllables):** this is the Gunning Fog variable. Keeping it under ~10% generally keeps text at ≤grade 10.
- **Vocabulary tiers (Beck, McKeown & Kucan, *Bringing Words to Life*):**
  - **Tier 1** = basic everyday words (walk, table, happy). K–1 instruction.
  - **Tier 2** = high-frequency, high-utility academic words (analyze, fortunate, conclude). Taught grades 2–8; the main lever for moving between grade 4 and grade 10.
  - **Tier 3** = low-frequency domain-specific words (isotope, mitosis, tort). Define on first use; the main lever for grade 11+ and "professional."
- **Dolch list** = 220 high-frequency "sight words" (pre-K through grade 3). **Fry list** = 1,000 most common words. Both are the floor for grades 1–3.

### 2.3 Same idea expressed at different grades

> "Plants make their own food using sunlight."

| Grade | Rewrite |
|-------|---------|
| 1–2 | Plants use the sun to make food. |
| 3–5 | Plants make their own food from sunlight. |
| 6–8 | Plants create their own food using energy from sunlight. |
| 9–10 | Plants produce their own food by converting sunlight into chemical energy. |
| 11–12 | Through photosynthesis, plants convert solar energy into chemical energy stored as glucose. |
| College | Photoautotrophic organisms synthesize carbohydrates via the light-dependent and Calvin-cycle reactions of photosynthesis. |

---

## 3. Rewriting Techniques (transformations that move a grade)

Every grade shift is achieved by combining these operations. Lower grade = do more of the left column; higher grade = do more of the right column.

### 3.1 Sentence operations
- **Split compound/complex sentences into simple ones.** "X, and Y, because Z." → "X. Y. This happens because Z." (Each split lowers FK grade noticeably — sentence length is the highest-weighted FK variable at 0.39.)
- **Cut subordinate clauses and parentheticals.**
- **One idea per sentence** at low grades; allow 2–3 linked ideas at high grades.
- **Reduce sentence length range** at low grades (keep most sentences 5–10 words); allow long/short contrast at high grades.
- **Invert for grade-up:** merge short sentences with conjunctions/transitions (*however, consequently, whereas, given that*).

### 3.2 Vocabulary substitution (multisyllabic → common)

| Lower grade | Higher grade |
|-------------|--------------|
| use / use up | utilize / consume |
| end | terminate, culmination |
| help | facilitate, assist |
| start | initiate, commence |
| show | demonstrate, illustrate |
| buy | purchase, procure |
| find out | ascertain, determine |
| about | approximately |
| before | prior to |
| now | currently, at present |
| but | however, nevertheless |
| so | therefore, consequently |
| make | generate, manufacture |
| change | modify, transformation |

- At grade ≤5, prefer the **most frequent 1,000 words** (Fry/Dale lists).
- At grade 6–10, allow **Tier 2 academic words** but keep Tier 3 rare or defined.
- At grade 11+, allow **Tier 3** and Latinate morphology.

### 3.3 Voice: active vs. passive
- **Grades 1–8: strongly prefer active voice** ("The scientist tested the water" not "The water was tested"). Plainlanguage.gov and CDC both require active voice for general audiences.
- **Grade 9–10:** passive acceptable when the actor is irrelevant or unknown.
- **Grade 11+ / professional:** passive and impersonal constructions are conventional in academic/scientific/legal register ("The mixture was heated to 100°C"). Use selectively, not as default.
- Note: passive voice is **not** directly scored by FK/Fog/SMOG (they don't parse syntax), but it lengthens sentences and adds verbs — both raise measured grade.

### 3.4 Jargon / technical terms
- **Grade 1–5:** remove jargon entirely. Replace with everyday word, or omit if non-essential.
- **Grade 6–8:** replace where possible; if a term is essential, **define it inline on first use** in plain words ("the heart's rhythm, called a heartbeat").
- **Grade 9–10:** keep essential domain terms; define on first use; avoid stacked jargon (multiple undefied terms in one sentence).
- **Grade 11+ / professional:** retain jargon; assume domain literacy; use the term without definition.

### 3.5 Idioms & figurative language
- **Grade 1–5:** avoid idioms, metaphors, sarcasm. Literal, concrete language. (Critical for ESL and some disability audiences.)
- **Grade 6–8:** common idioms OK ("break the ice"); avoid obscure/cultural ones.
- **Grade 9–10:** figurative language fine; explain unusual idioms.
- **Grade 11+:** full figurative and rhetorical range.

### 3.6 Before → after, one grade step each

**Grade ~12 → Grade ~8:**
- Before: "Notwithstanding the aforementioned limitations, the researchers concluded that the intervention demonstrably ameliorated patient outcomes across multiple longitudinal cohorts." (28 words, FK ~16)
- After: "Despite these limits, the researchers found the treatment helped patients in several long-term studies." (14 words, FK ~9)

**Grade ~8 → Grade ~4:**
- Before: "Despite these limits, the researchers found the treatment helped patients in several long-term studies."
- After: "Even so, the study showed the treatment helped people get better. The researchers looked at this for a long time." (FK ~4–5)

**Grade ~4 → Grade ~1:**
- Before: "Even so, the study showed the treatment helped people get better."
- After: "The treatment helped people get well." (FK ~1)

---

## 4. Plain Language / Accessibility Principles (separate axis from grade)

Plain language is **audience-relative**, not a fixed grade. The Plain Writing Act of 2010 requires US federal agencies to write so the *intended audience* can find, understand, and use the information on first read. The federal standard explicitly rejects the myth that plain language = "dumbing down to 8th grade for everyone."

### 4.1 WCAG 3.1.5 Reading Level (Level AAA) — what it actually requires
- Text that needs reading ability **beyond lower-secondary level (more than 9 years of school)**, *after removing proper names and titles*, must provide either:
  1. **supplemental content** (summary, illustration, audio, sign language), **or**
  2. a **simpler version** that does not exceed lower-secondary reading level.
- **Lower-secondary = years 7–9 of school** (UNESCO ISCED). In US terms ≈ **grade 9**. Primary = years 1–6; upper secondary = years 10–12.
- This is a **Level AAA** success criterion — not required for A/AA conformance. It is the only place WCAG invokes a numeric reading-level threshold.
- Reading level "may be determined by applying a readability formula to the selected passage"; many formulas use **100-word passages**. Proper names and titles are stripped before scoring because they can't be simplified without losing meaning.

### 4.2 Core plain-language principles (plainlanguage.gov / Plain Writing Act of 2010)
1. **Write for your audience** — match register to readers; don't default to a fixed grade. Define your audience's knowledge level first.
2. **Organize the information** — state the main message / "bottom line" up front; group related info; use headings; preview long documents with a summary.
3. **Use short sentences and simple words** — cut unnecessary words; prefer the common word.
4. **Use the active voice** ("FDA approved the drug" not "The drug was approved by FDA").
5. **Use "you" and other pronouns**; address the reader directly.
6. **Use lists** to convey detail without overloading.
7. **Use tables** where structure helps (not just numbers).
8. **Give every paragraph a topic sentence.**
9. **Be consistent** — use one term for one concept throughout (don't vary synonyms for "interest").
10. **Test with real users** and revise.

### 4.3 "Never do this" rules (anti-patterns)
- **Hidden verbs / nominalizations** — "make a decision" → "decide"; "conduct an investigation" → "investigate"; "give consideration to" → "consider".
- **Passive voice** when the actor is known.
- **Jargon and unnecessary technical/legal terms** — replace with everyday language; if a term is essential, define it where it's first used.
- **Doublets/triplets** — "cease and desist," "due and payable," "null and void." Pick one.
- **Excess modifiers** — *absolutely, actually, completely, really, quite, totally, very*. Usually deletable.
- **Long definitions sections up front** — define inline; if a glossary is needed, put it at the end, alphabetized, unnumbered.
- **Defining common words** ("Age means how old a person is") or defining words you never use.
- **Wordiness** — federal writing's biggest problem; omit anything the audience doesn't need.

### 4.4 CDC Clear Communication Index (research-based, 20 scored items)
A scoring tool (not a formula) for public-health and consumer materials. 4 introductory questions + 20 items across four parts:
- **Part A — Main message & language** (11 items): one main message, message location/visual cues, call to action, active voice, **common words**, bulleted lists, chunking with headings, summary of important info, state what's known/unknown.
- **Part B — Behavioral recommendations** (3 items): recommendation present, *why* it matters, specific actionable directions.
- **Part C — Numbers** (3 items): common/everyday numbers, number meaning explained, no unstated calculations required.
- **Part D — Risk** (3 items): risk explained with both numbers and words, risk vs. benefit presented, consistent probability terms.
- Score ≥90% = passing. CDC also publishes *Everyday Words for Public Health Communication* (jargon → plain-word substitution list).

### 4.5 Hemingway App methodology (popular, transparent)
- Grades text by a variant readability formula, reported as a US grade level (targets **grade 6–8** as "good").
- Color-codes five issues:
  - **Hard to read** = sentences >20 words (yellow).
  - **Very hard to read** = sentences >30 words / high structural complexity (red).
  - **Simpler word available** = an adverb or a complex word with a plainer synonym (blue).
  - **Passive voice** (green).
  - **Adverbs** (purple, includes `-ly` adverbs).
- Default goal: **Reading Ease ~grade 6–8** for general web audiences.

### 4.6 How plain language differs from a fixed grade level
| | Fixed grade level | Plain language |
|---|---|---|
| **Target** | A specific US grade number | The intended audience, whatever their level |
| **Measure** | Formula (FK, SMOG, Lexile) | User comprehension testing + heuristics |
| **Method** | Tune sentence length + word difficulty | Organize, active voice, "you," define jargon, structure |
| **Scope** | Sentence/word statistics only | Also content structure, design, visual aids, summaries |
| **Failure mode** | Can be "gamed" (short choppy sentences that are still incoherent) | Not directly gameable; relies on testing |
- They overlap heavily but are **not identical**: a grade-8 score doesn't guarantee plain-language quality (organization, active voice, jargon handling matter beyond stats), and plain language aimed at PhDs may legitimately be grade 16+.
- **For accessibility (WCAG 3.1.5):** the hard threshold is grade ~9 (lower-secondary). Above that, supplemental content or a simpler version is required.

---

## 5. Authoritative Sources

**Formulas (exact equations):**
- Flesch–Kincaid & Flesch Reading Ease — Wikipedia, *Flesch–Kincaid readability tests*; primary: Kincaid, Fishburne, Rogers & Chissom (1975), *Derivation of new readability formulas*, Research Branch Report 8-75, Naval Technical Training (DTIC ADA006655); Flesch, *How to Write Plain English* (Reading Ease table).
- Gunning Fog — Wikipedia, *Gunning fog index*; primary: Gunning, R. (1952), *The Technique of Clear Writing*, McGraw-Hill.
- SMOG — Wikipedia, *SMOG*; primary: McLaughlin, G.H. (1969), "SMOG Grading — a New Readability Formula," *Journal of Reading* 12(8): 639–646; healthcare preference: Fitzsimmons et al. (2010), *J R Coll Physicians Edinb* 40(4): 292–6.
- Coleman–Liau — Wikipedia, *Coleman–Liau index*; primary: Coleman & Liau (1975), "A computer readability formula designed for machine scoring," *J Applied Psychology* 60: 283–284.
- Automated Readability Index — Wikipedia, *Automated readability index*; primary: Senter & Smith (1967), AMRL-TR-6620, Aerospace Medical Research Labs (DTIC AD667273).
- Lexile — Wikipedia, *Lexile*; primary: MetaMetrics / Lennon & Burdick (2004); NCES (2001), *Assessing the Lexile Framework*.
- ATOS — Wikipedia, *Accelerated Reader#ATOS*; primary: Renaissance Learning, *The ATOS Readability Formula*.
- General: Wikipedia, *Readability* (history, variables, limitations).

**Per-grade quantitative targets:**
- Common Core State Standards, *Appendix A* (Lexile stretch bands by grade): corestandards.org/assets/Appendix_A.pdf (archived).
- Vocabulary tiers: Beck, McKeown & Kucan (2002/2013), *Bringing Words to Life*.
- Dolch sight words (220, pre-K–3) and Fry Instant Words (1,000).
- ARI score→grade table: Senter & Smith (1967), per above.

**Plain language / accessibility:**
- US Plain Writing Act of 2010 (Pub.L. 111-274); plainlanguage.gov guidelines, now hosted at digital.gov/guides/plain-language (Principles; Short and simple; Avoid jargon; Organize; Audience).
- W3C / WAI, *Understanding SC 3.1.5 Reading Level (Level AAA)* — w3.org/WAI/WCAG21/Understanding/reading-level.html (lower-secondary threshold, UNESCO ISCED levels, proper-name exclusion).
- CDC Clear Communication Index — cdc.gov/ccindex (User Guide; 20-item score sheet; *Everyday Words for Public Health Communication*).
- Hemingway App — hemingwayapp.com (methodology, grade targets).

**Limitations of all formulas (worth surfacing in any rewrite tool):**
- Redish, J. (2000), "Readability formulas have even more limitations than Klare discusses," *ACM J Computer Documentation* 24(3): 132–137.
- Formulas ignore content coherence, organization, prior knowledge, layout, and design; they can be gamed by short incoherent sentences. Pair formula scores with plain-language heuristics and (ideally) user testing.
