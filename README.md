# 👻 Ghost AI — Stealth Overlay Assistant

An invisible, always-on-top AI assistant overlay built with Electron + Preact. Designed to be **undetectable** in screen recordings, screen shares, and screenshots while providing real-time AI assistance.

---

## 📋 Requirements

### System
- **Node.js** ≥ 18
- **npm** ≥ 9
- **OS**: Windows, macOS, or Linux

### AI Providers (at least one required)
| Provider | Requirement | Models |
|----------|-------------|--------|
| **Ollama** (local) | Running instance at `localhost:11434` | `llama3.1:8b` (text), `llava:7b` (vision) |
| **Google Gemini** | API key | Gemini models |
| **Groq** | API key | Groq-hosted models |
| **OpenAI** | API key | `gpt-4o-mini` (default) |
| **Anthropic** | API key | `claude-sonnet-4-20250514` (default) |

### Dependencies
- `electron` ^28.1.0
- `electron-store` ^8.2.0 (persistent settings)
- `preact` ^10.19.0 + `@preact/signals` ^1.2.0 (UI)
- `esbuild` ^0.19.11 (renderer bundling)
- `typescript` ^5.3.3

---

## ✅ What Was Achieved

### 🔒 Stealth System
- **Content protection** — overlay is invisible in screen shares, recordings, and screenshots (`setContentProtection`)
- **Click-through** — mouse events pass through to apps underneath; hover events are forwarded
- **Always-on-top** — uses `screen-saver` level on Windows (re-asserted every 1s to prevent z-order theft), `floating` level on macOS/Linux
- **Taskbar/Dock hidden** — skips taskbar; hides from macOS Dock
- **All workspaces** — visible on all virtual desktops and over fullscreen apps
- **Not focusable** by default — won't steal focus from the active app
- **No background throttling** — stays responsive when not focused

### 🤖 Multi-Provider AI Engine
- **5 AI providers** supported: Ollama (local), Gemini, Groq, OpenAI, Anthropic
- **Priority-based fallback** — configurable provider priority; automatically falls back to the next available provider
- **Streaming responses** — real-time token-by-token streaming to the overlay UI
- **Provider health check** — `checkAllProviders()` tests availability of all configured providers
- **Unified interface** — all providers implement a common `AIProvider` interface (`chat`, `chatStream`, `vision`)

### 📸 Screenshot Analysis
- **Manual screenshots** — capture the screen on-demand via shortcut (`Ctrl+Shift+S`)
- **Auto-screenshot** — configurable interval (default 10s) for continuous screen monitoring
- **AI vision analysis** — captured screenshots are sent to a vision-capable AI provider for:
  - Code error detection and fix suggestions
  - Question answering from visible text
  - Error message explanation
  - Document/text summarization
- **Optimized capture** — screenshots are JPEG-compressed (quality 70) and capped at 1280×720

### 🎤 Audio Capture & Transcription
- **Microphone input** — captures voice via the browser's Web Speech API
- **System audio sources** — lists available screen/window audio sources via `desktopCapturer`
- **Transcription-to-AI pipeline** — transcribed text is automatically sent to the AI engine for processing

### ⌨️ Global Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+H` | Toggle overlay visibility (show/hide) |
| `Ctrl+Shift+S` | Take screenshot and analyze |
| `Ctrl+Shift+V` | Toggle voice capture on/off |
| `Ctrl+Shift+Up` | Increase overlay opacity |
| `Ctrl+Shift+Down` | Decrease overlay opacity |
| `Ctrl+Shift+P` | Toggle private mode (content protection) |
| `Ctrl+Shift+M` | Move overlay to next monitor |
| `Ctrl+K` | Open settings panel |
| `Escape` | Close settings / re-enable click-through |
| `Ctrl+Shift+Q` | Quit the application |

