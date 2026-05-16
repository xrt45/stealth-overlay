import { app, ipcMain } from "electron";
import { createOverlayWindow } from "./overlay-window";
import { applyStealth, setClickThrough } from "./stealth";
import { registerShortcuts, unregisterShortcuts } from "./shortcuts";
import { getAllSettings, setSetting } from "./settings";
import { applyWindowToDisplay } from "./displays";
import { askAI, analyzeScreenshot, checkAllProviders } from "./ai-engine";
import { manualScreenshot, startAutoScreenshot, stopAutoScreenshot } from "./screenshot";
import { setupAudioIPC } from "./audio-capture";
import * as path from "path";

let mainWindow: Electron.BrowserWindow | null = null;

function sendToRenderer(channel: string, ...args: any[]): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

function createWindow(): void {
  mainWindow = createOverlayWindow();
  applyStealth(mainWindow);
  applyWindowToDisplay(mainWindow);

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));

  mainWindow.on("closed", () => {
    mainWindow = null;
    unregisterShortcuts();
    stopAutoScreenshot();
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });

  // Register global shortcuts
  registerShortcuts(mainWindow, sendToRenderer);

  // Setup audio IPC
  setupAudioIPC(sendToRenderer);

  // ─── Settings IPC ───
  ipcMain.handle("settings:get-all", () => getAllSettings());
  ipcMain.handle("settings:set", (_e, key: string, value: any) => {
    setSetting(key as any, value);
    sendToRenderer("settings:changed", getAllSettings());
  });

  // ─── Window IPC ───
  ipcMain.handle("window:set-focusable", (_e, focusable: boolean) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      setClickThrough(mainWindow, !focusable);
      if (focusable) mainWindow.focus();
    }
  });
  ipcMain.handle("window:close-settings", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      setClickThrough(mainWindow, true);
    }
  });

  // ─── AI IPC ───
  ipcMain.handle("ai:ask", async (_e, prompt: string) => {
    const result = await askAI(prompt, (chunk) => {
      sendToRenderer("ai:stream", chunk);
    });
    return result;
  });

  ipcMain.handle("ai:vision", async (_e, imageBase64: string) => {
    const result = await analyzeScreenshot(imageBase64, (chunk) => {
      sendToRenderer("ai:stream", chunk);
    });
    return result;
  });

  ipcMain.handle("ai:check-providers", async () => {
    return await checkAllProviders();
  });

  // ─── Screenshot IPC ───
  ipcMain.handle("action:screenshot", async () => {
    sendToRenderer("ai:stream-start", "screenshot");
    const result = await manualScreenshot((chunk) => {
      sendToRenderer("ai:stream", chunk);
    });
    sendToRenderer("ai:stream-end", result);
    return result;
  });
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
app.on("will-quit", () => {
  unregisterShortcuts();
  stopAutoScreenshot();
});




