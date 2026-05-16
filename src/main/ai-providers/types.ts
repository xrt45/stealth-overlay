export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AIProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  chat(messages: ChatMessage[]): Promise<string>;
  chatStream(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<string>;
  vision(imageBase64: string, prompt: string): Promise<string>;
}

