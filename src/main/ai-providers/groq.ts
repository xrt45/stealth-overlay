import { AIProvider, ChatMessage } from "./types";
import { getSetting } from "../settings";

export class GroqProvider implements AIProvider {
  name = "groq";
  private get apiKey() { return getSetting("groqApiKey"); }

  async isAvailable(): Promise<boolean> { return !!this.apiKey; }

  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, stream: false }),
    });
    const data = await res.json() as any;
    return data.choices?.[0]?.message?.content || "";
  }

  async chatStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string> {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: "llama-3.3-70b-versatile", messages, stream: true }),
    });
    let full = "";
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value, { stream: true }).split("\n")) {
        if (line.startsWith("data: ") && !line.includes("[DONE]")) {
          try {
            const json = JSON.parse(line.slice(6));
            const chunk = json.choices?.[0]?.delta?.content || "";
            if (chunk) { full += chunk; onChunk(chunk); }
          } catch { /* skip */ }
        }
      }
    }
    return full;
  }

  async vision(_imageBase64: string, prompt: string): Promise<string> {
    // Groq doesn't support vision — text fallback
    return this.chat([{ role: "user", content: prompt }]);
  }
}

