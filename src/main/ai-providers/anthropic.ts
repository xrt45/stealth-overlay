import { AIProvider, ChatMessage } from "./types";
import { getSetting } from "../settings";
import { net } from "electron";

export class AnthropicProvider implements AIProvider {
  name = "anthropic";
  private get apiKey() { return getSetting("anthropicApiKey"); }
  private get model() { return getSetting("anthropicModel"); }

  async isAvailable(): Promise<boolean> { return !!this.apiKey; }

  async chat(messages: ChatMessage[]): Promise<string> {
    const systemMsg = messages.find(m => m.role === "system");
    const nonSystem = messages.filter(m => m.role !== "system");
    const res = await net.fetch("https://api.anthropic.com/v1/messages", {
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
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.content?.[0]?.text || "";
  }

  async chatStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string> {
    const answer = await this.chat(messages);
    if (answer) onChunk(answer);
    return answer;
  }

  async vision(imageBase64: string, prompt: string): Promise<string> {
    const res = await net.fetch("https://api.anthropic.com/v1/messages", {
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
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.content?.[0]?.text || "";
  }
}

