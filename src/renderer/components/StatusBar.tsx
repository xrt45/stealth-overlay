import { activeProvider, overlayOpacity } from "../state/store";
export function StatusBar() {
  return (
    <div style={{
      display: "flex", justifyContent: "center",
      fontSize: "9px", opacity: 0.3, marginTop: "4px",
    }}>
      <span>{"\u{1F47B}"} Ghost AI {"\u00B7"} {activeProvider.value} {"\u00B7"} {overlayOpacity.value}%</span>
    </div>
  );
}
