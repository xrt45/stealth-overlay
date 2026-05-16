import { AIProvider, ChatMessage } from "./types";
import { getSetting } from "../settings";
import { net } from "electron";

export class OllamaProvider implements AIProvider {
  name = "ollama";
  private get baseUrl() { return getSetting("ollamaBaseUrl"); }
  private get textModel() { return getSetting("ollamaTextModel"); }
  private get visionModel() { return getSetting("ollamaVisionModel"); }

  async isAvailable(): Promise<boolean> {
    try {
      const res = await net.fetch(`${this.baseUrl}/api/tags`);
      return res.ok;
    } catch { return false; }
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await net.fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.textModel, messages, stream: false }),
    });
    const data = await res.json() as any;
    if (data.error) throw new Error(data.error);
    return data.message?.content || "";
  }

  async chatStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string> {
    const answer = await this.chat(messages);
    if (answer) onChunk(answer);
    return answer;
  }

  async vision(imageBase64: string, prompt: string): Promise<string> {
    const res = await net.fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.visionModel,
        messages: [{ role: "user", content: prompt, images: [imageBase64] }],
        stream: false,
      }),
    });
    const data = await res.json() as any;
    if (data.error) throw new Error(data.error);
    return data.message?.content || "";
  }
}

