import { signal } from "@preact/signals";
import { chatInputText, pendingVoiceSubmit } from "../state/store";

export const isListening = signal(false);
export const lastTranscription = signal("");

const gai = (window as any).ghostAI;

// ── VAD Configuration (event-driven, adapts to speaker pace) ──
const SILENCE_DURATION_MS = 1500;  // 1.5s silence to stop recording
const MIN_SPEECH_MS = 500;         // minimum speech duration to transcribe
const SPEECH_THRESHOLD = 0.008;    // RMS threshold for speech detection
const MAX_RECORD_MS = 60000;       // safety cap: 60s max per utterance

// ── State ──
let micStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let gainNode: GainNode | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let vadInterval: any = null;

let isSpeaking = false;
let silenceStart = 0;
let speechStart = 0;
let maxRecordTimer: any = null;
let logCounter = 0;

// ── Transcription ──
async function sendForTranscription(): Promise<void> {
  const duration = Date.now() - speechStart;
  console.error(`[Ghost AI] Recording stopped, duration: ${duration}ms, chunks: ${audioChunks.length}`);

  if (audioChunks.length === 0 || duration < MIN_SPEECH_MS) {
    console.error("[Ghost AI] Skipped: too short or no data");
    audioChunks = [];
    return;
  }

  const blob = new Blob(audioChunks, { type: "audio/webm" });
  audioChunks = [];
  console.error(`[Ghost AI] Audio blob: ${blob.size} bytes, ${duration}ms`);

  const reader = new FileReader();
  reader.onloadend = async () => {
    const base64 = (reader.result as string).split(",")[1];
    if (!base64) return;
    console.error(`[Ghost AI] Sending ${base64.length} chars for transcription`);
    try {
      const text = await gai?.transcribeAudio(base64);
      console.error(`[Ghost AI] Transcription: "${text}"`);
      if (text && text.trim()) {
        chatInputText.value = text.trim();
        lastTranscription.value = text.trim();
        pendingVoiceSubmit.value++;
      }
    } catch (e: any) {
      console.error("[Ghost AI] Transcription error:", e?.message || e);
    }
  };
  reader.readAsDataURL(blob);
}

// ── Recording control (event-driven by VAD) ──
function beginRecording(): void {
  if (!micStream || !micStream.active) {
    console.error("[Ghost AI] Cannot record: mic stream inactive");
    return;
  }
  audioChunks = [];
  speechStart = Date.now();
  mediaRecorder = new MediaRecorder(micStream, { mimeType: "audio/webm" });
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };
  mediaRecorder.onstop = () => sendForTranscription();
  mediaRecorder.start(250);
  console.error("[Ghost AI] 🔴 Speech detected → recording started");

  // Safety cap
  maxRecordTimer = setTimeout(() => {
    if (isSpeaking) {
      console.error("[Ghost AI] Max recording duration reached, stopping");
      endRecording();
    }
  }, MAX_RECORD_MS);
}

function endRecording(): void {
  if (maxRecordTimer) { clearTimeout(maxRecordTimer); maxRecordTimer = null; }
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
  mediaRecorder = null;
  isSpeaking = false;
  silenceStart = 0;
}

// ── VAD via AnalyserNode with forced audio graph processing ──
function computeRMS(): number {
  if (!analyserNode) return 0;
  const data = new Float32Array(analyserNode.fftSize);
  analyserNode.getFloatTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
  return Math.sqrt(sum / data.length);
}

function startVAD(): void {
  vadInterval = setInterval(() => {
    if (!isListening.value) return;

    const rms = computeRMS();
    const now = Date.now();

    // Log every ~1s
    logCounter++;
    if (logCounter % 20 === 0) {
      console.error(`[Ghost AI] RMS: ${rms.toFixed(4)}, speaking: ${isSpeaking}`);
    }

    if (rms > SPEECH_THRESHOLD) {
      // ── Speech detected ──
      silenceStart = 0;
      if (!isSpeaking) {
        isSpeaking = true;
        beginRecording();
      }
    } else {
      // ── Silence ──
      if (isSpeaking) {
        if (silenceStart === 0) silenceStart = now;
        if (now - silenceStart >= SILENCE_DURATION_MS) {
          console.error("[Ghost AI] ⏹ Silence detected → stopping recording");
          endRecording();
        }
      }
    }
  }, 50);
}

// ── Public API ──
export async function startListening(): Promise<void> {
  console.error("[Ghost AI] startListening() — VAD mode");
  try {
    micStream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
    });
    const tracks = micStream.getAudioTracks();
    console.error(`[Ghost AI] Mic granted: ${tracks.map(t => `${t.label} (enabled=${t.enabled}, muted=${t.muted})`).join(", ")}`);
  } catch (e: any) {
    console.error("[Ghost AI] Mic DENIED:", e?.message || e);
    isListening.value = false;
    return;
  }

  // Create AudioContext + AnalyserNode for VAD
  // Key: connect source → analyser → gain(0) → destination
  // This forces Chromium to process the audio graph even in unfocused windows
  audioContext = new AudioContext();
  if (audioContext.state === "suspended") {
    await audioContext.resume();
    console.error("[Ghost AI] AudioContext resumed from suspended");
  }

  const source = audioContext.createMediaStreamSource(micStream);
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 2048;

  // Silent gain node → forces audio graph to process
  gainNode = audioContext.createGain();
  gainNode.gain.value = 0;

  source.connect(analyserNode);
  analyserNode.connect(gainNode);
  gainNode.connect(audioContext.destination);

  console.error(`[Ghost AI] Audio graph: source → analyser → gain(0) → destination, sampleRate=${audioContext.sampleRate}`);

  isListening.value = true;
  isSpeaking = false;
  silenceStart = 0;
  logCounter = 0;
  console.error(`[Ghost AI] VAD active — threshold: ${SPEECH_THRESHOLD}, silence: ${SILENCE_DURATION_MS}ms`);

  startVAD();
}

export function stopListening(): void {
  console.error("[Ghost AI] stopListening()");
  isListening.value = false;

  if (isSpeaking) endRecording();

  if (vadInterval) { clearInterval(vadInterval); vadInterval = null; }
  if (gainNode) { gainNode.disconnect(); gainNode = null; }
  if (analyserNode) { analyserNode.disconnect(); analyserNode = null; }
  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
  }
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
}

export function toggleListening(): void {
  console.error(`[Ghost AI] toggleListening(), isListening=${isListening.value}`);
  if (isListening.value) {
    stopListening();
  } else {
    startListening();
  }
}

