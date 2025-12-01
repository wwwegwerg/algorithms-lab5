import { useEffect, useState } from "react";
import { GraphCanvas } from "@/components/GraphCanvas";
import { Sidebar } from "@/components/Sidebar";
import { snapPointToGrid } from "@/lib/grid";
import type { Edge, EdgeId, EditMode, Node, NodeId } from "@/types/graph";

function App() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [mode, setMode] = useState<EditMode>("idle");
  const [edgeStartNodeId, setEdgeStartNodeId] = useState<NodeId | null>(null);
  const [nextNodeLabelNumber, setNextNodeLabelNumber] = useState(1);

  useEffect(() => {
    console.log("nodes:", nodes);
    console.log("edges", edges);
  }, [nodes, edges]);

  const canAddEdge = (
    from: NodeId,
    to: NodeId,
    isDirected: boolean,
  ): boolean => {
    const pairEdges = edges.filter(
      (edge) =>
        (edge.from === from && edge.to === to) ||
        (edge.from === to && edge.to === from),
    );
    const hasUndirectedEdge = pairEdges.some((edge) => !edge.isDirected);
    const hasDirectedEdge = pairEdges.some((edge) => edge.isDirected);

    if (isDirected) {
      if (hasUndirectedEdge) {
        console.warn("Нельзя смешивать направленные и ненаправленные ребра.");
        return false;
      }
      const sameDirectionExists = pairEdges.some(
        (edge) => edge.isDirected && edge.from === from && edge.to === to,
      );
      if (sameDirectionExists) {
        console.warn("Такое направленное ребро уже существует.");
        return false;
      }
      return true;
    }

    if (hasDirectedEdge) {
      console.warn("Нельзя смешивать направленные и ненаправленные ребра.");
      return false;
    }
    if (hasUndirectedEdge) {
      console.warn("Нельзя добавить два ненаправленных ребра между вершинами.");
      return false;
    }
    return true;
  };

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
    const isAddingEdge = mode === "add-edge" || mode === "add-directed-edge";
    if (!isAddingEdge) return;

    if (!edgeStartNodeId) {
      setEdgeStartNodeId(nodeId);
      return;
    }

    if (edgeStartNodeId === nodeId) {
      setEdgeStartNodeId(null);
      return;
    }

    const isDirected = mode === "add-directed-edge";
    if (!canAddEdge(edgeStartNodeId, nodeId, isDirected)) {
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
    const isAddingEdge =
      nextMode === "add-edge" || nextMode === "add-directed-edge";
    if (!isAddingEdge) {
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
          ? {
              ...edge,
              curvatureOffset: offset,
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
            onNodeDelete={handleNodeDelete}
            onEdgeDelete={handleEdgeDelete}
            onEdgeCurvatureChange={handleEdgeCurvatureChange}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
