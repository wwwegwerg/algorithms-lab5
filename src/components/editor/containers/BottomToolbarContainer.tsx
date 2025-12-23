import * as React from "react";
import { useShallow } from "zustand/shallow";
import { BottomToolbar } from "@/components/editor/BottomToolbar";
import { algorithms, getAlgorithm } from "@/core/algorithms/registry";
import type { AlgorithmContext } from "@/core/algorithms/types";
import { downloadTextFile, readTextFile } from "@/core/io/download";
import { loadGraphSnapshot, makeGraphSnapshot } from "@/core/io/graphFile";
import { useAlgorithmStore } from "@/stores/algorithmStore";
import { useGraphDataStore } from "@/stores/graphDataStore";
import { useGraphUiStore } from "@/stores/graphUiStore";

export function BottomToolbarContainer() {
  const {
    activeToolbar,
    showGraphToolbar,
    showAlgorithmToolbar,
    mode,
    setMode,
    isNewEdgeDirected,
    setNewEdgeDirected,
    matrixDialogKind,
    setMatrixDialogKind,
  } = useGraphUiStore(
    useShallow((s) => ({
      activeToolbar: s.activeToolbar,
      showGraphToolbar: s.showGraphToolbar,
      showAlgorithmToolbar: s.showAlgorithmToolbar,
      mode: s.interaction.mode,
      setMode: s.setMode,
      isNewEdgeDirected: s.isNewEdgeDirected,
      setNewEdgeDirected: s.setNewEdgeDirected,
      matrixDialogKind: s.matrixDialogKind,
      setMatrixDialogKind: s.setMatrixDialogKind,
    })),
  );

  const { nodes, edges, setError, clearError } = useGraphDataStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      setError: s.setError,
      clearError: s.clearError,
    })),
  );

  const {
    algorithmId,
    startNodeId,
    playIntervalMs,
    isPlaying,
    steps,
    stepIndex,
    setAlgorithmId,
    setStartNodeId,
    setPlayIntervalMs,
    setPlaying,
    setSteps,
    prevStep,
    nextStep,
    resetPlayback,
  } = useAlgorithmStore(
    useShallow((s) => ({
      algorithmId: s.algorithmId,
      startNodeId: s.startNodeId,
      playIntervalMs: s.playIntervalMs,
      isPlaying: s.isPlaying,
      steps: s.steps,
      stepIndex: s.stepIndex,
      setAlgorithmId: s.setAlgorithmId,
      setStartNodeId: s.setStartNodeId,
      setPlayIntervalMs: s.setPlayIntervalMs,
      setPlaying: s.setPlaying,
      setSteps: s.setSteps,
      prevStep: s.prevStep,
      nextStep: s.nextStep,
      resetPlayback: s.resetPlayback,
    })),
  );

  const algorithmOptions = React.useMemo(() => {
    return algorithms.map((a) => ({ id: a.id, label: a.label }));
  }, []);

  const onSaveJson = React.useCallback(() => {
    const snapshot = makeGraphSnapshot(nodes, edges);
    downloadTextFile(
      "graph.json",
      JSON.stringify(snapshot, null, 2),
      "application/json",
    );
  }, [edges, nodes]);

  const onLoadJson = React.useCallback(
    async (file: File) => {
      let raw: unknown;
      try {
        const text = await readTextFile(file);
        raw = JSON.parse(text) as unknown;
      } catch {
        setError("Некорректный JSON");
        return;
      }

      const loaded = loadGraphSnapshot(raw);
      if (!loaded.ok) {
        setError(loaded.message);
        return;
      }

      useGraphDataStore
        .getState()
        .setGraph(loaded.graph.nodes, loaded.graph.edges);
      useGraphUiStore.getState().resetInteraction();
      clearError();
    },
    [clearError, setError],
  );

  const onClearPersistedGraph = React.useCallback(() => {
    useGraphDataStore.getState().clearPersistedGraph();
    useGraphUiStore.getState().resetUi();
  }, []);

  const onTogglePlaying = React.useCallback(() => {
    if (steps.length === 0) {
      setError("Сначала нажмите Run");
      return;
    }

    setPlaying(!isPlaying);
  }, [isPlaying, setError, setPlaying, steps.length]);

  const onPrevStep = React.useCallback(() => {
    if (isPlaying) setPlaying(false);
    prevStep();
  }, [isPlaying, prevStep, setPlaying]);

  const onNextStep = React.useCallback(() => {
    if (isPlaying) setPlaying(false);
    nextStep();
  }, [isPlaying, nextStep, setPlaying]);

  const onResetSteps = React.useCallback(() => {
    if (isPlaying) setPlaying(false);
    resetPlayback();
  }, [isPlaying, resetPlayback, setPlaying]);

  const onRunAlgorithm = React.useCallback(() => {
    const algorithm = getAlgorithm(algorithmId);
    if (!algorithm) {
      setError("Неизвестный алгоритм");
      return;
    }

    if (!startNodeId) {
      setError("Выберите стартовую вершину");
      return;
    }

    const ctx: AlgorithmContext = {
      nodes,
      edges,
      startNodeId,
    };

    const supported = algorithm.supports(ctx);
    if (!supported.ok) {
      setError(supported.message);
      return;
    }

    const nextSteps = algorithm.run(ctx);
    if (nextSteps.length === 0) {
      setError("Алгоритм не вернул шаги");
      return;
    }

    clearError();
    setSteps(nextSteps);
  }, [algorithmId, clearError, edges, nodes, setError, setSteps, startNodeId]);

  const onToggleMatrixDialogOpen = React.useCallback(() => {
    setMatrixDialogKind(matrixDialogKind === "none" ? "adjacency" : "none");
  }, [matrixDialogKind, setMatrixDialogKind]);

  return (
    <BottomToolbar
      activeToolbar={activeToolbar}
      graph={{
        mode,
        onChangeMode: setMode,
        isNewEdgeDirected,

        onChangeNewEdgeDirected: setNewEdgeDirected,
        matrixDialogKind,
        onToggleMatrixDialogOpen,
        onSaveJson,
        onLoadJson,
        onClearPersistedGraph,
        onShowAlgorithmToolbar: showAlgorithmToolbar,
      }}
      algorithms={{
        onShowGraphToolbar: showGraphToolbar,
        algorithmOptions,
        algorithmId,
        onChangeAlgorithmId: setAlgorithmId,
        nodes,
        startNodeId,
        onChangeStartNodeId: setStartNodeId,
        playIntervalMs,
        onChangePlayIntervalMs: setPlayIntervalMs,
        isPlaying,
        onTogglePlaying,
        stepsLength: steps.length,
        stepIndex,
        onPrevStep,
        onNextStep,
        onResetSteps,
        onRunAlgorithm,
      }}
    />
  );
}
