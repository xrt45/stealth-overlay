import { render } from "preact";
import { useRef, useEffect } from "preact/hooks";
import { Messages } from "./components/Messages";
import { Settings } from "./components/Settings";
import { ToolBar } from "./components/ToolBar";
import {
  overlayOpacity, isPrivate, showSettings,
  addMessage, appendToMessage, finishMessage,
  isListeningVoice, primaryLanguage, languages, streamingMessageId,
  panelX, panelY, panelW, panelH, chatInputText, pendingVoiceSubmit, themeMode,
} from "./state/store";
import { startListening, stopListening, toggleListening } from "./hooks/useAudio";
const gai = (window as any).ghostAI;
if (gai) {
  gai.on("overlay:opacity", (val: number) => { overlayOpacity.value = val; });
  gai.on("overlay:private-mode", (val: boolean) => { isPrivate.value = val; });
  gai.on("action:toggle-settings", () => { showSettings.value = !showSettings.value; });
  gai.on("action:close-settings", () => { showSettings.value = false; });
  gai.on("action:toggle-mic", () => {
    toggleListening();
    isListeningVoice.value = !isListeningVoice.value;
  });
  gai.on("action:screenshot", async () => {
    const msgId = addMessage("screenshot", "Analyzing screen...");
    try {
      const result = await gai.takeScreenshot();
      if (result) finishMessage(msgId, result.provider);
    } catch { finishMessage(msgId, "error"); }
  });
  gai.on("ai:stream", (chunk: string) => {
    if (streamingMessageId.value) appendToMessage(streamingMessageId.value, chunk);
  });
  gai.on("ai:stream-end", (result: any) => {
    if (streamingMessageId.value) finishMessage(streamingMessageId.value, result?.provider || "?");
  });
  gai.on("audio:new-transcription", async (data: { text: string; source: string }) => {
    if (!data.text?.trim()) return;
    const msgId = addMessage("voice", data.text);
    try {
      const result = await gai.askAI(data.text);
      if (result) {
        if (!result.answer || result.answer === "") appendToMessage(msgId, "No response from AI.");
        finishMessage(msgId, result.provider);
      }
    } catch (e: any) {
      appendToMessage(msgId, "Error: " + (e?.message || "Unknown error"));
      finishMessage(msgId, "error");
    }
  });
  gai.on("screenshot:analysis", (result: any) => {
    if (result?.answer) {
      const msgId = addMessage("screenshot", "Auto-screenshot analysis");
      appendToMessage(msgId, result.answer);
      finishMessage(msgId, result.provider);
    }
  });
  gai.getSettings().then((s: any) => {
    overlayOpacity.value = s.overlayOpacity ?? 45;
    isPrivate.value = s.isPrivate ?? true;
    primaryLanguage.value = s.primaryLanguage ?? "English";
    if (s.languages?.length) languages.value = s.languages;
    if (s.voiceEnabled) { startListening(); isListeningVoice.value = true; }
  });
  gai.on("settings:changed", (s: any) => {
    if (s.overlayOpacity !== undefined) overlayOpacity.value = s.overlayOpacity;
    if (s.isPrivate !== undefined) isPrivate.value = s.isPrivate;
    if (s.primaryLanguage) primaryLanguage.value = s.primaryLanguage;
    if (s.voiceEnabled && !isListeningVoice.value) { startListening(); isListeningVoice.value = true; }
    else if (s.voiceEnabled === false && isListeningVoice.value) { stopListening(); isListeningVoice.value = false; }
  });
}

