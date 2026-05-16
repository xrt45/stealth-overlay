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
  const progLangs = getSetting("languages");
  const primary = getSetting("primaryLanguage");
  const langContext = progLangs.length > 0
    ? `The user works with: ${progLangs.join(", ")}. Primary focus: ${primary}. Prioritize answers relevant to these technologies.`
    : "";
  return `You are a helpful AI assistant displayed in a small overlay panel.
Keep responses concise (max 200 words). Use markdown for formatting.
Use code blocks with language tags for code.
${langContext}`.trim();
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
  const progLangs = getSetting("languages");
  const contextSuffix = progLangs.length > 0
    ? `\n[Context: programming languages: ${progLangs.join(", ")}]`
    : "";
  const messages: ChatMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    { role: "user", content: userPrompt + contextSuffix },
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
  const progLangs = getSetting("languages");
  const techContext = progLangs.length > 0 ? `The user works with: ${progLangs.join(", ")}.` : "";

  // Step 1: Vision extracts raw text from the screenshot (OCR)
  const extractPrompt = "Extract ALL text visible in this screenshot exactly as shown. Include code, error messages, stack traces, questions, and any other text. Return ONLY the extracted text, no commentary.";

  const priority = getSetting("providerPriority");
  let extractedText = "";
  let visionProvider = "";

  for (const name of priority) {
    const provider = providers[name];
    if (!provider) continue;
    try {
      if (await provider.isAvailable()) {
        console.log(`[Ghost AI] OCR extraction using: ${provider.name}`);
        extractedText = await provider.vision(imageBase64, extractPrompt);
        visionProvider = provider.name;
        break;
      }
    } catch (err: any) {
      console.error(`[Ghost AI] Vision OCR error from ${name}:`, err.message);
    }
  }

  if (!extractedText || extractedText.trim().length < 10) {
    return { answer: "\u274C Could not extract text from screenshot. The image may be blank or contain only graphics.", provider: visionProvider || "none" };
  }

  // Step 2: Send extracted text to chat AI for analysis (cheaper than vision)
  console.log(`[Ghost AI] Extracted ${extractedText.length} chars, sending to chat AI for analysis`);
  const analyzePrompt = `Analyze this content extracted from a screenshot. ${techContext}

EXTRACTED TEXT:
---
${extractedText.substring(0, 3000)}
---

Instructions:
1. If it contains CODE: identify the language, find errors/bugs, suggest fixes with corrected code.
2. If it contains a QUESTION: provide a clear answer.
3. If it contains an ERROR or STACK TRACE: explain the root cause and solution.
4. If it contains LOGS: identify issues or anomalies.
5. Otherwise: summarize key points.
Keep it concise (max 250 words). Use markdown with code blocks.`;

  const chatProvider = await getAvailableProvider();
  if (!chatProvider) {
    return { answer: "\u274C No AI provider available for analysis.", provider: "none" };
  }

  try {
    const messages: ChatMessage[] = [
      { role: "system", content: buildSystemPrompt() },
      { role: "user", content: analyzePrompt },
    ];
    const answer = onChunk
      ? await chatProvider.chatStream(messages, onChunk)
      : await chatProvider.chat(messages);
    return { answer, provider: `${visionProvider}\u2192${chatProvider.name}` };
  } catch (err: any) {
    console.error("[Ghost AI] Analysis error:", err.message);
    return { answer: `\u274C Error: ${err.message}`, provider: visionProvider };
  }
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

