import { AIProvider, ChatMessage } from "./types";
import { getSetting } from "../settings";
import { net } from "electron";

const BASE_URL = "https://models.inference.ai.github.com";

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
        Authorization: `Bearer ${this.token}`,
      },
      body: JSON.stringify({ model: this.model, messages, stream: false }),
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

  async vision(imageBase64: string, prompt: string): Promise<string> {
    const res = await net.fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.token}`,
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
