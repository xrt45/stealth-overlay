import { AIProvider, ChatMessage } from "./types";
import { getSetting } from "../settings";

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

  async chat(messages: ChatMessage[]): Promise<string> {
    const systemMsg = messages.find(m => m.role === "system");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
    const body: any = { contents: this.toGeminiMessages(messages) };
    if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json() as any;
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  async chatStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string> {
    const systemMsg = messages.find(m => m.role === "system");
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${this.apiKey}`;
    const body: any = { contents: this.toGeminiMessages(messages) };
    if (systemMsg) body.systemInstruction = { parts: [{ text: systemMsg.content }] };

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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
            const chunk = json.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (chunk) { full += chunk; onChunk(chunk); }
          } catch { /* skip */ }
        }
      }
    }
    return full;
  }

  async vision(imageBase64: string, prompt: string): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${this.apiKey}`;
    const res = await fetch(url, {
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
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
}

