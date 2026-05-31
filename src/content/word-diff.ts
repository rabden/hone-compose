export interface DiffToken {
  type: "equal" | "add" | "remove";
  value: string;
}

/**
 * Tokenizes text into "word + its trailing whitespace" units.
 * By attaching trailing whitespace to each word, spaces always travel
 * with their preceding word, preventing them from being stranded between
 * different diff groups and merged away.
 */
function tokenize(text: string): string[] {
  const tokens: string[] = [];
  // Leading whitespace (if any) as its own token
  const leadingWs = text.match(/^\s+/);
  if (leadingWs) tokens.push(leadingWs[0]);
  // Each non-whitespace run + its trailing whitespace
  const wordRe = /\S+\s*/g;
  let m: RegExpExecArray | null;
  while ((m = wordRe.exec(text)) !== null) {
    tokens.push(m[0]);
  }
  return tokens;
}

/**
 * Computes word-level differences between oldText and newText using an LCS
 * dynamic programming algorithm. Groups tokens of the same type for cleaner rendering.
 */
export function wordDiff(oldText: string, newText: string): DiffToken[] {
  if (oldText === newText) {
    return [{ type: "equal", value: oldText }];
  }

  const oldTokens = tokenize(oldText);
  const newTokens = tokenize(newText);

  const m = oldTokens.length;
  const n = newTokens.length;

  // Fallback for very large texts to avoid O(N^2) memory and time limits
  if (m > 800 || n > 800) {
    return [
      { type: "remove", value: oldText },
      { type: "add", value: newText },
    ];
  }

  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldTokens[i - 1] === newTokens[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const result: DiffToken[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      result.unshift({ type: "equal", value: oldTokens[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: "add", value: newTokens[j - 1] });
      j--;
    } else {
      result.unshift({ type: "remove", value: oldTokens[i - 1] });
      i--;
    }
  }

  // Merge consecutive tokens of same type
  const merged: DiffToken[] = [];
  for (const token of result) {
    const last = merged[merged.length - 1];
    if (last && last.type === token.type) {
      last.value += token.value;
    } else {
      merged.push({ ...token });
    }
  }

  // Collapse alternating add/remove runs into a single replacement block.
  // This keeps adjacent word corrections readable, e.g. "i dont" -> "I don't",
  // instead of rendering as remove/add/remove/add fragments.
  const normalized: DiffToken[] = [];
  let idx = 0;
  while (idx < merged.length) {
    const token = merged[idx];
    if (token.type === "equal") {
      normalized.push(token);
      idx += 1;
      continue;
    }

    let removed = "";
    let added = "";
    while (idx < merged.length && merged[idx].type !== "equal") {
      if (merged[idx].type === "remove") {
        removed += merged[idx].value;
      } else if (merged[idx].type === "add") {
        added += merged[idx].value;
      }
      idx += 1;
    }

    if (removed) normalized.push({ type: "remove", value: removed });
    if (added) normalized.push({ type: "add", value: added });
  }

  return normalized;
}
