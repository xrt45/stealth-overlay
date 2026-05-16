import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("ghostAI", {
  platform: process.platform,
  version: "1.0.0",

  // Settings
  getSettings: () => ipcRenderer.invoke("settings:get-all"),
  setSetting: (key: string, value: any) => ipcRenderer.invoke("settings:set", key, value),

  // AI
  askAI: (prompt: string) => ipcRenderer.invoke("ai:ask", prompt),
  analyzeImage: (imageBase64: string) => ipcRenderer.invoke("ai:vision", imageBase64),
  checkProviders: () => ipcRenderer.invoke("ai:check-providers"),

  // Screenshot
  takeScreenshot: () => ipcRenderer.invoke("action:screenshot"),

  // Audio
  sendTranscription: (text: string, source: string) =>
    ipcRenderer.invoke("audio:transcription", text, source),
  getAudioSources: () => ipcRenderer.invoke("audio:get-sources"),
  transcribeAudio: (base64: string) => ipcRenderer.invoke("audio:transcribe", base64),

  // Window control
  setFocusable: (focusable: boolean) => ipcRenderer.invoke("window:set-focusable", focusable),
  closeSettings: () => ipcRenderer.invoke("window:close-settings"),
  quit: () => ipcRenderer.invoke("app:quit"),

  // Events from main process
  on: (channel: string, callback: (...args: any[]) => void) => {
    const handler = (_event: any, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});


