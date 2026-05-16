import { signal } from "@preact/signals";
import {
  isListeningVoice, activeProvider, showSettings, isPrivate,
  overlayOpacity, themeMode,
  languages, primaryLanguage, addLanguage, removeLanguage, setActiveLanguage,
  addMessage, finishMessage,
} from "../state/store";
import { toggleListening } from "../hooks/useAudio";

const showLangInput = signal(false);
const newLangText = signal("");
const showProviderMenu = signal(false);
const showModelMenu = signal(false);
const showOpacitySlider = signal(false);
const showExtras = signal(false);

const selectedModel = signal("openai/gpt-4o");

const gai = (window as any).ghostAI;

if (gai) {
  gai.getSettings().then((s: any) => {
    if (s.githubModelsModel) selectedModel.value = s.githubModelsModel;
  });
}

const GITHUB_MODELS = [
  "openai/gpt-4o",
  "openai/gpt-4o-mini",
  "openai/gpt-4.1",
  "openai/gpt-4.1-mini",
  "openai/gpt-4.1-nano",
  "openai/o4-mini",
  "meta/Meta-Llama-3.1-405B-Instruct",
  "meta/Meta-Llama-3.1-70B-Instruct",
  "mistralai/Mistral-Large",
  "deepseek/DeepSeek-V3-0324",
  "cohere/Cohere-command-r-plus",
];

const btnBase: any = {
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: "3px 6px", border: "none", borderRadius: "4px",
  fontSize: "10px", fontWeight: 500, transition: "all 0.15s",
};

function ToolBtn({ icon, active, onClick }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        ...btnBase,
        background: active ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
        color: active ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.5)",
        border: active ? "1px solid rgba(255,255,255,0.15)" : "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <span style={{ fontSize: "11px" }}>{icon}</span>
    </button>
  );
}

