# Hone — AI Writing Assistant for the Web

Hone is a professional-grade Chrome Extension (Manifest V3) that provides AI-powered writing tools (grammar fix, tone change, expansion, etc.) for any text input or textarea on any website. It features a sophisticated editor abstraction layer, a robust transaction engine, and custom Material Design 3 components with integrated haptics.

---

## 🏗️ Architecture Overview

The project is structured into three main execution environments, coordinated via Chrome's messaging system and shared storage.

### 🧩 System Flow
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

### 3. Extension Pages (`src/popup/` & `src/options/`)
- **Popup**: Quick status view, active provider display, and toggle for the "Hone Dot". Entry: [main.tsx](file:///disk2/desktop/extensions-A/src/popup/main.tsx), UI: [popup.tsx](file:///disk2/desktop/extensions-A/src/popup/popup.tsx).
- **Options**: Advanced configuration for API keys, Custom Actions, and Shortcut recording. Entry: [main.tsx](file:///disk2/desktop/extensions-A/src/options/main.tsx), UI: [options.tsx](file:///disk2/desktop/extensions-A/src/options/options.tsx).

---

## 🛠️ Key Technical Deep-Dives

### **Editor Interaction (The "Nooks and Crannies")**
Interacting with web editors is the project's biggest challenge. Hone uses a tiered approach:
1. **Framework Detection**: [editor-detection.ts](file:///disk2/desktop/extensions-A/src/content/editor-detection.ts) identifies if an element is native, Lexical, Slate, or generic `contenteditable`.
2. **React Fiber Traversal**: To support editors like Discord (Slate), Hone traverses the React Fiber tree (`__reactFiber$`) to find the internal `editor` instance. See `findSlateEditor` in [transaction-engine.ts](file:///disk2/desktop/extensions-A/src/content/transaction-engine.ts).
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
│   └── service-worker.ts      # [Core] AI provider routing, History management, Chrome Command listeners.
│                              # Functions: callAIProvider(), fetchOpenRouter(), saveToHistory().
├── components/
│   ├── ui/                    # [UI] Radix-based primitives and custom MD3 components.
│   │   ├── badge.tsx          # Unified badge component with variant support.
│   │   ├── button.tsx         # Base Radix-slot button with Tailwind variants.
│   │   ├── card.tsx           # Compound components for structured panels (Title, Description, Content, Footer).
│   │   ├── input.tsx          # Styled HTML input with focus ring and invalid state handling.
│   │   ├── label.tsx          # Accessible Radix label primitive.
│   │   ├── material-design-3-button.tsx # Custom button with Web Audio haptics and ripple physics.
│   │   ├── material-design-3-switch.tsx # Custom switch with audio feedback and spring animations.
│   │   ├── select.tsx         # Complex Radix select with viewport scrolling and portal support.
│   │   ├── separator.tsx      # Accessible decorative separator.
│   │   ├── switch.tsx         # Base Radix switch primitive.
│   │   ├── tabs.tsx           # Multi-variant Radix tabs (default and line styles).
│   │   └── textarea.tsx       # Auto-sizing textarea with integrated focus styling.
│   ├── action-icon-select.tsx # [UI] Custom accessible icon picker with keyboard navigation.
│   └── hone-logo.tsx          # [UI] SVG brand asset with sizing props.
├── content/
│   ├── actions.ts             # [Logic] ActionRegistry class. Manages built-in/custom prompts & icons.
│   ├── adapters.ts            # [Logic] EditableAdapter interface & implementations (Native, ContentEditable).
│   │                          # Logic for sentence/paragraph/field inference when no text is selected.
│   ├── api.ts                 # [Utility] Robust fetch wrapper with AbortSignal, timeouts, and streaming support.
│   ├── app.tsx                # [Main] Root React component for the injected UI. Manages global state (menu, preview).
│   │                          # Handles focus tracking, scroll/resize updates, and keyboard event interception.
│   ├── content.css            # [Styles] Scoped styles for the Shadow DOM container.
│   ├── editor-detection.ts    # [Logic] Fingerprinting for Slate, Lexical, and Native editors.
│   ├── index.tsx              # [Entry] Mounts the React app into a Shadow Root with style isolation.
│   ├── keyboard-guard.ts      # [Logic] Prevents activation keys (Enter, Space) from leaking to host pages during preview.
│   ├── plain-text-dom.ts      # [Logic] DOM Range/Selection utilities for mapping plain text offsets to DOM nodes.
│   ├── positioning.ts         # [UI] Floating-UI integration for anchoring the menu to the text caret.
│   ├── preview-panel.tsx      # [UI] "Before/After" review panel for AI transformations.
│   ├── preview-types.ts       # [Types] TypeScript interfaces for the preview system.
│   ├── rich-editor-replace.ts # [Logic] High-level replacement orchestration for rich-text editors.
│   ├── storage.ts             # [Data] Chrome Storage & IndexedDB (for History) abstraction layer.
│   └── transaction-engine.ts  # [Logic] Low-level framework commits (Slate React Fiber traversal, BeforeInput).
├── lib/
│   ├── action-icons.tsx       # [UI] Dynamic Lucide icon renderer for actions.
│   ├── shortcuts.ts           # [Utility] Formatting and labeling for keyboard shortcuts.
│   └── utils.ts               # [Utility] cn() helper using tailwind-merge and clsx.
├── options/                   # [Page] Extension settings page (React).
│   ├── main.tsx               # Entry point for the options page.
│   └── options.tsx            # Main options UI with API, Shortcut, History, and Actions tabs.
└── popup/                     # [Page] Extension popup menu (React).
│   ├── main.tsx               # Entry point for the popup.
│   └── popup.tsx              # Quick status and settings toggle UI.
├── App.css                    # Vite template styles.
├── App.tsx                    # [Dev] Vite template landing page (not in production bundle).
├── index.css                  # Global Tailwind imports and base styles.
├── main.tsx                   # [Dev] Entry point for the Vite development landing page.
```

---

## 🚀 Development & Build

### **Vite Multi-Entry Configuration**
The project uses a custom [vite.config.ts](file:///disk2/desktop/extensions-A/vite.config.ts) that handles different build targets (popup, options, background, content) using environment variables (e.g., `ENTRY=background`).

### **Design System**
- **Theming**: Tailwind CSS 4 with a "Dark Mode" first approach.
- **Typography**: [Geist](https://vercel.com/font) and [Outfit](https://fonts.google.com/specimen/Outfit).
- **Primitives**: Radix UI for accessibility and performance.
