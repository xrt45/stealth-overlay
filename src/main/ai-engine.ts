import { AIProvider, ChatMessage } from "./ai-providers/types";
import { OllamaProvider } from "./ai-providers/ollama";
import { GeminiProvider } from "./ai-providers/gemini";
import { GroqProvider } from "./ai-providers/groq";
import { OpenAIProvider } from "./ai-providers/openai";
import { AnthropicProvider } from "./ai-providers/anthropic";
import { GitHubModelsProvider } from "./ai-providers/github-models";
import { getSetting } from "./settings";

const providers: Record<string, AIProvider> = {
  ollama: new OllamaProvider(),
  gemini: new GeminiProvider(),
  groq: new GroqProvider(),
  openai: new OpenAIProvider(),
  anthropic: new AnthropicProvider(),
  github: new GitHubModelsProvider(),
};

async function getAvailableProvider(): Promise<AIProvider | null> {
  const priority = getSetting("providerPriority");
  for (const name of priority) {
    const provider = providers[name];
    if (!provider) continue;
    try {
      if (await provider.isAvailable()) return provider;
    } catch { /* skip */ }
  }
  return null;
}

function buildSystemPrompt(): string {
  const lang = getSetting("primaryLanguage");
  return `You are a helpful AI assistant displayed in a small overlay panel.
Keep responses concise (max 200 words). Use markdown for formatting.
Use code blocks with language tags for code. Respond in: ${lang}.`;
}

export async function askAI(
  userPrompt: string,
  onChunk?: (chunk: string) => void,
): Promise<{ answer: string; provider: string }> {
  const provider = await getAvailableProvider();
  if (!provider) {
    const msg = "❌ No AI provider available. Click ⚙️ Settings to add an API key.";
    if (onChunk) onChunk(msg);
    return { answer: msg, provider: "none" };
  }
  console.log(`[Ghost AI] Using provider: ${provider.name}`);
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: userPrompt },
  ];
  try {
    const answer = onChunk
      ? await provider.chatStream(messages, onChunk)
      : await provider.chat(messages);
    return { answer, provider: provider.name };
  } catch (err: any) {
    console.error(`[Ghost AI] Error from ${provider.name}:`, err);
    const errMsg = `❌ Error from ${provider.name}: ${err.message}`;
    if (onChunk) onChunk(errMsg);
    return { answer: errMsg, provider: provider.name };
  }
}

export async function analyzeScreenshot(
  imageBase64: string,
  onChunk?: (chunk: string) => void,
): Promise<{ answer: string; provider: string }> {
  const lang = getSetting("primaryLanguage");
  const prompt = `Analyze this screenshot. Respond in ${lang}.
1. If CODE is visible: identify the language, find errors, suggest fixes.
2. If a QUESTION is visible: provide the answer.
3. If an ERROR message is visible: explain the cause and solution.
4. If text/document: summarize key points.
Keep it concise (max 200 words). Use markdown.`;

  const priority = getSetting("providerPriority");
  for (const name of priority) {
    const provider = providers[name];
    if (!provider) continue;
    try {
      if (await provider.isAvailable()) {
        const answer = await provider.vision(imageBase64, prompt);
        return { answer, provider: provider.name };
      }
    } catch { /* skip to next */ }
  }
  return { answer: "❌ No vision-capable AI provider available.", provider: "none" };
}

export async function checkAllProviders(): Promise<{ name: string; available: boolean }[]> {
  const results: { name: string; available: boolean }[] = [];
  for (const [name, provider] of Object.entries(providers)) {
    try {
      results.push({ name, available: await provider.isAvailable() });
    } catch {
      results.push({ name, available: false });
    }
  }
  return results;
}

