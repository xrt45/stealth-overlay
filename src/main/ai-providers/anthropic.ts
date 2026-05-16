import { AIProvider, ChatMessage } from "./types";
import { getSetting } from "../settings";

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private get apiKey() { return getSetting("anthropicApiKey"); }
  private get model() { return getSetting("anthropicModel"); }

  async isAvailable(): Promise<boolean> { return !!this.apiKey; }

  async chat(messages: ChatMessage[]): Promise<string> {
    const systemMsg = messages.find(m => m.role === "system");
    const nonSystem = messages.filter(m => m.role !== "system");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        system: systemMsg?.content || "",
        messages: nonSystem,
      }),
    });
    const data = await res.json() as any;
    return data.content?.[0]?.text || "";
  }

  async chatStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string> {
    const systemMsg = messages.find(m => m.role === "system");
    const nonSystem = messages.filter(m => m.role !== "system");
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        system: systemMsg?.content || "",
        messages: nonSystem,
        stream: true,
      }),
    });
    let full = "";
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      for (const line of decoder.decode(value, { stream: true }).split("\n")) {
        if (line.startsWith("data: ")) {
          try {
            const json = JSON.parse(line.slice(6));
            if (json.type === "content_block_delta") {
              const chunk = json.delta?.text || "";
              if (chunk) { full += chunk; onChunk(chunk); }
            }
          } catch { /* skip */ }
        }
      }
    }
    return full;
  }

  async vision(imageBase64: string, prompt: string): Promise<string> {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });
    const data = await res.json() as any;
    return data.content?.[0]?.text || "";
  }
}

