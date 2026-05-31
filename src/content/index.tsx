import { createRoot } from 'react-dom/client';
import App from './app';
import cssText from './content.css?inline';
import { getLinter } from './grammar-worker';

// Inject Main World bridge for React/Slate access
try {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL("main-world-bridge.js");
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
} catch (e) {
  console.error("Hone: Failed to inject bridge script", e);
}

function mount() {
  const EXISTING_ID = 'ai-assistant-root-container';
  if (document.getElementById(EXISTING_ID)) return;

  const container = document.createElement('div');
  container.id = EXISTING_ID;

  // Zero-size anchor at top-left — children use fixed positioning relative to viewport
  Object.assign(container.style, {
    position: 'fixed',
    top: '0',
    left: '0',
    width: '0',
    height: '0',
    overflow: 'visible',
    zIndex: '2147483647',
    pointerEvents: 'none',
  });

  document.documentElement.appendChild(container);

  // Attach Shadow DOM for style isolation
  const shadowRoot = container.attachShadow({ mode: 'open' });

  // Inject scoped Tailwind CSS into shadow root
  const style = document.createElement('style');
  style.textContent = cssText;
  shadowRoot.appendChild(style);

  // React mount target — pointer events enabled so overlay is interactive
  const reactTarget = document.createElement('div');
  Object.assign(reactTarget.style, {
    pointerEvents: 'none',
    position: 'fixed',
    top: '0',
    left: '0',
    width: '0',
    height: '0',
    overflow: 'visible',
  });
  reactTarget.className = 'ai-assistant-shadow-root';
  const syncColorScheme = () => {
    const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    reactTarget.classList.toggle('dark', dark);
  };
  syncColorScheme();
  window
    .matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', syncColorScheme);
  shadowRoot.appendChild(reactTarget);

  // Portal container for floating elements (dropdowns, tooltips, etc.)
  // Used by Radix Portal/Dialog/Select if we add them later
  const portalContainer = document.createElement('div');
  portalContainer.className = 'ai-assistant-portal-root';
  shadowRoot.appendChild(portalContainer);

  const root = createRoot(reactTarget);
  root.render(<App portalContainer={portalContainer} />);
}

// Mount immediately or wait for body if document is still loading
if (document.body) {
  mount();
} else {
  document.addEventListener('DOMContentLoaded', mount);
}

// ── Proactive WASM warmup: compile Harper on first text field interaction ──
let warmedUp = false;
function handleFirstInteraction() {
  if (warmedUp) return;
  const target = document.activeElement;
  if (
    target &&
    (target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      (target as HTMLElement).isContentEditable)
  ) {
    warmedUp = true;
    document.removeEventListener("focusin", handleFirstInteraction, true);
    getLinter().catch(() => {});
  }
}

document.addEventListener("focusin", handleFirstInteraction, true);
