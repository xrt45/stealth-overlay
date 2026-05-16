import { AIProvider, ChatMessage } from "./types";
import { getSetting } from "../settings";
import { net } from "electron";

export class GroqProvider implements AIProvider {
  name = "groq";
  private get apiKey() { return getSetting("groqApiKey"); }

  async isAvailable(): Promise<boolean> { return !!this.apiKey; }

  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await net.fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, stream: false }),
    });
    const data = await res.json() as any;
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.choices?.[0]?.message?.content || "";
  }

  async chatStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string> {
    const answer = await this.chat(messages);
    if (answer) onChunk(answer);
    return answer;
  }

  async vision(_imageBase64: string, prompt: string): Promise<string> {
    // Groq doesn't support vision — text fallback
    return this.chat([{ role: "user", content: prompt }]);
  }
}

