import { useEffect, useState } from "react";
import { GraphCanvas } from "@/components/GraphCanvas";
import { Sidebar } from "@/components/Sidebar";
import type { Edge, EdgeId, EditMode, Node, NodeId } from "@/types/graph";

function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [mode, setMode] = useState<EditMode>("idle");
  const [edgeStartNodeId, setEdgeStartNodeId] = useState<NodeId | null>(null);

  useEffect(() => {
    console.log("nodes:", nodes);
    console.log("edges", edges);
  }, [nodes, edges]);

  const handleCanvasClick = (x: number, y: number) => {
    if (mode !== "add-node") return;
    const id = `${nodes.length + 1}`;
    const newNode: Node = {
      id,
      x,
      y,
      label: "V" + id,
    };
    setNodes((prev) => [...prev, newNode]);
  };

  const handleNodeClick = (nodeId: NodeId) => {
    if (mode !== "add-edge") return;

    if (!edgeStartNodeId) {
      setEdgeStartNodeId(nodeId);
      return;
    }

    if (edgeStartNodeId === nodeId) {
      setEdgeStartNodeId(null);
      return;
    }

    const id = `${edges.length + 1}`;
    const newEdge: Edge = {
      id,
      from: edgeStartNodeId,
      to: nodeId,
    };
    setEdges((prev) => [...prev, newEdge]);
    setEdgeStartNodeId(null);
  };

  const handleModeChange = (nextMode: EditMode) => {
    setMode(nextMode);
    if (nextMode !== "add-edge") {
      setEdgeStartNodeId(null);
    }
  };

  const handleNodePositionChange = (nodeId: NodeId, x: number, y: number) => {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              x,
              y,
            }
          : node,
      ),
    );
  };

  const handleNodeDelete = (nodeId: NodeId) => {
    setNodes((prev) => prev.filter((node) => node.id !== nodeId));
    setEdges((prev) =>
      prev.filter((edge) => edge.from !== nodeId && edge.to !== nodeId),
    );
    if (edgeStartNodeId === nodeId) {
      setEdgeStartNodeId(null);
    }
  };

  const handleEdgeDelete = (edgeId: EdgeId) => {
    setEdges((prev) => prev.filter((edge) => edge.id !== edgeId));
  };

  return (
    <div className="flex h-screen w-screen flex-col">
      <div className="flex min-h-0 flex-1">
        <Sidebar />

        <div className="flex-1 border-l border-gray-300">
          <GraphCanvas
            nodes={nodes}
            edges={edges}
            mode={mode}
            onCanvasClick={handleCanvasClick}
            onModeChange={handleModeChange}
            onNodeClick={handleNodeClick}
            edgeStartNodeId={edgeStartNodeId}
            onNodePositionChange={handleNodePositionChange}
            onNodeDelete={handleNodeDelete}
            onEdgeDelete={handleEdgeDelete}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
