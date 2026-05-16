import { AIProvider, ChatMessage } from "./types";
import { getSetting } from "../settings";
import { net } from "electron";

export class GeminiProvider implements AIProvider {
  name = "gemini";
  private get apiKey() { return getSetting("geminiApiKey"); }

  async isAvailable(): Promise<boolean> { return !!this.apiKey; }

  private toGeminiMessages(messages: ChatMessage[]) {
    return messages
      .filter(m => m.role !== "system")
      .map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
  }

  private buildBody(messages: ChatMessage[]): any {
    const systemMsg = messages.find(m => m.role === "system");
    const body: any = { contents: this.toGeminiMessages(messages) };
    if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] };
    return body;
  }

  async chat(messages: ChatMessage[]): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
    const res = await net.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(this.buildBody(messages)),
    });
    const data = await res.json() as any;
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  async chatStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string> {
    const answer = await this.chat(messages);
    if (answer) onChunk(answer);
    return answer;
  }

  async vision(imageBase64: string, prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
    const res = await net.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [
            { text: prompt },
            { inlineData: { mimeType: "image/jpeg", data: imageBase64 } },
          ],
        }],
      }),
    });
    const data = await res.json() as any;
    if (data.error) throw new Error(data.error.message || JSON.stringify(data.error));
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
}

