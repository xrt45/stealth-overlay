import { render } from "preact";
import { useRef } from "preact/hooks";
import { Messages } from "./components/Messages";
import { Settings } from "./components/Settings";
import { StatusBar } from "./components/StatusBar";
import { ToolBar } from "./components/ToolBar";
import {
  overlayOpacity, isPrivate, showSettings,
  addMessage, appendToMessage, finishMessage,
  isListeningVoice, primaryLanguage, languages, streamingMessageId,
  panelX, panelY, panelW, panelH,
} from "./state/store";
import { startListening, stopListening } from "./hooks/useAudio";
const gai = (window as any).ghostAI;
if (gai) {
  gai.on("overlay:opacity", (val: number) => { overlayOpacity.value = val; });
  gai.on("overlay:private-mode", (val: boolean) => { isPrivate.value = val; });
  gai.on("action:toggle-settings", () => { showSettings.value = !showSettings.value; });
  gai.on("action:close-settings", () => { showSettings.value = false; });
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
      if (result) finishMessage(msgId, result.provider);
    } catch { finishMessage(msgId, "error"); }
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
  const onSend = async () => {
    const text = inputRef.current?.value?.trim();
    if (!text) return;
    inputRef.current!.value = "";
    const msgId = addMessage("manual", text);
    try {
      const result = await gai?.askAI(text);
      if (result) finishMessage(msgId, result.provider);
    } catch { finishMessage(msgId, "error"); }
  };
  return (
    <div style={{ display: "flex", gap: "6px", padding: "4px 14px 2px" }}>
      <input
        ref={inputRef}
        placeholder="Ask AI anything..."
        onKeyDown={(e: any) => { if (e.key === "Enter") onSend(); }}
        style={{
          flex: 1, padding: "7px 10px", fontSize: "12px",
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "6px", color: "#eee", outline: "none",
        }}
      />
      <button
        onClick={onSend}
        style={{
          padding: "6px 12px", fontSize: "12px", fontWeight: 600,
          background: "rgba(124,111,255,0.3)",
          border: "1px solid rgba(124,111,255,0.5)",
          borderRadius: "6px", color: "#fff", cursor: "pointer",
        }}
      >
        Send
      </button>
    </div>
  );
}

function App() {
  const drag = useDrag();
  const resize = useResize();
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
        color: "#e0e0e0",
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
          padding: "10px 14px 6px", cursor: "grab", userSelect: "none",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        <span style={{ color: "#7c6fff", fontWeight: "bold", fontSize: "14px" }}>
          {"\u{1F47B}"} Ghost AI
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "9px", opacity: 0.3 }}>drag to move</span>
          <button
            onClick={() => gai?.quit()}
            style={{
              background: "rgba(255,80,80,0.15)",
              border: "1px solid rgba(255,80,80,0.3)",
              borderRadius: "50%",
              width: "20px",
              height: "20px",
              cursor: "pointer",
              color: "rgba(255,100,100,0.8)",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 0,
              lineHeight: 1,
            }}
            title="Close Ghost AI"
          >
            {"\u2715"}
          </button>
        </div>
      </div>
      {/* Messages Area */}
      <div style={{ flex: 1, overflow: "auto", padding: "8px 14px" }}>
        <Messages />
      </div>
      {/* Settings Panel */}
      {showSettings.value && (
        <div style={{ padding: "0 14px", maxHeight: "40%", overflow: "auto" }}>
          <Settings />
        </div>
      )}
      {/* Chat Input */}
      <ChatInput />
      {/* Bottom Toolbar */}
      <div style={{ padding: "4px 14px 10px" }}>
        <ToolBar />
        <StatusBar />
      </div>
      {/* Resize Handle */}
      <div
        onMouseDown={resize.onMouseDown as any}
        style={{
          position: "absolute", bottom: "0", right: "0",
          width: "18px", height: "18px",
          cursor: "nwse-resize",
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
