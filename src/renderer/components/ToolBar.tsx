import { signal } from "@preact/signals";
import {
  isListeningVoice, activeProvider, showSettings, isPrivate,
  languages, primaryLanguage, addLanguage, removeLanguage, setActiveLanguage,
  addMessage, finishMessage,
} from "../state/store";
import { toggleListening } from "../hooks/useAudio";

const showLangInput = signal(false);
const newLangText = signal("");
const showProviderMenu = signal(false);

const gai = (window as any).ghostAI;

const btnBase: any = {
  display: "flex", alignItems: "center", justifyContent: "center",
  gap: "4px", padding: "5px 10px", border: "none", borderRadius: "6px",
  cursor: "pointer", fontSize: "11px", fontWeight: 600, transition: "all 0.15s",
};

function ToolBtn({ icon, label, active, onClick, color }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        ...btnBase,
        background: active ? (color || "rgba(124,111,255,0.3)") : "rgba(255,255,255,0.06)",
        color: active ? "#fff" : "rgba(255,255,255,0.6)",
        border: active ? "1px solid rgba(124,111,255,0.5)" : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <span style={{ fontSize: "14px" }}>{icon}</span>
      {label && <span>{label}</span>}
    </button>
  );
}

export function ToolBar() {
  return (
    <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "8px", marginTop: "8px" }}>
      {/* Action Buttons Row */}
      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "6px" }}>
        <ToolBtn
          icon={isListeningVoice.value ? "\u{1F3A4}" : "\u{1F399}"}
          label={isListeningVoice.value ? "ON" : "OFF"}
          active={isListeningVoice.value}
          color="rgba(46,204,113,0.3)"
          onClick={() => {
            toggleListening();
            isListeningVoice.value = !isListeningVoice.value;
            gai?.setSetting("voiceEnabled", isListeningVoice.value);
          }}
        />
        <ToolBtn
          icon={"\u{1F4F8}"}
          label="Screen"
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
          icon={"\u{1F916}"}
          label={activeProvider.value === "none" ? "AI" : activeProvider.value}
          active={showProviderMenu.value}
          onClick={() => { showProviderMenu.value = !showProviderMenu.value; }}
        />
        <ToolBtn
          icon={"\u2699\uFE0F"}
          label=""
          active={showSettings.value}
          onClick={() => {
            showSettings.value = !showSettings.value;
            if (showSettings.value) gai?.setFocusable(true);
            else gai?.closeSettings();
          }}
        />
        <ToolBtn
          icon={isPrivate.value ? "\u{1F512}" : "\u{1F513}"}
          label=""
          active={isPrivate.value}
          onClick={() => {
            const next = !isPrivate.value;
            isPrivate.value = next;
            gai?.setSetting("isPrivate", next);
          }}
        />
      </div>

      {/* Provider quick-switch dropdown */}
      {showProviderMenu.value && (
        <div style={{
          display: "flex", gap: "4px", flexWrap: "wrap", marginBottom: "6px",
          padding: "6px", background: "rgba(0,0,0,0.3)", borderRadius: "6px",
        }}>
          {["github", "ollama", "gemini", "groq", "openai", "anthropic"].map(p => (
            <button
              key={p}
              onClick={() => {
                activeProvider.value = p;
                gai?.setSetting("providerPriority", [p, ...["github","ollama","gemini","groq","openai","anthropic"].filter(x => x !== p)]);
                showProviderMenu.value = false;
              }}
              style={{
                ...btnBase,
                background: activeProvider.value === p ? "rgba(124,111,255,0.4)" : "rgba(255,255,255,0.05)",
                color: activeProvider.value === p ? "#fff" : "rgba(255,255,255,0.5)",
                border: "1px solid rgba(255,255,255,0.1)",
                fontSize: "10px", padding: "3px 8px",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Language Tags Bar */}
      <div style={{ display: "flex", gap: "4px", flexWrap: "wrap", alignItems: "center" }}>
        {languages.value.map(lang => (
          <span
            key={lang}
            onClick={() => setActiveLanguage(lang)}
            style={{
              display: "inline-flex", alignItems: "center", gap: "3px",
              padding: "2px 8px", borderRadius: "10px", fontSize: "10px",
              cursor: "pointer", transition: "all 0.15s",
              background: primaryLanguage.value === lang ? "rgba(124,111,255,0.35)" : "rgba(255,255,255,0.06)",
              color: primaryLanguage.value === lang ? "#fff" : "rgba(255,255,255,0.5)",
              border: primaryLanguage.value === lang ? "1px solid rgba(124,111,255,0.5)" : "1px solid rgba(255,255,255,0.08)",
            }}
          >
            {"\u{1F310}"} {lang}
            {languages.value.length > 1 && (
              <span
                onClick={(e: any) => { e.stopPropagation(); removeLanguage(lang); }}
                style={{ cursor: "pointer", opacity: 0.5, marginLeft: "2px", fontSize: "9px" }}
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
            placeholder="Hindi, Spanish..."
            style={{
              width: "90px", padding: "2px 6px", fontSize: "10px",
              background: "rgba(255,255,255,0.08)", border: "1px solid rgba(124,111,255,0.4)",
              borderRadius: "10px", color: "#eee", outline: "none",
            }}
          />
        ) : (
          <span
            onClick={() => { showLangInput.value = true; }}
            style={{
              display: "inline-flex", alignItems: "center",
              padding: "2px 8px", borderRadius: "10px", fontSize: "10px",
              cursor: "pointer", color: "rgba(124,111,255,0.7)",
              border: "1px dashed rgba(124,111,255,0.3)",
            }}
          >
            + Add
          </span>
        )}
      </div>
    </div>
  );
}

