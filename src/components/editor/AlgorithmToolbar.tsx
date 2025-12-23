import * as React from "react";
import {
  ArrowLeftFromLine,
  FastForward,
  Pause,
  Play,
  Rewind,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
} from "@/components/ui/input-group";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import type { GraphNode } from "@/core/graph/types";

type AlgorithmOption = { id: string; label: string };

export type AlgorithmToolbarProps = {
  onShowGraphToolbar: () => void;

  algorithmOptions: AlgorithmOption[];
  algorithmId: string;
  onChangeAlgorithmId: (id: string) => void;

  nodes: readonly GraphNode[];
  sourceNodeId: string | null;
  onChangeSourceNodeId: (id: string | null) => void;
  sinkNodeId: string | null;
  onChangeSinkNodeId: (id: string | null) => void;

  playIntervalMs: number;
  onChangePlayIntervalMs: (ms: number) => void;

  isPlaying: boolean;
  onTogglePlaying: () => void;

  stepsLength: number;
  stepIndex: number;
  onPrevStep: () => void;
  onNextStep: () => void;
  onResetSteps: () => void;
  onLastStep: () => void;
  onRunAlgorithm: () => void;
};

export function AlgorithmToolbar({
  onShowGraphToolbar,
  algorithmOptions,
  algorithmId,
  onChangeAlgorithmId,
  nodes,
  sourceNodeId,
  onChangeSourceNodeId,
  sinkNodeId,
  onChangeSinkNodeId,
  playIntervalMs,
  onChangePlayIntervalMs,
  isPlaying,
  onTogglePlaying,
  stepsLength,
  stepIndex,
  onPrevStep,
  onNextStep,
  onResetSteps,
  onLastStep,
  onRunAlgorithm,
}: AlgorithmToolbarProps) {
  const selectedAlgorithmLabel =
    algorithmOptions.find((opt) => opt.id === algorithmId)?.label ?? null;

  const isMaxFlow = algorithmId === "MAX_FLOW_FF";

  const selectedSourceNode = sourceNodeId
    ? (nodes.find((n) => n.id === sourceNodeId) ?? null)
    : null;

  const selectedSourceNodeLabel = selectedSourceNode
    ? selectedSourceNode.label || selectedSourceNode.id
    : null;

  const selectedSinkNode = sinkNodeId
    ? (nodes.find((n) => n.id === sinkNodeId) ?? null)
    : null;

  const selectedSinkNodeLabel = selectedSinkNode
    ? selectedSinkNode.label || selectedSinkNode.id
    : null;

  React.useEffect(() => {
    if (!sourceNodeId) return;

    const isPresent = nodes.some((n) => n.id === sourceNodeId);
    if (!isPresent) onChangeSourceNodeId(null);
  }, [nodes, onChangeSourceNodeId, sourceNodeId]);

  React.useEffect(() => {
    if (!sinkNodeId) return;

    const isPresent = nodes.some((n) => n.id === sinkNodeId);
    if (!isPresent) onChangeSinkNodeId(null);
  }, [nodes, onChangeSinkNodeId, sinkNodeId]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 p-3">
      <Button
        size="sm"
        variant="outline"
        onClick={onShowGraphToolbar}
        aria-label="Switch to graph toolbar"
        title="Switch to graph toolbar"
      >
        <ArrowLeftFromLine />
        Graph
      </Button>

      <div className="flex items-center gap-2">
        <Select
          value={algorithmId}
          onValueChange={(value) => {
            if (typeof value !== "string") return;
            onChangeAlgorithmId(value);
          }}
        >
          <SelectTrigger size="sm" aria-label="Algorithm">
            {selectedAlgorithmLabel ? (
              <span>{selectedAlgorithmLabel}</span>
            ) : (
              <span className="text-muted-foreground">Algorithm</span>
            )}
          </SelectTrigger>
          <SelectContent className="w-max min-w-56">
            <SelectGroup>
              {algorithmOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        <Select
          value={sourceNodeId ?? ""}
          onValueChange={(value) => {
            const next = typeof value === "string" ? value : "";
            onChangeSourceNodeId(next.length === 0 ? null : next);
          }}
        >
          <SelectTrigger size="sm" aria-label="Source">
            {selectedSourceNodeLabel ? (
              <span>{selectedSourceNodeLabel}</span>
            ) : (
              <span className="text-muted-foreground">Source</span>
            )}
          </SelectTrigger>
          <SelectContent className="w-max min-w-44">
            <SelectGroup>
              {nodes.map((n) => (
                <SelectItem key={n.id} value={n.id}>
                  {n.label || n.id}
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>

        {isMaxFlow && (
          <Select
            value={sinkNodeId ?? ""}
            onValueChange={(value) => {
              const next = typeof value === "string" ? value : "";
              onChangeSinkNodeId(next.length === 0 ? null : next);
            }}
          >
            <SelectTrigger size="sm" aria-label="Sink">
              {selectedSinkNodeLabel ? (
                <span>{selectedSinkNodeLabel}</span>
              ) : (
                <span className="text-muted-foreground">Sink</span>
              )}
            </SelectTrigger>
            <SelectContent className="w-max min-w-44">
              <SelectGroup>
                {nodes.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.label || n.id}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={onRunAlgorithm}
          title="Run algorithm"
        >
          Run
        </Button>
      </div>

      <InputGroup className="h-8 w-fit">
        <InputGroupInput
          type="number"
          inputMode="numeric"
          min={0}
          step={20}
          max={2000}
          value={String(playIntervalMs)}
          onChange={(e) => {
            const raw = e.target.value;
            const next = raw === "" ? 0 : Number(raw);
            if (!Number.isFinite(next)) return;
            onChangePlayIntervalMs(Math.min(2000, Math.max(0, next)));
          }}
          className="h-8 w-24 flex-none text-sm"
          aria-label="Animation delay in milliseconds"
        />
        <InputGroupAddon align="inline-end">
          <InputGroupText>ms</InputGroupText>
        </InputGroupAddon>
      </InputGroup>

      <div className="flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="outline"
          onClick={onResetSteps}
          disabled={stepsLength === 0}
          aria-label="First step"
          title="Go to first step"
        >
          <Rewind />
        </Button>

        <Button
          size="icon-sm"
          variant="outline"
          onClick={onPrevStep}
          disabled={stepsLength === 0 || stepIndex <= 0}
          aria-label="Previous step"
          title="Previous step"
        >
          <SkipBack />
        </Button>

        <Button
          size="icon-sm"
          variant="outline"
          onClick={onTogglePlaying}
          disabled={stepsLength === 0}
          aria-label={isPlaying ? "Pause" : "Play"}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause /> : <Play />}
        </Button>

        <Button
          size="icon-sm"
          variant="outline"
          onClick={onNextStep}
          disabled={stepsLength === 0 || stepIndex >= stepsLength - 1}
          aria-label="Next step"
          title="Next step"
        >
          <SkipForward />
        </Button>

        <Button
          size="icon-sm"
          variant="outline"
          onClick={onLastStep}
          disabled={stepsLength === 0 || stepIndex >= stepsLength - 1}
          aria-label="Last step"
          title="Go to last step"
        >
          <FastForward />
        </Button>

        <div className="min-w-14 text-center font-mono text-xs text-muted-foreground">
          {stepsLength > 0 ? `${stepIndex + 1}/${stepsLength}` : "0/0"}
        </div>
      </div>
    </div>
  );
}
