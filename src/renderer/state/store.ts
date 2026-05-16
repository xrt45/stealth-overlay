import { signal, computed } from "@preact/signals";
export interface Message {
  id: string;
  source: "voice" | "screenshot" | "manual";
  input: string;
  answer: string;
  provider: string;
  timestamp: number;
  streaming: boolean;
}
export const messages = signal<Message[]>([]);
export const overlayOpacity = signal(45);
export const isPrivate = signal(true);
export const showSettings = signal(false);
export const isListeningVoice = signal(false);
export const activeProvider = signal("none");
export const primaryLanguage = signal("JavaScript");
export const languages = signal<string[]>(["Java", "JavaScript", "TypeScript", "Angular", "React", "HTML", "CSS", "Node.js", "Python", "AWS", "Docker", "SQL", "Spring Boot", "REST API", "Git"]);
export const streamingMessageId = signal<string | null>(null);
export const panelX = signal(typeof window !== "undefined" ? window.innerWidth - 400 : 100);
export const panelY = signal(20);
export const panelW = signal(380);
export const panelH = signal(520);
export const chatInputText = signal("");
export const pendingVoiceSubmit = signal(0);
export const themeMode = signal<"dark" | "light">("dark");
export const lastMessages = computed(() => messages.value.slice(-30));
export function addMessage(source: Message["source"], input: string): string {
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  messages.value = [
    ...messages.value,
    { id, source, input, answer: "", provider: "...", timestamp: Date.now(), streaming: true },
  ];
  streamingMessageId.value = id;
  return id;
}
export function appendToMessage(id: string, chunk: string): void {
  messages.value = messages.value.map(m =>
    m.id === id ? { ...m, answer: m.answer + chunk } : m,
  );
}
export function finishMessage(id: string, provider: string): void {
  messages.value = messages.value.map(m =>
    m.id === id ? { ...m, streaming: false, provider } : m,
  );
  streamingMessageId.value = null;
  activeProvider.value = provider;
}
export function addLanguage(lang: string): void {
  if (lang && !languages.value.includes(lang)) {
    languages.value = [...languages.value, lang];
  }
}
export function removeLanguage(lang: string): void {
  languages.value = languages.value.filter(l => l !== lang);
  if (primaryLanguage.value === lang && languages.value.length > 0) {
    primaryLanguage.value = languages.value[0];
  }
}
export function setActiveLanguage(lang: string): void {
  primaryLanguage.value = lang;
  (window as any).ghostAI?.setSetting("primaryLanguage", lang);
}
