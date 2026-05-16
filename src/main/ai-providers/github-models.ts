import { AIProvider, ChatMessage } from "./types";
import { getSetting } from "../settings";
import { net } from "electron";

const BASE_URL = "https://models.github.ai/inference";

export class GitHubModelsProvider implements AIProvider {
  name = "github";
  private get token() { return getSetting("githubModelsToken"); }
  private get model() { return getSetting("githubModelsModel"); }

  async isAvailable(): Promise<boolean> { return !!this.token; }

  async chat(messages: ChatMessage[]): Promise<string> {
    const res = await net.fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.token}`,
        "Accept": "application/vnd.github+json",
      },
      body: JSON.stringify({ model: this.model, messages, stream: false }),
    });
    const data = await res.json() as any;
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.choices?.[0]?.message?.content || "";
  }

  async chatStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string> {
    const res = await net.fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.token}`,
        "Accept": "application/vnd.github+json",
      },
      body: JSON.stringify({ model: this.model, messages, stream: true }),
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`GitHub Models API error ${res.status}: ${errText.substring(0, 200)}`);
    }
    const reader = res.body?.getReader();
    if (!reader) {
      const data = await res.json() as any;
      const answer = data.choices?.[0]?.message?.content || "";
      if (answer) onChunk(answer);
      return answer;
    }
    const decoder = new TextDecoder();
    let full = "";
    let buffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const payload = trimmed.slice(6);
        if (payload === "[DONE]") break;
        try {
          const obj = JSON.parse(payload);
          const delta = obj.choices?.[0]?.delta?.content;
          if (delta) { full += delta; onChunk(delta); }
        } catch { /* skip malformed chunks */ }
      }
    }
    return full;
  }

  async vision(imageBase64: string, prompt: string): Promise<string> {
    const res = await net.fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.token}`,
        "Accept": "application/vnd.github+json",
      },
      body: JSON.stringify({
        model: this.model,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
          ],
        }],
      }),
    });
    const data = await res.json() as any;
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.choices?.[0]?.message?.content || "";
  }
}
