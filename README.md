# Ghost AI — Stealth Overlay Assistant

An invisible, always-on-top AI assistant overlay built with Electron + Preact. Completely **undetectable** in screen recordings, screen shares, and screenshots while providing real-time AI assistance via text, voice, and screenshot analysis.

---

## Requirements

- **Node.js** >= 18, **npm** >= 9
- **Windows** 10 (2004+), macOS, or Linux
- At least one AI provider configured (GitHub Models recommended — free with a GitHub token)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Build the project
npm run build

# 3. Run in development mode
npx electron . --dev
```

### All Scripts

| Command | What it does |
|---------|-------------|
| `npm run build` | Clean + compile TypeScript (main & preload) + bundle renderer (esbuild) |
| `npm run dev` | Build + launch with `--dev` flag |
| `npm start` | Build + launch |
| `npm run dist` | Build + package for current OS (electron-builder) |
| `npm run dist:win` | Package for Windows |
| `npm run dist:mac` | Package for macOS |
| `npm run dist:linux` | Package for Linux |

---

## How It Works

### Stealth — Invisible to Screen Capture

The overlay is **only visible on your physical display**. No software can capture it:

| Layer | Mechanism |
|-------|-----------|
| **Content protection** | `setContentProtection(true)` → Windows `WDA_EXCLUDEFROMCAPTURE` flag. Hidden from OBS, Zoom, Teams, Discord, Snipping Tool, PrintScreen |
| **Re-asserted every 1s** | Interval re-applies content protection + always-on-top to prevent Windows from resetting them |
| **Re-asserted on state change** | Every focus toggle, click-through change, and screenshot restore re-applies protection |
| **Never disabled** | No code path can turn off content protection — the toggle function was removed entirely |
| **Screenshot safety** | Screenshots hide the window instead of disabling protection, then restore it |
| **Cursor hidden** | `cursor: none !important` on all elements — no pointer shape changes visible in screen share |
| **Skip taskbar** | Not shown in taskbar or Alt+Tab |
| **Process disguise** | Shows as "System Runtime" in Task Manager |

### AI Engine — Hybrid OCR + Chat

**Text questions:** Sent to the first available provider in your priority list.

**Screenshot analysis (2-step hybrid):**
1. **OCR step** — Vision API extracts all text from the screenshot
2. **Analysis step** — Chat AI analyzes the extracted text (cheaper than sending the image again)

Provider shows as `GitHub→GitHub` (or whichever providers were used for each step).

### Voice — VAD-Based Speech-to-Text

Uses Voice Activity Detection (energy-based) instead of fixed recording chunks:

1. Microphone listens continuously via `AudioContext` + `AnalyserNode`
2. RMS energy threshold (0.015) detects speech start → begins recording
3. 2 seconds of silence → stops recording and sends to Whisper API
4. Transcription auto-submits as an AI question
5. Fallback chain: Groq Whisper → OpenAI Whisper → GitHub Models Whisper

### Click-Through

By default, the overlay is click-through — your mouse passes to apps underneath. When you hover over the overlay panel, it becomes interactive (focusable). When you move away, it returns to click-through mode.

---

## Global Keyboard Shortcuts

These work from any app, even when the overlay isn't focused:

| Shortcut | Action |
|----------|--------|
| **Ctrl+Shift+S** | Take screenshot and analyze with AI |
| **Ctrl+Shift+M** | Toggle microphone on/off |

### In-Overlay Keyboard Controls

These work when the overlay panel is focused (hover over it):

| Key | Action |
|-----|--------|
| **Arrow keys** | Move panel (20px per press) |
| **Shift + Arrow keys** | Resize panel (20px per press) |
| **Enter** (in input) | Send message to AI |

Mouse drag on the header and corner resize handle also work.

---

## UI Overview

| Element | Description |
|---------|-------------|
| **Header** | Drag handle + close button (✕) |
| **Messages area** | Scrollable AI response feed with markdown rendering |
| **Chat input** | Type questions, press Enter to send |
| **Toolbar row 1** | 🎤/🎙 Mic toggle, 📸 Screenshot, ▲/▼ Expand extras |
| **Toolbar row 2** (expanded) | 🤖 Model/provider picker, ⚙️ Settings, 💧 Opacity slider, ☀️/🌙 Theme toggle |
| **Language tags** (expanded) | Click to set primary language for AI context |
| **Resize handle** | Bottom-right corner drag |

### Theme

Toggle between dark and light mode with the ☀️/🌙 button in the expanded toolbar.

### Opacity

Adjust overlay transparency (10%–100%) with the 💧 slider.

---

## AI Providers

| Provider | API Key Setting | Models |
|----------|----------------|--------|
| **GitHub Models** (recommended) | `githubModelsToken` (ghp_*) | gpt-4o, gpt-4o-mini, gpt-4.1, o4-mini, Llama, Mistral, DeepSeek, etc. |
| **Ollama** (local) | None needed | llama3.1:8b (text), llava:7b (vision) |
| **Google Gemini** | `geminiApiKey` | Gemini models |
| **Groq** | `groqApiKey` | Groq-hosted models + Whisper |
| **OpenAI** | `openaiApiKey` | gpt-4o-mini + Whisper |
| **Anthropic** | `anthropicApiKey` | claude-sonnet-4-20250514 |

Configure via the ⚙️ Settings panel in the overlay, or edit directly:

- **Windows**: `%APPDATA%/ghost-ai-overlay/config.json`
- **macOS**: `~/Library/Application Support/ghost-ai-overlay/config.json`
- **Linux**: `~/.config/ghost-ai-overlay/config.json`

---

## Project Structure

```
stealth-overlay/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts              # App entry, IPC handlers, Whisper transcription
│   │   ├── overlay-window.ts    # BrowserWindow creation (transparent, frameless)
│   │   ├── stealth.ts           # Stealth: content protection, click-through, z-order
│   │   ├── ai-engine.ts         # AI dispatch, hybrid OCR→Chat screenshot analysis
│   │   ├── ai-providers/        # Provider implementations
│   │   │   ├── types.ts         # AIProvider interface & ChatMessage type
│   │   │   ├── github.ts        # GitHub Models (gpt-4o, etc.)
│   │   │   ├── ollama.ts        # Ollama (local)
│   │   │   ├── gemini.ts        # Google Gemini
│   │   │   ├── groq.ts          # Groq
│   │   │   ├── openai.ts        # OpenAI
│   │   │   └── anthropic.ts     # Anthropic
│   │   ├── screenshot.ts        # Screen capture (hide window → capture → restore)
│   │   ├── audio-capture.ts     # Audio/transcription IPC
│   │   ├── shortcuts.ts         # Global keyboard shortcuts (Ctrl+Shift+S/M)
│   │   ├── settings.ts          # Persistent settings (electron-store)
│   │   ├── displays.ts          # Multi-monitor support
│   │   └── preload.ts           # Context bridge (renderer ↔ main)
│   └── renderer/                # Preact UI
│       ├── app.tsx              # Root component, keyboard controls, event wiring
│       ├── index.html           # HTML shell
│       ├── components/
│       │   ├── Messages.tsx     # AI message feed with markdown
│       │   ├── Settings.tsx     # Settings panel
│       │   ├── StatusBar.tsx    # Status indicators
│       │   └── ToolBar.tsx      # Action buttons, model picker, opacity
│       ├── hooks/
│       │   └── useAudio.ts      # VAD-based voice recording
│       ├── state/
│       │   └── store.ts         # Preact signals state management
│       ├── styles/
│       │   └── overlay.css      # Global styles (cursor:none, scrollbar, etc.)
│       └── utils/
│           └── markdown.ts      # Markdown → HTML parser
├── package.json
├── tsconfig.main.json
├── tsconfig.preload.json
└── esbuild.renderer.mjs         # Renderer bundler config
```

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Runtime | Electron ^28.1.0 |
| UI framework | Preact ^10.19.0 + @preact/signals ^1.2.0 |
| State management | Preact Signals |
| Bundler | esbuild ^0.19.11 (renderer), tsc (main/preload) |
| Persistence | electron-store ^8.2.0 |
| Language | TypeScript ^5.3.3 |
| Packaging | electron-builder ^24.9.0 |

