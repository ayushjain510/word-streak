export default function Keyboard({ rows, keyStatus, onKey }) {
  return <div className="keyboard">{rows.map((row, index) => <div className="keyboard-row" key={index}>{row.map((key) => <button type="button" key={key} className={["key", key === "ENTER" || key === "BACKSPACE" ? "wide-key" : "", keyStatus[key] || ""].join(" ")} onClick={() => onKey(key)}>{key === "BACKSPACE" ? "⌫" : key}</button>)}</div>)}</div>;
}
