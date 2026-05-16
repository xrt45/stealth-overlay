import { BrowserWindow, globalShortcut } from "electron";

export function registerShortcuts(
  _win: BrowserWindow,
  sendToRenderer: (channel: string, ...args: any[]) => void,
): void {
  // Ctrl+Shift+M — Toggle microphone on/off
  globalShortcut.register("CommandOrControl+Shift+M", () => {
    sendToRenderer("action:toggle-mic");
  });

  // Ctrl+Shift+S — Take screenshot & analyze
  globalShortcut.register("CommandOrControl+Shift+S", () => {
    sendToRenderer("action:screenshot");
  });
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
}

