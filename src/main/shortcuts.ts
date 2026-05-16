import { BrowserWindow } from "electron";

export function registerShortcuts(
  _win: BrowserWindow,
  _sendToRenderer: (channel: string, ...args: any[]) => void,
): void {
  // No global shortcuts — all actions are handled via UI buttons
}

export function unregisterShortcuts(): void {
  // Nothing to unregister
}

