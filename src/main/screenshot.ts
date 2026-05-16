import { desktopCapturer, screen, BrowserWindow } from "electron";
import { getSetting } from "./settings";
import { analyzeScreenshot } from "./ai-engine";

export async function captureScreen(): Promise<string> {
  // Hide overlay windows instead of disabling content protection
  // Content protection must NEVER be turned off — it keeps us invisible in screen share
  const wins = BrowserWindow.getAllWindows();
  const visibleWins = wins.filter(w => !w.isDestroyed() && w.isVisible());
  visibleWins.forEach(w => { try { w.hide(); } catch { /* ignore */ } });

  // Small delay to ensure windows are fully hidden before capture
  await new Promise(resolve => setTimeout(resolve, 100));

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;

  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: Math.min(width, 1280), height: Math.min(height, 720) },
  });

  // Restore overlay windows
  visibleWins.forEach(w => {
    if (!w.isDestroyed()) {
      try {
        w.showInactive();
        w.setContentProtection(true); // Re-assert protection after show
      } catch { /* ignore */ }
    }
  });

  if (sources.length === 0) throw new Error("No screen source found");

  const image = sources[0].thumbnail;
  const jpegBuffer = image.toJPEG(70);
  return jpegBuffer.toString("base64");
}

let screenshotInterval: ReturnType<typeof setInterval> | null = null;

export function startAutoScreenshot(
  onAnalysis: (result: { answer: string; provider: string }) => void,
  onChunk: (chunk: string) => void,
): void {
  stopAutoScreenshot();
  const intervalSec = getSetting("screenshotInterval");
  if (intervalSec <= 0) return;

  screenshotInterval = setInterval(async () => {
    if (!getSetting("screenshotEnabled")) return;
    try {
      const imageBase64 = await captureScreen();
      const result = await analyzeScreenshot(imageBase64, onChunk);
      onAnalysis(result);
    } catch (err: any) {
      console.error("Screenshot analysis error:", err.message);
    }
  }, intervalSec * 1000);
}

export function stopAutoScreenshot(): void {
  if (screenshotInterval) {
    clearInterval(screenshotInterval);
    screenshotInterval = null;
  }
}

export async function manualScreenshot(
  onChunk: (chunk: string) => void,
): Promise<{ answer: string; provider: string }> {
  const imageBase64 = await captureScreen();
  return analyzeScreenshot(imageBase64, onChunk);
}

