import { create } from "zustand";
import type { OverlayState } from "@/core/algorithms/types";

type AlgorithmState = {
  algorithmId: string;
  startNodeId: string | null;

  steps: OverlayState[];
  stepIndex: number;

  isPlaying: boolean;
  playIntervalMs: number;

  lastError: string | null;
};

type AlgorithmActions = {
  setAlgorithmId: (id: string) => void;
  setStartNodeId: (id: string | null) => void;

  setSteps: (steps: OverlayState[]) => void;
  reset: () => void;

  nextStep: () => void;
  prevStep: () => void;

  setPlaying: (playing: boolean) => void;
  setPlayIntervalMs: (ms: number) => void;

  setError: (message: string | null) => void;
};

const initialState: AlgorithmState = {
  algorithmId: "bfs",
  startNodeId: null,

  steps: [],
  stepIndex: 0,

  isPlaying: false,
  playIntervalMs: 600,

  lastError: null,
};

export const useAlgorithmStore = create<AlgorithmState & AlgorithmActions>(
  (set) => ({
    ...initialState,

    setAlgorithmId: (id) =>
      set({ algorithmId: id, lastError: null, isPlaying: false }),
    setStartNodeId: (id) =>
      set({ startNodeId: id, lastError: null, isPlaying: false }),

    setSteps: (steps) =>
      set({ steps, stepIndex: 0, lastError: null, isPlaying: false }),
    reset: () => set({ ...initialState }),

    nextStep: () =>
      set((s) => ({
        stepIndex: Math.min(s.stepIndex + 1, Math.max(0, s.steps.length - 1)),
      })),
    prevStep: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),

    setPlaying: (playing) => set({ isPlaying: playing }),
    setPlayIntervalMs: (ms) => set({ playIntervalMs: ms }),

    setError: (message) => set({ lastError: message }),
  }),
);

export function selectOverlay(state: AlgorithmState) {
  return state.steps[state.stepIndex] ?? null;
}
