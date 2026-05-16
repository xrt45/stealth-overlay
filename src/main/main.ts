import { app, ipcMain } from "electron";
import { net } from "electron";
import * as https from "https";
import { createOverlayWindow } from "./overlay-window";
import { applyStealth, setClickThrough } from "./stealth";
import { registerShortcuts, unregisterShortcuts } from "./shortcuts";
import { getAllSettings, setSetting, getSetting } from "./settings";
import { applyWindowToDisplay } from "./displays";
import { askAI, analyzeScreenshot, checkAllProviders } from "./ai-engine";
import { manualScreenshot, startAutoScreenshot, stopAutoScreenshot } from "./screenshot";
import { setupAudioIPC } from "./audio-capture";
import * as path from "path";

// Disguise process name in Task Manager
app.setName("System Runtime");

let mainWindow: Electron.BrowserWindow | null = null;

// Strip non-ASCII and whitespace from API keys
function sanitizeKey(key: string | undefined | null): string {
  if (!key) return "";
  // Keep only printable ASCII (32-126), then trim
  return key.replace(/[^\x20-\x7E]/g, "").trim();
}

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
    // Trim API key values to avoid invalid header chars
    const trimmedValue = typeof value === "string" && key.toLowerCase().includes("key") || key.toLowerCase().includes("token")
      ? value.trim() : value;
    setSetting(key as any, trimmedValue);
    sendToRenderer("settings:changed", getAllSettings());
  });

  // ─── Window IPC ───
  ipcMain.handle("window:set-focusable", (_e, focusable: boolean) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      setClickThrough(mainWindow, !focusable);
    }
  });
  ipcMain.handle("window:close-settings", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      setClickThrough(mainWindow, true);
    }
  });

  ipcMain.handle("app:quit", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.destroy();
    }
    app.quit();
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

  // ─── Audio Transcription (Groq Whisper / OpenAI Whisper) ───
  // Whisper hallucinations to reject (common on short/silent audio)
  const HALLUCINATIONS = new Set([
    "thank you", "thank you.", "thanks.", "thanks",
    "hello", "hello.", "hi.", "hi", "hey.", "hey",
    "yeah.", "yeah", "yes.", "yes", "no.", "no",
    "bye.", "bye", "goodbye.", "goodbye",
    "you", "you.", "the end.", "the end",
    "okay.", "okay", "ok.", "ok",
    "hmm.", "hmm", "um.", "um", "uh.", "uh",
    "oh.", "oh", "ah.", "ah", "so.", "so",
    "right.", "right", "sure.", "sure",
    "please subscribe.", "like and subscribe.",
    "see you next time.", "see you.",
    "i'm sorry.", "sorry.", "excuse me.",
    "subtitles by the amara.org community",
    "music", "[music]", "(music)",
  ]);

  ipcMain.handle("audio:transcribe", async (_e, base64Audio: string) => {
    const groqKey = sanitizeKey(getSetting("groqApiKey"));
    const openaiKey = sanitizeKey(getSetting("openaiApiKey"));
    const ghToken = sanitizeKey(getSetting("githubModelsToken"));

    let text = "";
    try {
      if (groqKey) {
        text = await transcribeWithGroq(base64Audio, groqKey);
      } else if (openaiKey && openaiKey.startsWith("sk-")) {
        text = await transcribeWithOpenAI(base64Audio, openaiKey);
      } else if (ghToken) {
        text = await transcribeWithGitHub(base64Audio, ghToken);
      }
    } catch (err: any) {
      console.error("[Ghost AI] Transcription error:", err.message);
      return "";
    }

    // Filter Whisper hallucinations
    const cleaned = text.trim();
    if (!cleaned || cleaned.length < 3 || HALLUCINATIONS.has(cleaned.toLowerCase())) {
      console.log(`[Ghost AI] Filtered hallucination: "${cleaned}"`);
      return "";
    }
    return cleaned;
  });
}

async function transcribeWithGroq(base64Audio: string, apiKey: string): Promise<string> {
  return transcribeWithWhisperAPI(
    "api.groq.com",
    "/openai/v1/audio/transcriptions",
    apiKey,
    "whisper-large-v3-turbo",
    base64Audio
  );
}

async function transcribeWithOpenAI(base64Audio: string, apiKey: string): Promise<string> {
  return transcribeWithWhisperAPI(
    "api.openai.com",
    "/v1/audio/transcriptions",
    apiKey,
    "whisper-1",
    base64Audio
  );
}

async function transcribeWithGitHub(base64Audio: string, token: string): Promise<string> {
  return transcribeWithWhisperAPI(
    "models.github.ai",
    "/inference/audio/transcriptions",
    token,
    "openai/whisper-large-v3-turbo",
    base64Audio
  );
}

function transcribeWithWhisperAPI(
  host: string, apiPath: string, apiKey: string, model: string, base64Audio: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const boundary = "----FormBoundary" + Math.random().toString(36).slice(2);
    const audioBuffer = Buffer.from(base64Audio, "base64");

    const formParts: Buffer[] = [];
    formParts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="audio.webm"\r\nContent-Type: audio/webm\r\n\r\n`
    ));
    formParts.push(audioBuffer);
    formParts.push(Buffer.from("\r\n"));
    formParts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}\r\n`
    ));
    formParts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\njson\r\n`
    ));
    formParts.push(Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="language"\r\n\r\nen\r\n`
    ));
    formParts.push(Buffer.from(`--${boundary}--\r\n`));

    const body = Buffer.concat(formParts);

    const options = {
      hostname: host,
      port: 443,
      path: apiPath,
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
        "Content-Length": body.length,
      },
    };

    const req = https.request(options, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => {
        const raw = Buffer.concat(chunks).toString();
        console.log(`[Ghost AI] Whisper response (${res.statusCode}):`, raw.substring(0, 300));
        try {
          const data = JSON.parse(raw);
          if (data.error) reject(new Error(data.error.message || JSON.stringify(data.error)));
          else resolve(data.text || "");
        } catch {
          // Some APIs return plain text
          if (res.statusCode === 200 && raw.trim()) resolve(raw.trim());
          else reject(new Error(`Whisper API returned status ${res.statusCode}: ${raw.substring(0, 200)}`));
        }
      });
    });

    req.on("error", (e) => reject(e));
    req.write(body);
    req.end();
  });
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
app.on("will-quit", () => {
  unregisterShortcuts();
  stopAutoScreenshot();
});




