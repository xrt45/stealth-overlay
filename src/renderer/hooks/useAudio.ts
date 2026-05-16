import { signal } from "@preact/signals";
import { chatInputText, pendingVoiceSubmit } from "../state/store";

export const isListening = signal(false);
export const lastTranscription = signal("");

const gai = (window as any).ghostAI;

// VAD configuration
const SILENCE_THRESHOLD = 0.015; // RMS energy below this = silence
const SILENCE_DURATION_MS = 2000; // 2s of silence to stop
const MIN_SPEECH_MS = 500; // minimum speech duration to transcribe

let micStream: MediaStream | null = null;
let audioContext: AudioContext | null = null;
let analyserNode: AnalyserNode | null = null;
let mediaRecorder: MediaRecorder | null = null;
let audioChunks: Blob[] = [];
let vadInterval: any = null;
let isSpeaking = false;
let silenceStart = 0;
let speechStart = 0;

function getRMS(analyser: AnalyserNode): number {
  const data = new Float32Array(analyser.fftSize);
  analyser.getFloatTimeDomainData(data);
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i] * data[i];
  return Math.sqrt(sum / data.length);
}

function startRecording(): void {
  if (!micStream || !micStream.active) return;
  audioChunks = [];
  mediaRecorder = new MediaRecorder(micStream, { mimeType: "audio/webm" });
  mediaRecorder.ondataavailable = (e) => {
    if (e.data.size > 0) audioChunks.push(e.data);
  };
  mediaRecorder.onstop = async () => {
    const duration = Date.now() - speechStart;
    if (audioChunks.length === 0 || duration < MIN_SPEECH_MS) return;
    const blob = new Blob(audioChunks, { type: "audio/webm" });
    audioChunks = [];

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = (reader.result as string).split(",")[1];
      if (!base64) { chatInputText.value = ""; return; }
      try {
        const text = await gai?.transcribeAudio(base64);
        if (text && text.trim()) {
          chatInputText.value = text.trim();
          lastTranscription.value = text.trim();
          pendingVoiceSubmit.value++;
        } else {
          chatInputText.value = "";
        }
      } catch (e) {
        console.warn("[Ghost AI] Transcription error:", e);
        chatInputText.value = "";
      }
    };
    reader.readAsDataURL(blob);
  };
  mediaRecorder.start();
}

function stopRecording(): void {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop();
  }
  mediaRecorder = null;
}

function startVAD(): void {
  if (!analyserNode) return;
  vadInterval = setInterval(() => {
    if (!analyserNode || !isListening.value) return;
    const rms = getRMS(analyserNode);
    const now = Date.now();

    if (rms > SILENCE_THRESHOLD) {
      // Speech detected
      if (!isSpeaking) {
        isSpeaking = true;
        speechStart = now;
        startRecording();
      }
      silenceStart = 0; // reset silence timer
    } else {
      // Silence
      if (isSpeaking) {
        if (silenceStart === 0) silenceStart = now;
        if (now - silenceStart >= SILENCE_DURATION_MS) {
          // Silence long enough → stop recording & transcribe
          isSpeaking = false;
          silenceStart = 0;
          stopRecording();
        }
      }
    }
  }, 50); // check every 50ms
}

export async function startListening(): Promise<void> {
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (e) {
    console.warn("Microphone access denied:", e);
    chatInputText.value = "";
    isListening.value = false;
    return;
  }

  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(micStream);
  analyserNode = audioContext.createAnalyser();
  analyserNode.fftSize = 512;
  source.connect(analyserNode);

  isListening.value = true;
  isSpeaking = false;
  silenceStart = 0;

  startVAD();
}

export function stopListening(): void {
  isListening.value = false;
  if (vadInterval) { clearInterval(vadInterval); vadInterval = null; }
  if (isSpeaking) {
    isSpeaking = false;
    stopRecording();
  }
  if (audioContext) {
    audioContext.close().catch(() => {});
    audioContext = null;
    analyserNode = null;
  }
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop());
    micStream = null;
  }
}

export function toggleListening(): void {
  if (isListening.value) {
    stopListening();
  } else {
    startListening();
  }
}

