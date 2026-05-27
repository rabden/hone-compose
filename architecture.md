# Hone — Technical & Architecture Details

This document contains the low-level architectural details, file tree structure, framework interaction logic, and developer guides for the Hone AI Writing Assistant browser extension.

---

## 🧩 System Flow
```mermaid
graph TD
    User([User]) -->|Focus Field| Content[Content Script]
    Content -->|Capture Text| Adapter[Editor Adapter]
    User -->|Keyboard Shortcut| BG[Background Worker]
    BG -->|Command Message| Content
    Content -->|PROCESS_TEXT| BG
    BG -->|AI Request| AI[AI Provider API]
    AI -->|Rewritten Text| BG
    BG -->|Result| Content
    Content -->|Preview/Apply| User
    Content -->|Transaction| Editor[Web Page Editor]
```

---

## 🏗️ Architecture Design

The project is structured into three main execution environments, coordinated via Chrome's messaging system and shared storage:

### 1. Content Script (`src/content/`)
Injected into every webpage. It handles UI rendering, user interaction, and editor manipulation.
- **Shadow DOM Isolation**: The UI is encapsulated in a Shadow Root to prevent style leaks. Entry: [index.tsx](file:///disk2/desktop/extensions-A/src/content/index.tsx), UI: [app.tsx](file:///disk2/desktop/extensions-A/src/content/app.tsx).
- **Adapter Pattern**: Abstracted interface for different editor types. See [adapters.ts](file:///disk2/desktop/extensions-A/src/content/adapters.ts).
- **Transaction Engine**: Sophisticated logic to inject text into rich-text editors (Slate, Lexical, etc.) without breaking their internal state. See [transaction-engine.ts](file:///disk2/desktop/extensions-A/src/content/transaction-engine.ts).
- **Positioning**: Calculates floating UI placement relative to the text caret using Floating UI. See [positioning.ts](file:///disk2/desktop/extensions-A/src/content/positioning.ts).

### 2. Background Service Worker (`src/background/`)
The extension's central nervous system.
- **AI Orchestration**: Routes prompts to OpenAI, Anthropic, Gemini, or OpenRouter. See [service-worker.ts](file:///disk2/desktop/extensions-A/src/background/service-worker.ts).
- **Retry Strategy**: Implements a cycle-based fallback for OpenRouter Free models, attempting up to 15 different models sequentially.
- **Global Commands**: Listens for manifest-defined keyboard shortcuts (e.g., `toggle-menu`, `fix-spelling`).
- **Response Sanitization**: Sanitizes raw tag leakage (e.g. `</assistant>`, `</thought>`) inside service-worker before caching/display.

### 3. Extension Pages (`src/popup/` & `src/options/`)
- **Popup**: Quick status view, active provider display, and toggle for the "Hone Dot". Entry: [main.tsx](file:///disk2/desktop/extensions-A/src/popup/main.tsx), UI: [popup.tsx](file:///disk2/desktop/extensions-A/src/popup/popup.tsx).
- **Options**: Advanced configuration for API keys, Custom Actions, and Shortcut recording. Entry: [main.tsx](file:///disk2/desktop/extensions-A/src/options/main.tsx), UI: [options.tsx](file:///disk2/desktop/extensions-A/src/options/options.tsx).

---

## 🛠️ Key Technical Deep-Dives

### **Editor Interaction (The "Nooks and Crannies")**
Interacting with web editors is the project's biggest challenge. Hone uses a tiered approach:
1. **Framework Detection**: [editor-detection.ts](file:///disk2/desktop/extensions-A/src/content/editor-detection.ts) identifies if an element is native, Lexical, Slate, or generic `contenteditable`.
2. **React Fiber Traversal**: To support editors like Discord (Slate) and Twitter/X (React Native Web Textareas), Hone traverses the React Fiber tree (`__reactFiber$`) in the page context (Main World) to find the internal `editor` instance or trigger event handler props (`onChange`, `onChangeText`, `onInput`) directly. See [main-world-bridge.ts](file:///disk2/desktop/extensions-A/src/content/main-world-bridge.ts) and [transaction-engine.ts](file:///disk2/desktop/extensions-A/src/content/transaction-engine.ts).
3. **Event Simulation**: Uses `beforeinput` with `insertReplacementText` or simulated `paste` events to ensure editors record the change in their undo/redo history.
4. **DOM Mapping**: [plain-text-dom.ts](file:///disk2/desktop/extensions-A/src/content/plain-text-dom.ts) uses `TreeWalker` and `Range` APIs to accurately map character offsets in plain text back to specific DOM nodes and offsets.

### **Advanced UI Components**
The project includes high-fidelity custom components designed for a native-like feel:
- **Haptic Feedback**: Custom components like `MaterialDesign3Button` and `MaterialDesign3Switch` include a **Web Audio API** based haptic engine that generates "tactile pop" sounds and vibration-like audio cues.
- **Physics-based Animations**: Custom ripple hooks and spring-based easing (`cubic-bezier(0.175, 0.885, 0.32, 1.275)`) provide high-quality interaction feedback.

---

## 📂 Detailed File Tree & Responsibilities

```text
src/
├── background/
│   └── service-worker.ts      # [Core] AI provider routing, API fallbacks, IndexedDB/Storage history syncing, and prompt response sanitization (cleanAiResponse).
├── components/
│   ├── ui/                    # [UI] Radix-based primitives and custom MD3 components.
│   │   ├── badge.tsx          # Unified badge component with variant support.
│   │   ├── button.tsx         # Base Radix-slot button with Tailwind variants.
│   │   ├── card.tsx           # Compound components for structured panels (Title, Description, Content, Footer).
│   │   ├── input.tsx          # Styled HTML input with focus ring and invalid state handling.
│   │   ├── label.tsx          # Accessible Radix label primitive.
│   │   ├── material-design-3-button.tsx # Custom button with Web Audio haptics and ripple physics.
│   │   ├── material-design-3-switch.tsx # Custom switch with audio feedback and spring animations.
│   │   ├── material-dialog.tsx # Styled accessible dialog box primitive utilizing Radix Dialog.
│   │   ├── menu.tsx           # Accessible cascading menu UI using Radix Dropdown Menu.
│   │   ├── modern-dropdown.tsx # Custom dropdown list overlay with keyboard selection logic.
│   │   ├── ripple.tsx         # Styled micro-animation background element for touch/click ripple effects.
│   │   ├── scroll-area.tsx    # Styled scrollbar wrapper with hide-on-idle styling.
│   │   ├── select.tsx         # Complex Radix select with viewport scrolling and portal support.
│   │   ├── separator.tsx      # Accessible decorative separator.
│   │   ├── sheet.tsx          # Slide-out panel element for side options drawer (Radix Dialog).
│   │   ├── sidebar.tsx        # Accessible sidebar navigation shell with Collapsible states.
│   │   ├── skeleton.tsx       # Loading state placeholder block element.
│   │   ├── switch.tsx         # Base Radix switch primitive.
│   │   ├── tabs.tsx           # Multi-variant Radix tabs (default and line styles).
│   │   ├── textarea.tsx       # Auto-sizing textarea with integrated focus styling.
│   │   └── tooltip.tsx        # Radix-based hover tooltip element for auxiliary labels.
│   ├── action-icon-select.tsx # [UI] Custom accessible icon picker with keyboard navigation.
│   ├── hone-logo.tsx          # [UI] SVG brand asset with sizing props.
│   └── material-registry.tsx  # [Logic] Client-side dynamic imports for registering Material Web Components.
├── content/
│   ├── actions.ts             # [Logic] ActionRegistry class. Manages built-in/custom prompts & icons.
│   ├── adapters.ts            # [Logic] EditableAdapter interface & implementations (Native Input, ContentEditable, Slate, Lexical, ProseMirror, Twitter).
│   │                          # Bypasses React state using execCommand and valueTracker resets. Handles boundary text inferences.
│   ├── api.ts                 # [Utility] Robust fetch wrapper with AbortSignal, timeouts, and streaming support.
│   ├── app.tsx                # [Main] Root React component for the injected UI. Manages global state (menu, preview).
│   │                          # Handles focus tracking, scroll/resize updates, and keyboard event interception.
│   ├── content.css            # [Styles] Scoped styles for the Shadow DOM container.
│   ├── editor-detection.ts    # [Logic] Fingerprinting for Slate, Lexical, Native, and contenteditable editors.
│   ├── index.tsx              # [Entry] Mounts the React app into a Shadow Root with style isolation and injects main-world-bridge.js.
│   ├── keyboard-guard.ts      # [Logic] Prevents activation keys (Enter, Space) from leaking to host pages during preview.
│   ├── main-world-bridge.ts   # [Bridge] Standard isolated world bypass allowing direct React/Slate Fiber interactions from the main world.
│   ├── plain-text-dom.ts      # [Logic] DOM Range/Selection utilities for mapping plain text offsets to DOM nodes.
│   ├── positioning.ts         # [UI] Floating-UI integration for anchoring the menu to the text caret.
│   ├── preview-panel.tsx      # [UI] "Before/After" review panel for AI transformations.
│   ├── preview-types.ts       # [Types] TypeScript interfaces for the preview system.
│   ├── rich-editor-replace.ts # [Logic] High-level replacement orchestration for rich-text editors.
│   ├── storage.ts             # [Data] Chrome Storage & IndexedDB (for History) abstraction layer.
│   └── transaction-engine.ts  # [Logic] Low-level framework transaction commits (Slate React Fiber bridge traversal, BeforeInput, ExecCommand, Paste).
├── hooks/
│   └── use-mobile.ts          # [Utility] Responsive breakpoint hooks targeting mobile layouts.
├── lib/
│   ├── action-icons.tsx       # [UI] Dynamic Lucide icon renderer for actions.
│   ├── shortcuts.ts           # [Utility] Formatting and labeling for keyboard shortcuts.
│   └── utils.ts               # [Utility] cn() helper using tailwind-merge and clsx.
├── options/                   # [Page] Extension settings page (React).
│   ├── main.tsx               # Entry point for the options page.
│   └── options.tsx            # Main options UI with API, Shortcut, History, and Actions tabs.
├── popup/                     # [Page] Extension popup menu (React).
│   ├── main.tsx               # Entry point for the popup.
│   └── popup.tsx              # Quick status and settings toggle UI.
├── types/
│   └── material-web.d.ts      # TypeScript definitions for Material Web Components.
├── App.css                    # Vite template styles.
├── App.tsx                    # [Dev] Vite template landing page (not in production bundle).
├── index.css                  # Global Tailwind imports and base styles.
├── main.tsx                   # [Dev] Entry point for the Vite development landing page.
```
