import * as React from "react";
import { AlertTriangleIcon, InfoIcon } from "lucide-react";
import { BottomToolbar } from "@/components/editor/BottomToolbar";
import { GraphCanvas } from "@/components/editor/GraphCanvas";
import { MatrixDialog } from "@/components/editor/MatrixDialog";
import { OverlayDock } from "@/components/editor/OverlayDock";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { getAlgorithm } from "@/core/algorithms/registry";
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
  const graphErrorNonce = useGraphStore((s) => s.errorNonce);

  const setMode = useGraphStore((s) => s.setMode);
  const clearSelection = useGraphStore((s) => s.clearSelection);
  const selectNode = useGraphStore((s) => s.selectNode);
  const selectEdge = useGraphStore((s) => s.selectEdge);
  const applyBoxSelection = useGraphStore((s) => s.applyBoxSelection);

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
  const clearPersistedGraph = useGraphStore((s) => s.clearPersistedGraph);

  const algorithmId = useAlgorithmStore((s) => s.algorithmId);
  const startNodeId = useAlgorithmStore((s) => s.startNodeId);
  const steps = useAlgorithmStore((s) => s.steps);
  const stepIndex = useAlgorithmStore((s) => s.stepIndex);
  const isPlaying = useAlgorithmStore((s) => s.isPlaying);
  const playIntervalMs = useAlgorithmStore((s) => s.playIntervalMs);
  const lastAlgoError = useAlgorithmStore((s) => s.lastError);
  const algoErrorNonce = useAlgorithmStore((s) => s.errorNonce);

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
    selection.focus?.kind === "node"
      ? (nodes.find((n) => n.id === selection.focus?.id) ?? null)
      : null;
  const selectedEdge =
    selection.focus?.kind === "edge"
      ? (edges.find((e) => e.id === selection.focus?.id) ?? null)
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
  const messageKey = lastGraphError
    ? `graph:${graphErrorNonce}`
    : lastAlgoError
      ? `algo:${algoErrorNonce}`
      : overlay?.message
        ? `overlay:${stepIndex}`
        : null;

  const isError = lastGraphError !== null || lastAlgoError !== null;
  const messageTitle = lastGraphError
    ? "Ошибка графа"
    : lastAlgoError
      ? "Ошибка алгоритма"
      : "Сообщение";

  const [toast, setToast] = React.useState<{
    key: string;
    title: string;
    message: string;
    isError: boolean;
  } | null>(null);
  const [isToastOpen, setIsToastOpen] = React.useState(false);

  React.useEffect(() => {
    const EXIT_MS = 200;

    if (!message || !messageKey) {
      setIsToastOpen(false);
      const id = window.setTimeout(() => setToast(null), EXIT_MS);
      return () => window.clearTimeout(id);
    }

    setToast({
      key: messageKey,
      title: messageTitle,
      message,
      isError,
    });

    setIsToastOpen(true);

    const hideId = window.setTimeout(() => setIsToastOpen(false), 4000);
    const unmountId = window.setTimeout(() => setToast(null), 4000 + EXIT_MS);

    return () => {
      window.clearTimeout(hideId);
      window.clearTimeout(unmountId);
    };
  }, [isError, message, messageKey, messageTitle]);

  return (
    <div className="relative h-dvh w-dvw overflow-hidden">
      <GraphCanvas
        nodes={nodes}
        edges={edges}
        selection={selection}
        mode={mode}
        edgeDraftSourceId={edgeDraftSourceId}
        overlay={overlay}
        onBackgroundClick={(p, additive) => {
          if (mode === "add_node") {
            addNodeAt(p.x, p.y);
            return;
          }

          if (mode === "select") {
            if (!additive) clearSelection();
            return;
          }

          if (mode === "add_edge") {
            cancelEdgeDraft();
          }
        }}
        onNodeClick={(id, additive) => {
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

          selectNode(id, additive);
          if (!startNodeId) setStartNodeId(id);
        }}
        onEdgeClick={(id, additive) => {
          if (mode === "delete") {
            deleteEdge(id);
            setPlaying(false);
            setSteps([]);
            return;
          }

          selectEdge(id, additive);
        }}
        onNodeDrag={(id, x, y) => {
          updateNode(id, { x, y });
        }}
        onBoxSelect={applyBoxSelection}
        onCancelEdgeDraft={() => cancelEdgeDraft()}
      />

      {toast && (
        <div className="pointer-events-none fixed inset-y-0 left-3 z-50 flex items-center">
          <div className="pointer-events-auto w-[360px] max-w-[calc(100vw-24px)]">
            <div
              key={toast.key}
              data-state={isToastOpen ? "open" : "closed"}
              className="duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-left-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-2 motion-reduce:animate-none"
            >
              <Alert
                variant={toast.isError ? "destructive" : "default"}
                className="shadow-lg ring-1 ring-foreground/10"
              >
                {toast.isError ? <AlertTriangleIcon /> : <InfoIcon />}
                <AlertTitle>{toast.title}</AlertTitle>
                <AlertDescription>{toast.message}</AlertDescription>
              </Alert>
            </div>
          </div>
        </div>
      )}

      <MatrixDialog
        open={bottomPanel !== "none"}
        kind={bottomPanel}
        nodes={nodes}
        edges={edges}
        unweightedSymbol={matrixUnweightedSymbol}
        onChangeUnweightedSymbol={setMatrixUnweightedSymbol}
        onClose={() => setBottomPanel("none")}
      />

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
        onClearPersistedGraph={() => {
          clearPersistedGraph();
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
        selection={selection}
        selectedNode={selectedNode}
        selectedEdge={selectedEdge}
        onUpdateNode={updateNode}
        onUpdateEdge={updateEdge}
      />
    </div>
  );
}
