import { globalShortcut, BrowserWindow } from "electron";
import { setClickThrough, setPrivateMode } from "./stealth";
import { getSetting, setSetting } from "./settings";
import { moveToNextScreen } from "./displays";

const OPACITY_STEP = 10;
const MIN_OPACITY = 15;
const MAX_OPACITY = 95;

export function registerShortcuts(
  win: BrowserWindow,
  sendToRenderer: (channel: string, ...args: any[]) => void,
): void {
  // Toggle overlay visibility
  globalShortcut.register("CommandOrControl+Shift+H", () => {
    if (win.isDestroyed()) return;
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
    }
  });

  // Take screenshot now
  globalShortcut.register("CommandOrControl+Shift+S", () => {
    sendToRenderer("action:screenshot");
  });

  // Toggle voice capture
  globalShortcut.register("CommandOrControl+Shift+V", () => {
    const enabled = !getSetting("voiceEnabled");
    setSetting("voiceEnabled", enabled);
    sendToRenderer("settings:changed", { voiceEnabled: enabled });
  });

  // Increase opacity
  globalShortcut.register("CommandOrControl+Shift+Up", () => {
    const current = getSetting("overlayOpacity");
    const next = Math.min(MAX_OPACITY, current + OPACITY_STEP);
    setSetting("overlayOpacity", next);
    sendToRenderer("overlay:opacity", next);
  });

  // Decrease opacity
  globalShortcut.register("CommandOrControl+Shift+Down", () => {
    const current = getSetting("overlayOpacity");
    const next = Math.max(MIN_OPACITY, current - OPACITY_STEP);
    setSetting("overlayOpacity", next);
    sendToRenderer("overlay:opacity", next);
  });

  // Toggle private mode (content protection)
  globalShortcut.register("CommandOrControl+Shift+P", () => {
    const isPrivate = !getSetting("isPrivate");
    setSetting("isPrivate", isPrivate);
    setPrivateMode(win, isPrivate);
    sendToRenderer("overlay:private-mode", isPrivate);
  });

  // Move to next monitor
  globalShortcut.register("CommandOrControl+Shift+M", () => {
    moveToNextScreen(win);
  });

  // Toggle settings panel (enable interaction)
  globalShortcut.register("CommandOrControl+K", () => {
    setClickThrough(win, false);
    sendToRenderer("action:toggle-settings");
  });

  // Quick hide
  globalShortcut.register("Escape", () => {
    if (win.isDestroyed()) return;
    // If settings is open, close settings and re-enable click-through
    setClickThrough(win, true);
    sendToRenderer("action:close-settings");
  });

  // Quit
  globalShortcut.register("CommandOrControl+Shift+Q", () => {
    win.destroy();
  });
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
}

