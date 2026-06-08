type ProofreaderCorrection = {
  startIndex: number;
  endIndex: number;
};

type ProofreaderResult = {
  corrections?: ProofreaderCorrection[];
};

type ProofreaderSession = {
  proofread(text: string): Promise<ProofreaderResult>;
};

type ProofreaderAvailability =
  | "available"
  | "downloadable"
  | "downloading"
  | "unavailable"
  | boolean;

type ProofreaderGlobal = {
  availability?: (options?: { expectedInputLanguages?: string[] }) => Promise<ProofreaderAvailability> | ProofreaderAvailability;
  create?: (options: {
    expectedInputLanguages: string[];
    monitor?: (monitor: {
      addEventListener: (event: string, listener: (e: ProgressEvent) => void) => void;
    }) => void;
  }) => Promise<ProofreaderSession>;
};

function getProofreader(): ProofreaderGlobal | undefined {
  return (globalThis as typeof globalThis & { Proofreader?: ProofreaderGlobal }).Proofreader;
}

async function canUseProofreader(expectedInputLanguages: string[]): Promise<boolean> {
  const proofreader = getProofreader();
  if (!proofreader?.availability) return false;

  try {
    const availability = await proofreader.availability({ expectedInputLanguages });
    return (
      availability === true ||
      availability === "available" ||
      availability === "downloadable" ||
      availability === "downloading"
    );
  } catch {
    return false;
  }
}

/**
 * Returns true when the browser's built-in proofreader reports at least one issue,
 * false when it reports a clean result, and null when the API is unavailable.
 */
export async function browserHasSpellingErrors(
  text: string,
  expectedInputLanguages: string[] = ["en"],
): Promise<boolean | null> {
  const proofreader = getProofreader();
  if (!proofreader?.create) return null;
  if (!(await canUseProofreader(expectedInputLanguages))) return null;

  try {
    const session = await proofreader.create({ expectedInputLanguages });
    const result = await session.proofread(text);
    return (result.corrections?.length ?? 0) > 0;
  } catch {
    return null;
  }
}
