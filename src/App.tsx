import { useState } from "react";
import { GraphCanvas } from "@/components/GraphCanvas";
import { Sidebar } from "@/components/Sidebar";
import { validateEdgeConnection } from "@/lib/edges";
import { snapPointToGrid } from "@/lib/grid";
import type { Edge, EdgeId, EditMode, Node, NodeId } from "@/types/graph";

const isEdgeCreationMode = (mode: EditMode) =>
  mode === "add-edge" || mode === "add-directed-edge";

const isDirectedMode = (mode: EditMode) => mode === "add-directed-edge";

function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [mode, setMode] = useState<EditMode>("idle");
  const [edgeStartNodeId, setEdgeStartNodeId] = useState<NodeId | null>(null);
  const [nextNodeLabelNumber, setNextNodeLabelNumber] = useState(1);

  const handleCanvasClick = (x: number, y: number) => {
    if (mode !== "add-node") return;
    const { x: snappedX, y: snappedY } = snapPointToGrid(x, y);
    const id = crypto.randomUUID();
    const labelNumber = nextNodeLabelNumber;
    setNextNodeLabelNumber((prev) => prev + 1);
    const newNode: Node = {
      id,
      x: snappedX,
      y: snappedY,
      label: `V${labelNumber}`,
    };
    setNodes((prev) => [...prev, newNode]);
  };

  const handleNodeClick = (nodeId: NodeId) => {
    if (!isEdgeCreationMode(mode)) return;

    if (!edgeStartNodeId) {
      setEdgeStartNodeId(nodeId);
      return;
    }

    if (edgeStartNodeId === nodeId) {
      const hasSelfLoop = edges.some(
        (edge) => edge.from === nodeId && edge.to === nodeId,
      );
      if (hasSelfLoop) {
        console.warn("У вершины уже есть петля.");
        setEdgeStartNodeId(null);
        return;
      }
      const loopEdge: Edge = {
        id: crypto.randomUUID(),
        from: nodeId,
        to: nodeId,
        isDirected: false,
        curvatureOffset: 0,
      };
      setEdges((prev) => [...prev, loopEdge]);
      setEdgeStartNodeId(null);
      return;
    }

    const isDirected = isDirectedMode(mode);
    const validation = validateEdgeConnection(
      edges,
      edgeStartNodeId,
      nodeId,
      isDirected,
    );
    if (!validation.isValid) {
      if (validation.message) {
        console.warn(validation.message);
      }
      setEdgeStartNodeId(null);
      return;
    }
    const id = crypto.randomUUID();
    const newEdge: Edge = {
      id,
      from: edgeStartNodeId,
      to: nodeId,
      isDirected,
      curvatureOffset: 0,
    };
    setEdges((prev) => [...prev, newEdge]);
    setEdgeStartNodeId(null);
  };

  const handleModeChange = (nextMode: EditMode) => {
    setMode(nextMode);
    if (!isEdgeCreationMode(nextMode)) {
      setEdgeStartNodeId(null);
    }
  };

  const handleNodePositionChange = (nodeId: NodeId, x: number, y: number) => {
    const { x: snappedX, y: snappedY } = snapPointToGrid(x, y);
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              x: snappedX,
              y: snappedY,
            }
          : node,
      ),
    );
  };

  const handleNodeLabelChange = (nodeId: NodeId, label: string) => {
    setNodes((prev) =>
      prev.map((node) =>
        node.id === nodeId
          ? {
              ...node,
              label,
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

  const handleEdgeCurvatureChange = (edgeId: EdgeId, offset: number) => {
    setEdges((prev) =>
      prev.map((edge) =>
        edge.id === edgeId
          ? edge.from === edge.to
            ? edge
            : {
                ...edge,
                curvatureOffset: offset,
              }
          : edge,
      ),
    );
  };

  const handleEdgeWeightChange = (
    edgeId: EdgeId,
    weight: number | undefined,
  ) => {
    setEdges((prev) =>
      prev.map((edge) =>
        edge.id === edgeId
          ? {
              ...edge,
              weight,
            }
          : edge,
      ),
    );
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
            onNodeLabelChange={handleNodeLabelChange}
            onNodeDelete={handleNodeDelete}
            onEdgeDelete={handleEdgeDelete}
            onEdgeCurvatureChange={handleEdgeCurvatureChange}
            onEdgeWeightChange={handleEdgeWeightChange}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
