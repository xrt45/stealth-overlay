import { signal } from "@preact/signals";

export const isListening = signal(false);
export const lastTranscription = signal("");

let recognition: any = null;

export function startListening(): void {
  const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
  if (!SR) {
    console.warn("Web Speech API not available");
    return;
  }

  recognition = new SR();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = "en-US";

  recognition.onresult = (event: any) => {
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        const text = event.results[i][0].transcript.trim();
        if (text) {
          lastTranscription.value = text;
          (window as any).ghostAI?.sendTranscription(text, "voice");
        }
      }
    }
  };

  recognition.onerror = (event: any) => {
    console.warn("Speech recognition error:", event.error);
    if (event.error === "not-allowed" || event.error === "service-not-allowed") {
      isListening.value = false;
    }
  };

  recognition.onend = () => {
    // Auto-restart if still supposed to be listening
    if (isListening.value && recognition) {
      try { recognition.start(); } catch { /* already started */ }
    }
  };

  try {
    recognition.start();
    isListening.value = true;
  } catch (e) {
    console.warn("Could not start speech recognition:", e);
  }
}

export function stopListening(): void {
  isListening.value = false;
  if (recognition) {
    try { recognition.stop(); } catch { /* ignore */ }
    recognition = null;
  }
}

export function toggleListening(): void {
  if (isListening.value) {
    stopListening();
  } else {
    startListening();
  }
}

