import { screen, BrowserWindow } from "electron";
import { getSetting, setSetting } from "./settings";

const MARGIN = 12;

export function applyWindowToDisplay(win: BrowserWindow): void {
  const displays = screen.getAllDisplays();
  const index = Math.min(getSetting("currentScreenIndex"), displays.length - 1);
  const { workArea } = displays[index];

  win.setBounds({
    x: workArea.x + MARGIN,
    y: workArea.y + MARGIN,
    width: workArea.width - MARGIN * 2,
    height: workArea.height - MARGIN * 2,
  });
}

export function moveToNextScreen(win: BrowserWindow): void {
  const displays = screen.getAllDisplays();
  if (displays.length <= 1) return;
  const current = getSetting("currentScreenIndex");
  const next = (current + 1) % displays.length;
  setSetting("currentScreenIndex", next);
  applyWindowToDisplay(win);
}

