import { ipcMain, desktopCapturer } from "electron";

export function setupAudioIPC(
  sendToRenderer: (channel: string, ...args: any[]) => void,
): void {
  // Renderer sends transcribed text here for AI processing
  ipcMain.handle("audio:transcription", async (_e, text: string, source: string) => {
    sendToRenderer("audio:new-transcription", { text, source });
    return true;
  });

  // Renderer requests system audio sources for desktopCapturer
  ipcMain.handle("audio:get-sources", async () => {
    try {
      const sources = await desktopCapturer.getSources({ types: ["screen", "window"] });
      return sources.map(s => ({ id: s.id, name: s.name }));
    } catch {
      return [];
    }
  });
}

