export interface TextTransaction {
  beforeText: string;
  start: number;
  end: number;
  replacement: string;
  expectedSlice: string;
}

function validSpan(text: string, start: number, end: number): boolean {
  return Number.isInteger(start) && Number.isInteger(end) &&
    start >= 0 && end >= start && end <= text.length;
}

export function normalizeReplacementText(text: string): string {
  return text.replace(/\r\n?/g, "\n");
}

export function locateTextSpan(
  currentText: string,
  start: number,
  end: number,
  expectedText?: string,
  fieldSnapshot?: string,
): { start: number; end: number } | null {
  const source = fieldSnapshot ?? currentText;
  if (!validSpan(source, start, end)) return null;
  const target = expectedText ?? source.slice(start, end);
  if (source.slice(start, end) !== target) return null;
  if (source === currentText) return { start, end };

  // Without the original context, a different occurrence could be an edited target.
  if (fieldSnapshot === undefined || target.length === 0) return null;
  const prefix = source.slice(Math.max(0, start - 32), start);
  const suffix = source.slice(end, end + 32);
  const context = prefix + target + suffix;
  const original = start - prefix.length;
  if (source.indexOf(context) !== original ||
      source.indexOf(context, original + 1) !== -1) return null;

  const match = currentText.indexOf(context);
  if (match === -1 || currentText.indexOf(context, match + 1) !== -1) return null;
  const relocatedStart = match + prefix.length;
  const relocatedEnd = relocatedStart + target.length;
  if ((start === 0 && relocatedStart !== 0) ||
      (end === source.length && relocatedEnd !== currentText.length)) return null;
  return { start: relocatedStart, end: relocatedEnd };
}

export function isValidTextTransaction(tx: TextTransaction): boolean {
  return validSpan(tx.beforeText, tx.start, tx.end) &&
    tx.beforeText.slice(tx.start, tx.end) === tx.expectedSlice &&
    tx.replacement !== tx.expectedSlice;
}

export function isCurrentTextTransaction(tx: TextTransaction, text: string): boolean {
  return isValidTextTransaction(tx) && text === tx.beforeText;
}

export function expectedTextAfterReplace(tx: TextTransaction): string {
  return tx.beforeText.slice(0, tx.start) + tx.replacement + tx.beforeText.slice(tx.end);
}

export function verifyTextReplacement(tx: TextTransaction, text: string): boolean {
  return isValidTextTransaction(tx) && text !== tx.beforeText &&
    text === expectedTextAfterReplace(tx);
}
