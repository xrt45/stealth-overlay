import Store from "electron-store";
import { app } from "electron";
import * as path from "path";

export interface AppSettings {
  isPrivate: boolean;
  overlayOpacity: number;
  overlayPosition: string;
  currentScreenIndex: number;
  voiceEnabled: boolean;
  voiceSource: string;
  transcriptionEngine: string;
  screenshotEnabled: boolean;
  screenshotInterval: number;
  primaryLanguage: string;
  languages: string[];
  providerPriority: string[];
  ollamaBaseUrl: string;
  ollamaTextModel: string;
  ollamaVisionModel: string;
  geminiApiKey: string;
  groqApiKey: string;
  openaiApiKey: string;
  openaiModel: string;
  anthropicApiKey: string;
  anthropicModel: string;
  githubModelsToken: string;
  githubModelsModel: string;
  startAtLogin: boolean;
}

const defaults: AppSettings = {
  isPrivate: true,
  overlayOpacity: 45,
  overlayPosition: "top-right",
  currentScreenIndex: 0,
  voiceEnabled: true,
  voiceSource: "mic",
  transcriptionEngine: "webspeech",
  screenshotEnabled: true,
  screenshotInterval: 10,
  primaryLanguage: "JavaScript",
  languages: ["Java", "JavaScript", "TypeScript", "Angular", "React", "HTML", "CSS", "Node.js", "Python", "AWS", "Docker", "SQL", "Spring Boot", "REST API", "Git"],
  providerPriority: ["github", "gemini", "groq", "ollama", "openai", "anthropic"],
  ollamaBaseUrl: "http://localhost:11434",
  ollamaTextModel: "llama3.1:8b",
  ollamaVisionModel: "llava:7b",
  geminiApiKey: "",
  groqApiKey: "",
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  anthropicApiKey: "",
  anthropicModel: "claude-sonnet-4-20250514",
  githubModelsToken: "",
  githubModelsModel: "openai/gpt-4o",
  startAtLogin: false,
};

const store = new Store<AppSettings>({
  defaults,
  cwd: path.join(process.env.APPDATA || app.getPath("userData"), "ghost-ai-overlay"),
});

// Migrate old "English" primaryLanguage to tech-focused default
if (store.get("primaryLanguage") === "English") {
  store.set("primaryLanguage", defaults.primaryLanguage);
  store.set("languages", defaults.languages);
}

export function getSetting<K extends keyof AppSettings>(key: K): AppSettings[K] {
  return store.get(key);
}

export function setSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  store.set(key, value);
}

export function getAllSettings(): AppSettings {
  return store.store;
}