// Keyboard controls: Arrow keys = move, Shift+Arrow = resize (20px steps)
function useKeyboardControls() {
  useEffect(() => {
    const STEP = 20;
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT") return;
      const shift = e.shiftKey;
      switch (e.key) {
        case "ArrowLeft":
          if (shift) panelW.value = Math.max(250, panelW.value - STEP);
          else panelX.value = Math.max(0, panelX.value - STEP);
          e.preventDefault(); break;
        case "ArrowRight":
          if (shift) panelW.value = panelW.value + STEP;
          else panelX.value = Math.min(window.innerWidth - 100, panelX.value + STEP);
          e.preventDefault(); break;
        case "ArrowUp":
          if (shift) panelH.value = Math.max(200, panelH.value - STEP);
          else panelY.value = Math.max(0, panelY.value - STEP);
          e.preventDefault(); break;
        case "ArrowDown":
          if (shift) panelH.value = panelH.value + STEP;
          else panelY.value = Math.min(window.innerHeight - 100, panelY.value + STEP);
          e.preventDefault(); break;
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
}

function useDrag() {
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const onMouseDown = (e: MouseEvent) => {
    dragging.current = true;
    offset.current = { x: e.clientX - panelX.value, y: e.clientY - panelY.value };
    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      panelX.value = Math.max(0, Math.min(window.innerWidth - 100, ev.clientX - offset.current.x));
      panelY.value = Math.max(0, Math.min(window.innerHeight - 100, ev.clientY - offset.current.y));
    };
    const onUp = () => {
      dragging.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    e.preventDefault();
  };
  return { onMouseDown };
}
function useResize() {
  const resizing = useRef(false);
  const startPos = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const onMouseDown = (e: MouseEvent) => {
    resizing.current = true;
    startPos.current = { x: e.clientX, y: e.clientY, w: panelW.value, h: panelH.value };
    const onMove = (ev: MouseEvent) => {
      if (!resizing.current) return;
      panelW.value = Math.max(250, startPos.current.w + (ev.clientX - startPos.current.x));
      panelH.value = Math.max(200, startPos.current.h + (ev.clientY - startPos.current.y));
    };
    const onUp = () => {
      resizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    e.preventDefault();
    e.stopPropagation();
  };
  return { onMouseDown };
}
function ChatInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSubmitRef = useRef(0);
  const onSend = async () => {
    const text = chatInputText.value.trim() || inputRef.current?.value?.trim();
    if (!text) return;
    chatInputText.value = "";
    if (inputRef.current) inputRef.current.value = "";
    const msgId = addMessage("manual", text);
    try {
      const result = await gai?.askAI(text);
      if (result) finishMessage(msgId, result.provider);
    } catch { finishMessage(msgId, "error"); }
  };
  // Auto-submit when voice transcription produces a final result
  useEffect(() => {
    if (pendingVoiceSubmit.value > 0 && pendingVoiceSubmit.value !== lastSubmitRef.current) {
      lastSubmitRef.current = pendingVoiceSubmit.value;
      onSend();
    }
  }, [pendingVoiceSubmit.value]);
  // Sync chatInputText signal to input element
  useEffect(() => {
    if (inputRef.current && chatInputText.value !== inputRef.current.value) {
      inputRef.current.value = chatInputText.value;
    }
  }, [chatInputText.value]);
  return (
    <div style={{ display: "flex", gap: "4px", padding: "3px 10px 2px" }}>
      <input
        ref={inputRef}
        placeholder="Ask AI anything..."
        onKeyDown={(e: any) => { if (e.key === "Enter") onSend(); }}
        onInput={(e: any) => { chatInputText.value = e.target.value; }}
        style={{
          flex: 1, padding: "5px 8px", fontSize: "11px",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: "4px", color: "#eee", outline: "none",
        }}
      />
      <button
        onClick={onSend}
        style={{
          padding: "4px 6px", fontSize: "12px",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "4px", color: "rgba(255,255,255,0.6)",
          lineHeight: 1,
        }}
      >
        {"\u27A4"}
      </button>
    </div>
  );
}

function App() {
  const drag = useDrag();
  const resize = useResize();
  useKeyboardControls();
  return (
    <div
      onMouseEnter={() => gai?.setFocusable(true)}
      onMouseLeave={() => gai?.setFocusable(false)}
      style={{
        position: "fixed",
        left: panelX.value + "px",
        top: panelY.value + "px",
        width: panelW.value + "px",
        height: panelH.value + "px",
        background: "rgba(15, 15, 30, " + (overlayOpacity.value / 100) + ")",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.08)",
        color: themeMode.value === "dark" ? "#e0e0e0" : "#1a1a1a",
        fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif",
        fontSize: "13px",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        pointerEvents: "auto",
        overflow: "hidden",
      }}
    >
      {/* Drag Handle (Header) */}
      <div
        onMouseDown={drag.onMouseDown as any}
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "4px 10px 3px", userSelect: "none",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span style={{ fontSize: "9px", opacity: 0.3 }}>drag</span>
        <button
            onClick={() => gai?.quit()}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "rgba(255,100,100,0.6)",
              fontSize: "11px",
              padding: "2px 4px",
              lineHeight: 1,
            }}
            title="Close"
          >
            {"\u2715"}
          </button>
      </div>
      {/* Messages Area */}
      <div style={{ flex: 1, overflow: "auto", padding: "4px 10px" }}>
        <Messages />
      </div>
      {/* Settings Panel */}
      {showSettings.value && (
        <div style={{ padding: "0 10px", maxHeight: "40%", overflow: "auto" }}>
          <Settings />
        </div>
      )}
      {/* Chat Input */}
      <ChatInput />
      {/* Bottom Toolbar */}
      <div style={{ padding: "2px 10px 6px" }}>
        <ToolBar />
      </div>
      {/* Resize Handle */}
      <div
        onMouseDown={resize.onMouseDown as any}
        style={{
          position: "absolute", bottom: "0", right: "0",
          width: "18px", height: "18px",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "10px", opacity: 0.25, userSelect: "none",
        }}
      >
        {"\u27CD"}
      </div>
    </div>
  );
}
render(<App />, document.getElementById("root")!);
