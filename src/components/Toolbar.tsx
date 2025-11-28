import type { EditMode } from "../types/graph";

type ToolbarProps = {
  mode: EditMode;
  onModeChange: (mode: EditMode) => void;
};

export function Toolbar({ mode, onModeChange }: ToolbarProps) {
  const makeButton = (btnMode: EditMode, label: string) => {
    const isActive = mode === btnMode;
    return (
      <button
        key={btnMode}
        onClick={() => onModeChange(btnMode)}
        style={{
          marginRight: "8px",
          padding: "6px 12px",
          backgroundColor: isActive ? "#1976d2" : "#eee",
          color: isActive ? "white" : "black",
          border: "1px solid #ccc",
          borderRadius: "4px",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      style={{
        height: "56px",
        borderTop: "1px solid #ddd",
        display: "flex",
        alignItems: "center",
        padding: "0 12px",
      }}
    >
      {makeButton("idle", "Выбор")}
      {makeButton("add-node", "Добавить вершину")}
      {makeButton("add-edge", "Добавить ребро")}
      {makeButton("delete", "Удаление")}

      <div style={{ marginLeft: "auto", fontSize: "12px", color: "#666" }}>
        Текущий режим: {mode}
      </div>
    </div>
  );
}
