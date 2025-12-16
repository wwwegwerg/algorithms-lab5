import * as React from "react";
import { BottomToolbar } from "@/components/editor/BottomToolbar";
import { GraphCanvas } from "@/components/editor/GraphCanvas";
import { MatrixPanel } from "@/components/editor/MatrixPanel";
import { OverlayDock } from "@/components/editor/OverlayDock";
import { getAlgorithm } from "@/core/algorithms/registry";
import {
  buildAdjacencyMatrix,
  buildIncidenceMatrix,
  matrixToCsv,
} from "@/core/graph/matrices";
import { downloadTextFile, readTextFile } from "@/core/io/download";
import { loadGraphSnapshot, makeGraphSnapshot } from "@/core/io/graphFile";
import { selectOverlay, useAlgorithmStore } from "@/store/algorithmStore";
import { useGraphStore } from "@/store/graphStore";

export function GraphEditor() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);

  const mode = useGraphStore((s) => s.interaction.mode);
  const selection = useGraphStore((s) => s.interaction.selection);

  const edgeDraftSourceId = useGraphStore(
    (s) => s.interaction.edgeDraft?.sourceId ?? null,
  );
  const newEdgeDirected = useGraphStore((s) => s.newEdgeDirected);

  const bottomPanel = useGraphStore((s) => s.bottomPanel);
  const matrixUnweightedSymbol = useGraphStore((s) => s.matrixUnweightedSymbol);

  const lastGraphError = useGraphStore((s) => s.lastError);

  const setMode = useGraphStore((s) => s.setMode);
  const setSelection = useGraphStore((s) => s.setSelection);

  const addNodeAt = useGraphStore((s) => s.addNodeAt);
  const updateNode = useGraphStore((s) => s.updateNode);
  const deleteNode = useGraphStore((s) => s.deleteNode);

  const startEdgeFrom = useGraphStore((s) => s.startEdgeFrom);
  const cancelEdgeDraft = useGraphStore((s) => s.cancelEdgeDraft);
  const setNewEdgeDirected = useGraphStore((s) => s.setNewEdgeDirected);
  const addEdgeTo = useGraphStore((s) => s.addEdgeTo);

  const updateEdge = useGraphStore((s) => s.updateEdge);
  const deleteEdge = useGraphStore((s) => s.deleteEdge);
  const deleteSelection = useGraphStore((s) => s.deleteSelection);

  const setBottomPanel = useGraphStore((s) => s.setBottomPanel);
  const setMatrixUnweightedSymbol = useGraphStore(
    (s) => s.setMatrixUnweightedSymbol,
  );
  const setGraph = useGraphStore((s) => s.setGraph);

  const algorithmId = useAlgorithmStore((s) => s.algorithmId);
  const startNodeId = useAlgorithmStore((s) => s.startNodeId);
  const steps = useAlgorithmStore((s) => s.steps);
  const stepIndex = useAlgorithmStore((s) => s.stepIndex);
  const isPlaying = useAlgorithmStore((s) => s.isPlaying);
  const playIntervalMs = useAlgorithmStore((s) => s.playIntervalMs);
  const lastAlgoError = useAlgorithmStore((s) => s.lastError);

  const setAlgorithmId = useAlgorithmStore((s) => s.setAlgorithmId);
  const setStartNodeId = useAlgorithmStore((s) => s.setStartNodeId);
  const setSteps = useAlgorithmStore((s) => s.setSteps);
  const nextStep = useAlgorithmStore((s) => s.nextStep);
  const prevStep = useAlgorithmStore((s) => s.prevStep);
  const setPlaying = useAlgorithmStore((s) => s.setPlaying);
  const setPlayIntervalMs = useAlgorithmStore((s) => s.setPlayIntervalMs);
  const setAlgoError = useAlgorithmStore((s) => s.setError);

  const overlay = useAlgorithmStore(selectOverlay);

  const selectedNode =
    selection?.kind === "node"
      ? (nodes.find((n) => n.id === selection.id) ?? null)
      : null;
  const selectedEdge =
    selection?.kind === "edge"
      ? (edges.find((e) => e.id === selection.id) ?? null)
      : null;

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Backspace" && e.key !== "Delete") return;

      const target = e.target;
      const isEditable =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (isEditable) return;
      deleteSelection();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [deleteSelection]);

  React.useEffect(() => {
    if (!isPlaying) return;
    if (steps.length === 0) return;

    const id = window.setInterval(
      () => {
        const last = steps.length - 1;
        if (stepIndex >= last) {
          setPlaying(false);
          return;
        }
        nextStep();
      },
      Math.max(80, playIntervalMs),
    );

    return () => window.clearInterval(id);
  }, [
    isPlaying,
    nextStep,
    playIntervalMs,
    setPlaying,
    stepIndex,
    steps.length,
  ]);

  const message = lastGraphError ?? lastAlgoError ?? overlay?.message ?? null;

  return (
    <div className="relative h-dvh w-dvw overflow-hidden">
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        selection={selection}
        mode={mode}
        edgeDraftSourceId={edgeDraftSourceId}
        overlay={overlay}
        onBackgroundClick={(p) => {
          if (mode === "add_node") {
            addNodeAt(p.x, p.y);
            return;
          }

          if (mode === "select") {
            setSelection(null);
            return;
          }

          if (mode === "add_edge") {
            cancelEdgeDraft();
          }
        }}
        onNodeClick={(id) => {
          if (mode === "delete") {
            deleteNode(id);
            setPlaying(false);
            setSteps([]);
            return;
          }

          if (mode === "add_edge") {
            if (!edgeDraftSourceId) {
              startEdgeFrom(id);
              return;
            }

            addEdgeTo(id);
            setPlaying(false);
            setSteps([]);
            return;
          }

          setSelection({ kind: "node", id });
          if (!startNodeId) setStartNodeId(id);
        }}
        onEdgeClick={(id) => {
          if (mode === "delete") {
            deleteEdge(id);
            setPlaying(false);
            setSteps([]);
            return;
          }

          setSelection({ kind: "edge", id });
        }}
        onNodeDrag={(id, x, y) => {
          updateNode(id, { x, y });
        }}
        onCancelEdgeDraft={() => cancelEdgeDraft()}
      />

      {bottomPanel !== "none" && (
        <div className="pointer-events-auto absolute inset-x-3 top-3 bottom-20">
          {bottomPanel === "adjacency" ? (
            <MatrixPanel
              title="Матрица смежности"
              table={buildAdjacencyMatrix(nodes, edges, matrixUnweightedSymbol)}
              onExportCsv={() => {
                const table = buildAdjacencyMatrix(
                  nodes,
                  edges,
                  matrixUnweightedSymbol,
                );
                downloadTextFile(
                  "adjacency.csv",
                  matrixToCsv(table),
                  "text/csv",
                );
              }}
              unweightedSymbol={matrixUnweightedSymbol}
              onChangeUnweightedSymbol={setMatrixUnweightedSymbol}
            />
          ) : (
            <MatrixPanel
              title="Матрица инцидентности"
              table={buildIncidenceMatrix(nodes, edges)}
              onExportCsv={() => {
                const table = buildIncidenceMatrix(nodes, edges);
                downloadTextFile(
                  "incidence.csv",
                  matrixToCsv(table),
                  "text/csv",
                );
              }}
            />
          )}
        </div>
      )}

      <OverlayDock
        mode={mode}
        selection={selection}
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        nodesCount={nodes.length}
        edgesCount={edges.length}
      />

      <BottomToolbar
        mode={mode}
        onChangeMode={(m) => {
          setMode(m);
        }}
        newEdgeDirected={newEdgeDirected}
        onChangeNewEdgeDirected={setNewEdgeDirected}
        bottomPanel={bottomPanel}
        onTogglePanel={(panel) =>
          setBottomPanel(bottomPanel === panel ? "none" : panel)
        }
        onSaveJson={() => {
          const snapshot = makeGraphSnapshot(nodes, edges);
          downloadTextFile(
            "graph.json",
            JSON.stringify(snapshot, null, 2),
            "application/json",
          );
        }}
        onLoadJson={async (file) => {
          const text = await readTextFile(file);
          const raw = JSON.parse(text) as unknown;
          const loaded = loadGraphSnapshot(raw);
          if (!loaded.ok) {
            setAlgoError(loaded.message);
            return;
          }
          setGraph(loaded.graph.nodes, loaded.graph.edges);
          setSteps([]);
          setPlaying(false);
          setAlgoError(null);
        }}
        nodes={nodes}
        algorithmId={algorithmId}
        onChangeAlgorithmId={(id) => {
          setAlgorithmId(id);
          setSteps([]);
          setPlaying(false);
        }}
        startNodeId={startNodeId}
        onChangeStartNodeId={setStartNodeId}
        canRun={nodes.length > 0 && startNodeId !== null}
        onRun={() => {
          const algorithm = getAlgorithm(algorithmId);
          if (!algorithm) return;
          if (!startNodeId) {
            setAlgoError("Выберите стартовую вершину");
            return;
          }

          const support = algorithm.supports({ nodes, edges, startNodeId });
          if (!support.ok) {
            setAlgoError(support.message);
            return;
          }

          const next = algorithm.run({ nodes, edges, startNodeId });
          setSteps(next);
          setPlaying(false);
          setAlgoError(null);
        }}
        isPlaying={isPlaying}
        onTogglePlay={() => setPlaying(!isPlaying)}
        onPrev={prevStep}
        onNext={nextStep}
        playIntervalMs={playIntervalMs}
        onChangePlayIntervalMs={setPlayIntervalMs}
        message={message}
        selection={selection}
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        onUpdateNode={updateNode}
        onUpdateEdge={updateEdge}
      />
    </div>
  );
}
