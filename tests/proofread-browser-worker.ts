let stored: Record<string, unknown> = {};
Object.defineProperty(globalThis, "chrome", {
  value: {
    runtime: { getURL: (name: string) => new URL(`/node_modules/harper.js/dist/${name}`, self.location.origin).href },
    i18n: { detectLanguage: (_: string, callback: (result: unknown) => void) => callback({ isReliable: false }) },
    storage: { local: {
      get: async () => stored,
      set: async (values: Record<string, unknown>) => {
        stored = { ...stored, ...values };
        self.postMessage({ type: "storage", values });
      },
    } },
  },
});
const grammar = import("../src/background/grammar-worker.ts");
self.addEventListener("message", async ({ data }) => {
  if (data.type === "init") { stored = data.values; return; }
  const { id, message } = data;
  try {
    const api = await grammar;
    if (message.type === "LINT_TEXT") {
      const issues = await api.lintForIssues(message.text);
      self.postMessage({ id, success: true, issues });
    } else if (message.type === "WARMUP_LINTER") {
      await api.getLinter();
      self.postMessage({ id, success: true });
    } else if (message.type === "PROOFREAD_STATE_ADDED") {
      await api.syncProofreadState(message);
      self.postMessage({ id, success: true });
    }
  } catch (error) {
    self.postMessage({ id, success: false, error: String(error) });
  }
});
