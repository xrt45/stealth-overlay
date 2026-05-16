import { lastMessages, type Message } from "../state/store";
import { parseMarkdown } from "../utils/markdown";

const sourceIcons: Record<string, string> = {
  voice: "🎤",
  screenshot: "📸",
  manual: "⌨️",
};

function MessageItem({ msg }: { msg: Message }) {
  return (
    <div style={{
      marginBottom: "10px",
      padding: "10px",
      background: "rgba(255,255,255,0.04)",
      borderRadius: "8px",
      borderLeft: "3px solid #7c6fff",
    }}>
      <div style={{ fontSize: "11px", opacity: 0.45, marginBottom: "4px" }}>
        {sourceIcons[msg.source] || "?"}{" "}
        {msg.input.slice(0, 80)}{msg.input.length > 80 ? "..." : ""}
        {" · "}{msg.provider}{" "}{msg.streaming ? "⏳" : "✅"}
      </div>
      <div
        style={{ fontSize: "13px", lineHeight: 1.5 }}
        dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.answer || "Thinking...") }}
      />
    </div>
  );
}

export function Messages() {
  const msgs = lastMessages.value;
  if (msgs.length === 0) {
    return null;
  }
  return (
    <div style={{
      flex: 1,
      overflowY: "auto",
      paddingRight: "4px",
    }}>
      {msgs.map((msg) => <MessageItem key={msg.id} msg={msg} />)}
    </div>
  );
}

