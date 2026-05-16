import { BrowserWindow, screen, app } from "electron";
import * as path from "path";

export function createOverlayWindow(): BrowserWindow {
  // Hide from macOS Dock
  if (process.platform === "darwin") {
    app.dock?.hide();
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { workArea } = primaryDisplay;
  const margin = 12;

  const win = new BrowserWindow({
    x: workArea.x + margin,
    y: workArea.y + margin,
    width: workArea.width - margin * 2,
    height: workArea.height - margin * 2,
    transparent: true,
    frame: false,
    resizable: false,
    movable: false,
    focusable: false,
    hasShadow: false,
    roundedCorners: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    // WS_EX_TOOLWINDOW — hides from Alt+Tab, task switcher, and some capture tools
    ...(process.platform === "win32" ? { type: "toolbar" as any } : {}),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Grant microphone and speech recognition permissions
  win.webContents.session.setPermissionRequestHandler((_webContents, permission, callback) => {
    const allowed = ["media", "audio-capture", "microphone"] as string[];
    callback(allowed.includes(permission));
  });

  win.webContents.session.setPermissionCheckHandler((_webContents, permission) => {
    const allowed = ["media", "audio-capture", "microphone"] as string[];
    return allowed.includes(permission);
  });

  return win;
}

