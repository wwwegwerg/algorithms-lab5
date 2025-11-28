import { useState } from "react";
import { GraphCanvas } from "./components/GraphCanvas";
import { Sidebar } from "./components/Sidebar";
import { Toolbar } from "./components/Toolbar";
import type { Edge, EditMode, Node } from "./types/graph";

function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [mode, setMode] = useState<EditMode>("idle");

  const handleCanvasClick = (x: number, y: number) => {
    if (mode === "add-node") {
      const id = String(nodes.length + 1);
      const newNode: Node = {
        id,
        x,
        y,
        label: "V" + id,
      };
      setNodes((prev) => [...prev, newNode]);
    }
  };

  return (
    <div
      style={{
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Sidebar />
        <div style={{ flex: 1, borderLeft: "1px solid #ddd" }}>
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            mode={mode}
            onCanvasClick={handleCanvasClick}
          />
        </div>
      </div>
      <Toolbar mode={mode} onModeChange={setMode} />
    </div>
  );
}

export default App;