### 🖥️ Overlay UI (Preact + Signals)
- **Draggable panel** — click-and-drag header to reposition
- **Resizable panel** — corner handle for resizing (280–800px wide, 300px–screen height)
- **Glassmorphism design** — semi-transparent background with backdrop blur
- **Adjustable opacity** — 15%–95% via keyboard shortcuts
- **Message feed** — displays AI responses with markdown rendering
- **Settings panel** — in-overlay configuration for all providers, languages, and preferences
- **Status bar** — shows current state (provider, voice, private mode)
- **Toolbar** — quick-access buttons for common actions

### ⚙️ Persistent Settings
- **electron-store** for JSON-based persistent configuration
- Configurable: opacity, position, monitor, voice, screenshot interval, language, provider priority, API keys, models, start-at-login

### 🖥️ Multi-Monitor Support
- Detects all connected displays
- Cycle overlay between monitors with `Ctrl+Shift+M`
- Remembers last-used screen index

### 🌐 Multi-Language Support
- Configurable primary language for AI responses
- Language list stored in settings

---

## 🚀 Getting Started

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Build and start
npm start

# Package for distribution
npm run dist          # current platform
npm run dist:win      # Windows
npm run dist:mac      # macOS
npm run dist:linux    # Linux
```

---

## 📁 Project Structure

```
stealth-overlay/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts              # App entry, IPC handlers
│   │   ├── overlay-window.ts    # BrowserWindow creation
│   │   ├── stealth.ts           # Stealth mode (content protection, click-through, z-order)
│   │   ├── ai-engine.ts         # AI provider orchestration & fallback
│   │   ├── ai-providers/        # Individual provider implementations
│   │   │   ├── types.ts         # AIProvider interface & ChatMessage type
│   │   │   ├── ollama.ts        # Ollama (local)
│   │   │   ├── gemini.ts        # Google Gemini
│   │   │   ├── groq.ts          # Groq
│   │   │   ├── openai.ts        # OpenAI
│   │   │   └── anthropic.ts     # Anthropic
│   │   ├── screenshot.ts        # Screen capture & auto-screenshot
│   │   ├── audio-capture.ts     # Audio/transcription IPC
│   │   ├── shortcuts.ts         # Global keyboard shortcuts
│   │   ├── settings.ts          # Persistent settings (electron-store)
│   │   ├── displays.ts          # Multi-monitor management
│   │   └── preload.ts           # Context bridge (renderer ↔ main)
│   └── renderer/                # Preact UI
│       ├── app.tsx              # Root component, event wiring
│       ├── index.html           # HTML shell
│       ├── components/
│       │   ├── Messages.tsx     # AI message feed
│       │   ├── Settings.tsx     # Settings panel
│       │   ├── StatusBar.tsx    # Status indicators
│       │   └── ToolBar.tsx      # Action buttons
│       ├── hooks/
│       │   └── useAudio.ts      # Web Speech API hook
│       ├── state/
│       │   └── store.ts         # Preact signals state
│       ├── styles/
│       │   └── overlay.css      # Overlay styles
│       └── utils/
│           └── markdown.ts      # Markdown → HTML renderer
├── package.json
├── tsconfig.main.json
├── tsconfig.preload.json
└── esbuild.renderer.mjs         # Renderer build config
```

---

## 🔑 Configuration

Open settings with `Ctrl+K` inside the overlay, or edit the config file directly:

- **Windows**: `%APPDATA%/ghost-ai-overlay/config.json`
- **macOS**: `~/Library/Application Support/ghost-ai-overlay/config.json`
- **Linux**: `~/.config/ghost-ai-overlay/config.json`

### Default Settings
| Setting | Default |
|---------|---------|
| Private mode | `true` |
| Overlay opacity | `45%` |
| Voice enabled | `true` |
| Voice source | `mic` |
| Screenshot enabled | `true` |
| Screenshot interval | `10s` |
| Language | `English` |
| Provider priority | Ollama → Gemini → Groq → OpenAI → Anthropic |

