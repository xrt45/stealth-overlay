import { signal } from "@preact/signals";
import { showSettings } from "../state/store";

const settingsData = signal<any>(null);
const gai = (window as any).ghostAI;

const inputStyle: any = {
  width: "100%",
  padding: "6px 8px",
  background: "rgba(255,255,255,0.08)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "4px",
  color: "#eee",
  fontSize: "12px",
  marginTop: "4px",
  outline: "none",
};

function Section({ title, children }: { title: string; children: any }) {
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ opacity: 0.6, marginBottom: "2px", fontSize: "11px" }}>{title}</div>
      {children}
    </div>
  );
}

export function Settings() {
  if (!showSettings.value) return null;

  // Load settings once
  if (!settingsData.value) {
    gai?.getSettings().then((s: any) => { settingsData.value = s; });
    return <div style={{ padding: "12px", fontSize: "12px", opacity: 0.5 }}>Loading settings...</div>;
  }

  const s = settingsData.value;

  const save = (key: string, value: any) => {
    gai?.setSetting(key, value);
    settingsData.value = { ...settingsData.value, [key]: value };
  };

  return (
    <div style={{
      padding: "12px",
      background: "rgba(0,0,0,0.35)",
      borderRadius: "8px",
      marginTop: "8px",
      fontSize: "12px",
      maxHeight: "300px",
      overflowY: "auto",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
        <b style={{ color: "#7c6fff" }}>⚙️ Settings</b>
        <span
          onClick={() => { showSettings.value = false; settingsData.value = null; gai?.closeSettings(); }}
          style={{ color: "#ff6b6b", cursor: "pointer", fontSize: "14px" }}
        >✕</span>
      </div>

      <Section title="🌐 Response Language">
        <input
          value={s.primaryLanguage}
          onInput={(e: any) => save("primaryLanguage", e.target.value)}
          placeholder="English, Hindi, Spanish..."
          style={inputStyle}
        />
      </Section>

      <Section title="🤖 Ollama (Free / Offline)">
        <input value={s.ollamaBaseUrl} onInput={(e: any) => save("ollamaBaseUrl", e.target.value)}
          placeholder="http://localhost:11434" style={inputStyle} />
        <input value={s.ollamaTextModel} onInput={(e: any) => save("ollamaTextModel", e.target.value)}
          placeholder="llama3.1:8b" style={{ ...inputStyle, marginTop: "4px" }} />
        <input value={s.ollamaVisionModel} onInput={(e: any) => save("ollamaVisionModel", e.target.value)}
          placeholder="llava:7b" style={{ ...inputStyle, marginTop: "4px" }} />
      </Section>

      <Section title="✨ Google Gemini (Free)">
        <input value={s.geminiApiKey} onInput={(e: any) => save("geminiApiKey", e.target.value)}
          placeholder="API Key from aistudio.google.com" type="password" style={inputStyle} />
      </Section>

      <Section title="⚡ Groq (Free)">
        <input value={s.groqApiKey} onInput={(e: any) => save("groqApiKey", e.target.value)}
          placeholder="API Key from console.groq.com" type="password" style={inputStyle} />
      </Section>

      <Section title="💎 OpenAI (Paid)">
        <input value={s.openaiApiKey} onInput={(e: any) => save("openaiApiKey", e.target.value)}
          placeholder="sk-..." type="password" style={inputStyle} />
        <input value={s.openaiModel} onInput={(e: any) => save("openaiModel", e.target.value)}
          placeholder="gpt-4o-mini" style={{ ...inputStyle, marginTop: "4px" }} />
      </Section>

      <Section title="🟣 Anthropic Claude (Paid)">
        <input value={s.anthropicApiKey} onInput={(e: any) => save("anthropicApiKey", e.target.value)}
          placeholder="sk-ant-..." type="password" style={inputStyle} />
      </Section>

      <Section title="🐙 GitHub Models (Free with GitHub)">
        <input value={s.githubModelsToken} onInput={(e: any) => save("githubModelsToken", e.target.value)}
          placeholder="GitHub PAT (ghp_...)" type="password" style={inputStyle} />
        <input value={s.githubModelsModel} onInput={(e: any) => save("githubModelsModel", e.target.value)}
          placeholder="gpt-4o" style={{ ...inputStyle, marginTop: "4px" }} />
      </Section>

      <Section title="📸 Screenshot">
        <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
          <input type="checkbox" checked={s.screenshotEnabled}
            onChange={(e: any) => save("screenshotEnabled", e.target.checked)} />
          Auto-screenshot every
          <input type="number" value={s.screenshotInterval} min={0} max={120}
            onInput={(e: any) => save("screenshotInterval", parseInt(e.target.value) || 0)}
            style={{ ...inputStyle, width: "50px", marginTop: 0 }}
          />s
        </label>
      </Section>
    </div>
  );
}

