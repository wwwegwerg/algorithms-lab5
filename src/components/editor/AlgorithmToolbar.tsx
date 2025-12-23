import * as React from "react";
import {
  ArrowLeftFromLine,
  Pause,
  Play,
  RotateCcw,
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
  startNodeId: string | null;
  onChangeStartNodeId: (id: string | null) => void;

  playIntervalMs: number;
  onChangePlayIntervalMs: (ms: number) => void;

  isPlaying: boolean;
  onTogglePlaying: () => void;

  stepsLength: number;
  stepIndex: number;
  onPrevStep: () => void;
  onNextStep: () => void;
  onResetSteps: () => void;
  onRunAlgorithm: () => void;
};

export function AlgorithmToolbar({
  onShowGraphToolbar,
  algorithmOptions,
  algorithmId,
  onChangeAlgorithmId,
  nodes,
  startNodeId,
  onChangeStartNodeId,
  playIntervalMs,
  onChangePlayIntervalMs,
  isPlaying,
  onTogglePlaying,
  stepsLength,
  stepIndex,
  onPrevStep,
  onNextStep,
  onResetSteps,
  onRunAlgorithm,
}: AlgorithmToolbarProps) {
  const selectedAlgorithmLabel =
    algorithmOptions.find((opt) => opt.id === algorithmId)?.label ?? null;

  const selectedStartNode = startNodeId
    ? (nodes.find((n) => n.id === startNodeId) ?? null)
    : null;

  const selectedStartNodeLabel = selectedStartNode
    ? selectedStartNode.label || selectedStartNode.id
    : null;

  React.useEffect(() => {
    if (!startNodeId) return;

    const isPresent = nodes.some((n) => n.id === startNodeId);
    if (!isPresent) onChangeStartNodeId(null);
  }, [nodes, onChangeStartNodeId, startNodeId]);

  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 p-3">
      <Button
        size="sm"
        variant="outline"
        onClick={onShowGraphToolbar}
        aria-label="Switch to graph toolbar"
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
          value={startNodeId ?? ""}
          onValueChange={(value) => {
            const next = typeof value === "string" ? value : "";
            onChangeStartNodeId(next.length === 0 ? null : next);
          }}
        >
          <SelectTrigger size="sm" aria-label="Start node">
            {selectedStartNodeLabel ? (
              <span>{selectedStartNodeLabel}</span>
            ) : (
              <span className="text-muted-foreground">Start node</span>
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

        <Button size="sm" variant="outline" onClick={onRunAlgorithm}>
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
          onClick={onPrevStep}
          disabled={stepsLength === 0 || stepIndex <= 0}
          aria-label="Previous step"
        >
          <SkipBack />
        </Button>

        <Button
          size="icon-sm"
          variant="outline"
          onClick={onTogglePlaying}
          disabled={stepsLength === 0}
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? <Pause /> : <Play />}
        </Button>

        <Button
          size="icon-sm"
          variant="outline"
          onClick={onNextStep}
          disabled={stepsLength === 0 || stepIndex >= stepsLength - 1}
          aria-label="Next step"
        >
          <SkipForward />
        </Button>

        <Button
          size="icon-sm"
          variant="outline"
          onClick={onResetSteps}
          disabled={stepsLength === 0}
          aria-label="Reset"
        >
          <RotateCcw />
        </Button>

        <div className="min-w-14 text-center font-mono text-xs text-muted-foreground">
          {stepsLength > 0 ? `${stepIndex + 1}/${stepsLength}` : "0/0"}
        </div>
      </div>
    </div>
  );
}
