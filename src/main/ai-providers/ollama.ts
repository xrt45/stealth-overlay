import { AIProvider, ChatMessage } from "./types";
import { getSetting } from "../settings";

export class OllamaProvider implements AIProvider {
  name = "ollama";
  private get baseUrl() { return getSetting("ollamaBaseUrl"); }
  private get textModel() { return getSetting("ollamaTextModel"); }
  private get visionModel() { return getSetting("ollamaVisionModel"); }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(2000) });
      return res.ok;
    } catch { return false; }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.textModel, messages, stream: false }),
    });
    const data = await res.json() as any;
    return data.message?.content || "";
  }

  async chatStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.textModel, messages, stream: true }),
    });
    let full = "";
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value, { stream: true }).split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const json = JSON.parse(line);
          if (json.message?.content) {
            full += json.message.content;
            onChunk(json.message.content);
          }
        } catch { /* skip malformed lines */ }
      }
    }
    return full;
  }

  async vision(imageBase64: string, prompt: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.visionModel,
        messages: [{ role: "user", content: prompt, images: [imageBase64] }],
        stream: false,
      }),
    });
    const data = await res.json() as any;
    return data.message?.content || "";
  }
}