export function ToolBar() {
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "4px", marginTop: "4px" }}>
      {/* Primary: Mic, Screen, Expand */}
      <div style={{ display: "flex", gap: "4px", marginBottom: "4px" }}>
        <ToolBtn
          icon={isListeningVoice.value ? "\u{1F3A4}" : "\u{1F399}"}
          active={isListeningVoice.value}
          onClick={() => {
            toggleListening();
            isListeningVoice.value = !isListeningVoice.value;
          }}
        />
        <ToolBtn
          icon={"\u{1F4F8}"}
          active={false}
          onClick={async () => {
            const msgId = addMessage("screenshot", "Analyzing screen...");
            try {
              const result = await gai?.takeScreenshot();
              if (result) finishMessage(msgId, result.provider);
            } catch { finishMessage(msgId, "error"); }
          }}
        />
        <ToolBtn
          icon={showExtras.value ? "\u25B2" : "\u25BC"}
          active={showExtras.value}
          onClick={() => { showExtras.value = !showExtras.value; }}
        />
      </div>

      {/* Extra buttons (hidden by default) */}
      {showExtras.value && (
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "4px" }}>
        <ToolBtn icon={"\u{1F916}"} active={showModelMenu.value}
          onClick={() => { showModelMenu.value = !showModelMenu.value; showOpacitySlider.value = false; }} />
        <ToolBtn icon={"\u2699\uFE0F"} active={showSettings.value}
          onClick={() => { showSettings.value = !showSettings.value; if (showSettings.value) gai?.setFocusable(true); else gai?.closeSettings(); }} />
        <ToolBtn icon={"\u{1F4A7}"} active={showOpacitySlider.value}
          onClick={() => { showOpacitySlider.value = !showOpacitySlider.value; showModelMenu.value = false; }} />
        <ToolBtn icon={themeMode.value === "dark" ? "\u2600\uFE0F" : "\u{1F319}"} active={false}
          onClick={() => { themeMode.value = themeMode.value === "dark" ? "light" : "dark"; }} />
      </div>
      )}

      {/* Unified Model + Provider dropdown */}
      {showModelMenu.value && (
        <div style={{
          marginBottom: "4px", padding: "4px", background: "rgba(0,0,0,0.3)", borderRadius: "6px",
          maxHeight: "140px", overflowY: "auto",
        }}>
          {/* Provider row */}
          <div style={{ display: "flex", gap: "3px", flexWrap: "wrap", marginBottom: "4px" }}>
            {["github", "ollama", "gemini", "groq", "openai", "anthropic"].map(p => (
              <button
                key={p}
                onClick={() => {
                  activeProvider.value = p;
                  gai?.setSetting("providerPriority", [p, ...["github","ollama","gemini","groq","openai","anthropic"].filter(x => x !== p)]);
                }}
                style={{
                  ...btnBase,
                  background: activeProvider.value === p ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                  color: activeProvider.value === p ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.45)",
                  border: activeProvider.value === p ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.08)",
                  fontSize: "9px", padding: "2px 6px",
                }}
              >
                {p}
              </button>
            ))}
          </div>
          {/* Models row */}
          <div style={{ display: "flex", gap: "3px", flexWrap: "wrap" }}>
            {GITHUB_MODELS.map(m => {
              const short = m.split("/").pop() || m;
              return (
                <button
                  key={m}
                  onClick={() => {
                    gai?.setSetting("githubModelsModel", m);
                    selectedModel.value = m;
                    activeProvider.value = "github";
                    gai?.setSetting("providerPriority", ["github", "ollama", "gemini", "groq", "openai", "anthropic"]);
                    showModelMenu.value = false;
                  }}
                  style={{
                    ...btnBase,
                    background: selectedModel.value === m ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.05)",
                    color: selectedModel.value === m ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.5)",
                    border: selectedModel.value === m ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(255,255,255,0.08)",
                    fontSize: "8px", padding: "2px 4px",
                  }}
                >
                  {short}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Opacity Slider */}
      {showOpacitySlider.value && (
        <div style={{
          display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px",
          padding: "4px 6px", background: "rgba(0,0,0,0.3)", borderRadius: "6px",
        }}>
          <input
            type="range" min="10" max="100" step="5"
            value={overlayOpacity.value}
            onInput={(e: any) => {
              const v = parseInt(e.target.value, 10);
              overlayOpacity.value = v;
              gai?.setSetting("overlayOpacity", v);
            }}
            style={{ flex: 1, height: "3px", cursor: "pointer", accentColor: "rgba(255,255,255,0.4)" }}
          />
          <span style={{ fontSize: "9px", opacity: 0.6 }}>{overlayOpacity.value}%</span>
        </div>
      )}

      {/* Language Tags (only when expanded) */}
      {showExtras.value && (
      <div style={{ display: "flex", gap: "3px", flexWrap: "wrap", alignItems: "center", marginTop: "2px" }}>
        {languages.value.map(lang => (
          <span
            key={lang}
            onClick={() => setActiveLanguage(lang)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "2px",
              padding: "1px 6px", borderRadius: "8px", fontSize: "9px",
              cursor: "pointer", transition: "all 0.15s",
              background: primaryLanguage.value === lang ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)",
              color: primaryLanguage.value === lang ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.45)",
              border: primaryLanguage.value === lang ? "1px solid rgba(255,255,255,0.18)" : "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {lang}
            {languages.value.length > 1 && (
              <span
                onClick={(e: any) => { e.stopPropagation(); removeLanguage(lang); }}
                style={{ cursor: "pointer", opacity: 0.4, fontSize: "8px" }}
              >{"\u2715"}</span>
            )}
          </span>
        ))}
        {showLangInput.value ? (
          <input
            autoFocus
            value={newLangText.value}
            onInput={(e: any) => { newLangText.value = e.target.value; }}
            onKeyDown={(e: any) => {
              if (e.key === "Enter" && newLangText.value.trim()) {
                addLanguage(newLangText.value.trim());
                setActiveLanguage(newLangText.value.trim());
                newLangText.value = "";
                showLangInput.value = false;
              }
              if (e.key === "Escape") { showLangInput.value = false; newLangText.value = ""; }
            }}
            onBlur={() => { showLangInput.value = false; newLangText.value = ""; }}
            placeholder="Add..."
            style={{
              width: "60px", padding: "1px 5px", fontSize: "9px",
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)",
              borderRadius: "8px", color: "#eee", outline: "none",
            }}
          />
        ) : (
          <span
            onClick={() => { showLangInput.value = true; }}
            style={{
              display: "inline-flex", alignItems: "center",
              padding: "1px 5px", borderRadius: "8px", fontSize: "9px",
              cursor: "pointer", color: "rgba(255,255,255,0.3)",
              border: "1px dashed rgba(255,255,255,0.12)",
            }}
          >
            +
          </span>
        )}
      </div>
      )}
    </div>
  );
}

