import * as React from "react";
import { useShallow } from "zustand/shallow";
import { useAlgorithmStore } from "@/stores/algorithmStore";
import { useGraphUiStore } from "@/stores/graphUiStore";

export function AlgorithmRunner() {
  const activeToolbar = useGraphUiStore((s) => s.activeToolbar);

  const {
    isPlaying,
    playIntervalMs,
    stepIndex,
    stepsLength,
    nextStep,
    setPlaying,
  } = useAlgorithmStore(
    useShallow((s) => ({
      isPlaying: s.isPlaying,
      playIntervalMs: s.playIntervalMs,
      stepIndex: s.stepIndex,
      stepsLength: s.steps.length,
      nextStep: s.nextStep,
      setPlaying: s.setPlaying,
    })),
  );

  React.useEffect(() => {
    if (activeToolbar !== "algorithms") {
      if (isPlaying) setPlaying(false);
      return;
    }
  }, [activeToolbar, isPlaying, setPlaying]);

  React.useEffect(() => {
    if (activeToolbar !== "algorithms") return;
    if (!isPlaying) return;
    if (stepsLength === 0) return;

    if (stepIndex >= stepsLength - 1) {
      setPlaying(false);
      return;
    }

    const id = window.setTimeout(
      () => {
        nextStep();
      },
      Math.max(0, playIntervalMs),
    );

    return () => window.clearTimeout(id);
  }, [
    activeToolbar,
    isPlaying,
    nextStep,
    playIntervalMs,
    setPlaying,
    stepIndex,
    stepsLength,
  ]);

  return null;
}
