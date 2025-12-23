import { create } from "zustand";
import type { AlgorithmId } from "@/core/algorithms/registry";
import type { OverlayState } from "@/core/algorithms/types";
import { createErrorState, nextErrorState } from "@/stores/errorState";

type AlgorithmState = {
  algorithmId: AlgorithmId;
  sourceNodeId: string | null;
  sinkNodeId: string | null;

  steps: OverlayState[];
  stepIndex: number;

  isPlaying: boolean;
  playIntervalMs: number;

  lastError: string | null;
  errorNonce: number;
};

type AlgorithmActions = {
  setAlgorithmId: (id: AlgorithmId) => void;
  setSourceNodeId: (id: string | null) => void;
  setSinkNodeId: (id: string | null) => void;

  setSteps: (steps: OverlayState[]) => void;
  reset: () => void;
  resetPlayback: () => void;

  nextStep: () => void;
  prevStep: () => void;
  goToLastStep: () => void;

  setPlaying: (isPlaying: boolean) => void;
  setPlayIntervalMs: (ms: number) => void;

  setError: (message: string | null) => void;
};

const initialState: AlgorithmState = {
  algorithmId: "BFS",
  sourceNodeId: null,
  sinkNodeId: null,

  steps: [],
  stepIndex: 0,

  isPlaying: false,
  playIntervalMs: 600,

  ...createErrorState(),
};

export const useAlgorithmStore = create<AlgorithmState & AlgorithmActions>(
  (set) => ({
    ...initialState,

    setAlgorithmId: (id) =>
      set({
        algorithmId: id,
        steps: [],
        stepIndex: 0,
        lastError: null,
        isPlaying: false,
      }),
    setSourceNodeId: (id) =>
      set({ sourceNodeId: id, lastError: null, isPlaying: false }),
    setSinkNodeId: (id) =>
      set({ sinkNodeId: id, lastError: null, isPlaying: false }),

    setSteps: (steps) =>
      set({ steps, stepIndex: 0, lastError: null, isPlaying: false }),
    reset: () => set({ ...initialState }),
    resetPlayback: () =>
      set({ stepIndex: 0, lastError: null, isPlaying: false }),

    nextStep: () =>
      set((s) => ({
        stepIndex: Math.min(s.stepIndex + 1, Math.max(0, s.steps.length - 1)),
      })),
    prevStep: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),
    goToLastStep: () =>
      set((s) => ({ stepIndex: Math.max(0, s.steps.length - 1) })),

    setPlaying: (isPlaying) => set({ isPlaying }),
    setPlayIntervalMs: (ms) => set({ playIntervalMs: ms }),

    setError: (message) => set((s) => nextErrorState(s, message)),
  }),
);

export function selectOverlay(state: AlgorithmState) {
  return state.steps[state.stepIndex] ?? null;
}
