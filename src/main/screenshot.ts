import { desktopCapturer, screen } from "electron";
import { getSetting } from "./settings";
import { analyzeScreenshot } from "./ai-engine";

export async function captureScreen(): Promise<string> {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.size;

  const sources = await desktopCapturer.getSources({
    types: ["screen"],
    thumbnailSize: { width: Math.min(width, 1280), height: Math.min(height, 720) },
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

