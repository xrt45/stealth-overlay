import { BrowserWindow } from "electron";

export function applyStealth(win: BrowserWindow): void {
  // 1. Content protection — invisible in screen share/screenshots
  win.setContentProtection(true);

  // 2. Click-through — mouse passes to apps below, forward hover events
  win.setIgnoreMouseEvents(true, { forward: true });

  // 3. Highest always-on-top level
  if (process.platform === "win32") {
    win.setAlwaysOnTop(true, "screen-saver", 1);
    // Re-assert every second (Windows apps can steal z-order)
    const interval = setInterval(() => {
      if (win.isDestroyed()) {
        clearInterval(interval);
        return;
      }
      win.setAlwaysOnTop(true, "screen-saver", 1);
    }, 1000);
  } else {
    win.setAlwaysOnTop(true, "floating", 1);
  }

  // 4. Visible on all virtual desktops + fullscreen apps
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // 5. Don't throttle when in background
  win.webContents.setBackgroundThrottling(false);

  // 6. Skip taskbar (extra safety)
  win.setSkipTaskbar(true);

  // 7. Not focusable
  win.setFocusable(false);
}

export function setPrivateMode(win: BrowserWindow, enabled: boolean): void {
  if (!win.isDestroyed()) {
    win.setContentProtection(enabled);
  }
}

export function setClickThrough(win: BrowserWindow, enabled: boolean): void {
  if (!win.isDestroyed()) {
    win.setIgnoreMouseEvents(enabled, { forward: true });
    win.setFocusable(!enabled);
  }
}

