export async function checkGrammarAndSpelling(text: string): Promise<string> {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "CHECK_GRAMMAR", text }, (response) => {
      if (chrome.runtime.lastError) {
        console.error("Hone grammar check message failed:", chrome.runtime.lastError);
        resolve(text);
        return;
      }
      if (response && response.success) {
        resolve(response.text);
      } else {
        resolve(text);
      }
    });
  });
}

// Keep getLinter as a warmup stub so we don't have to change other files
export async function getLinter(): Promise<unknown> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: "WARMUP_LINTER" }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
        return;
      }
      if (response && response.success) {
        resolve(null);
      } else {
        reject(new Error(response?.error || "Warmup failed"));
      }
    });
  });
}
