import * as React from "react";
import {
  CirclePlusIcon,
  DownloadIcon,
  FileTextIcon,
  Link2Icon,
  MousePointer2Icon,
  PauseIcon,
  PlayIcon,
  StepBackIcon,
  StepForwardIcon,
  Table2Icon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { algorithms } from "@/core/algorithms/registry";
import type {
  EditorMode,
  GraphEdge,
  GraphNode,
  Selection,
} from "@/core/graph/types";
import { isLoop } from "@/core/graph/types";
import { cn } from "@/lib/utils";

export type BottomToolbarProps = {
  className?: string;

  mode: EditorMode;
  onChangeMode: (mode: EditorMode) => void;

  newEdgeDirected: boolean;
  onChangeNewEdgeDirected: (directed: boolean) => void;

  bottomPanel: "none" | "adjacency" | "incidence";
  onTogglePanel: (panel: "adjacency" | "incidence") => void;

  onSaveJson: () => void;
  onLoadJson: (file: File) => void;

  nodes: { id: string }[];

  algorithmId: string;
  onChangeAlgorithmId: (id: string) => void;

  startNodeId: string | null;
  onChangeStartNodeId: (id: string | null) => void;

  canRun: boolean;
  onRun: () => void;

  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;

  playIntervalMs: number;
  onChangePlayIntervalMs: (ms: number) => void;

  message: string | null;

  selection: Selection;
  selectedNode: GraphNode | null;
  selectedEdge: GraphEdge | null;
  onUpdateNode: (id: string, patch: Partial<Pick<GraphNode, "label">>) => void;
  onUpdateEdge: (
    id: string,
    patch: Partial<Pick<GraphEdge, "directed" | "weight">>,
  ) => void;
};

export function BottomToolbar({
  className,
  mode,
  onChangeMode,
  newEdgeDirected,
  onChangeNewEdgeDirected,
  bottomPanel,
  onTogglePanel,
  onSaveJson,
  onLoadJson,
  nodes,
  algorithmId,
  onChangeAlgorithmId,
  startNodeId,
  onChangeStartNodeId,
  canRun,
  onRun,
  isPlaying,
  onTogglePlay,
  onPrev,
  onNext,
  playIntervalMs,
  onChangePlayIntervalMs,
  message,
  selection,
  selectedNode,
  selectedEdge,
  onUpdateNode,
  onUpdateEdge,
}: BottomToolbarProps) {
  function parseOptionalNumber(value: string) {
    if (value.trim().length === 0) return undefined;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  const inputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 p-3",
        className,
      )}
    >
      <Card className="pointer-events-auto mx-auto max-w-[1200px]">
        <div className="flex flex-wrap items-center gap-2 p-2">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={mode === "select" ? "default" : "outline"}
              onClick={() => onChangeMode("select")}
              title="Select"
            >
              <MousePointer2Icon />
            </Button>
            <Button
              size="sm"
              variant={mode === "add_node" ? "default" : "outline"}
              onClick={() => onChangeMode("add_node")}
              title="Node"
            >
              <CirclePlusIcon />
            </Button>
            <Button
              size="sm"
              variant={mode === "add_edge" ? "default" : "outline"}
              onClick={() => onChangeMode("add_edge")}
              title="Edge"
            >
              <Link2Icon />
            </Button>
            <Button
              size="sm"
              variant={mode === "delete" ? "destructive" : "outline"}
              onClick={() => onChangeMode("delete")}
              title="Delete"
            >
              <Trash2Icon />
            </Button>
          </div>

          <Separator orientation="vertical" className="mx-1 h-7" />

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={newEdgeDirected ? "default" : "outline"}
              onClick={() => onChangeNewEdgeDirected(true)}
            >
              Directed
            </Button>
            <Button
              size="sm"
              variant={!newEdgeDirected ? "default" : "outline"}
              onClick={() => onChangeNewEdgeDirected(false)}
            >
              Undirected
            </Button>
          </div>

          <Separator orientation="vertical" className="mx-1 h-7" />

          <div className="flex items-center gap-1">
            <Button size="sm" variant="outline" onClick={onSaveJson}>
              <DownloadIcon />
              Save
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={() => inputRef.current?.click()}
            >
              <UploadIcon />
              Load
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onLoadJson(file);
                e.currentTarget.value = "";
              }}
            />
          </div>

          <Separator orientation="vertical" className="mx-1 h-7" />

          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant={bottomPanel === "adjacency" ? "default" : "outline"}
              onClick={() => onTogglePanel("adjacency")}
            >
              <Table2Icon />
              Adj
            </Button>
            <Button
              size="sm"
              variant={bottomPanel === "incidence" ? "default" : "outline"}
              onClick={() => onTogglePanel("incidence")}
            >
              <Table2Icon />
              Inc
            </Button>
          </div>

          <Separator orientation="vertical" className="mx-1 h-7" />

          <div className="flex flex-1 flex-wrap items-center gap-2">
            <div className="flex min-w-[240px] items-center gap-2">
              <FileTextIcon className="size-4 text-foreground/70" />
              <Select
                items={algorithms.map((a) => ({ label: a.label, value: a.id }))}
                value={algorithmId}
                onValueChange={(value) => {
                  if (!value) return;
                  onChangeAlgorithmId(value);
                }}
              >
                <SelectTrigger className="h-8 w-[220px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {algorithms.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Select
                items={[
                  { label: "(start node)", value: null },
                  ...nodes.map((n) => ({ label: n.id, value: n.id })),
                ]}
                value={startNodeId}
                onValueChange={(value) => onChangeStartNodeId(value)}
              >
                <SelectTrigger className="h-8 w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value={null}>(start node)</SelectItem>
                    {nodes.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.id}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>

              <Button
                size="sm"
                variant="outline"
                onClick={onRun}
                disabled={!canRun}
              >
                Run
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button size="sm" variant="outline" onClick={onPrev}>
                <StepBackIcon />
              </Button>
              <Button size="sm" variant="outline" onClick={onTogglePlay}>
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
              </Button>
              <Button size="sm" variant="outline" onClick={onNext}>
                <StepForwardIcon />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <div className="text-xs text-foreground/60">ms</div>
              <Input
                className="h-8 w-[92px]"
                type="number"
                value={String(playIntervalMs)}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  if (!Number.isFinite(next)) return;
                  onChangePlayIntervalMs(next);
                }}
              />
            </div>

            {selection?.kind === "node" && selectedNode && (
              <div className="flex items-center gap-2">
                <div className="text-xs text-foreground/60">label</div>
                <Input
                  className="h-8 w-[180px]"
                  value={selectedNode.label}
                  onChange={(e) =>
                    onUpdateNode(selectedNode.id, { label: e.target.value })
                  }
                />
              </div>
            )}

            {selection?.kind === "edge" && selectedEdge && (
              <div className="flex items-center gap-2">
                <div className="text-xs text-foreground/60">
                  {selectedEdge.id}
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant={selectedEdge.directed ? "default" : "outline"}
                    disabled={isLoop(selectedEdge)}
                    onClick={() =>
                      onUpdateEdge(selectedEdge.id, { directed: true })
                    }
                  >
                    D
                  </Button>
                  <Button
                    size="sm"
                    variant={!selectedEdge.directed ? "default" : "outline"}
                    onClick={() =>
                      onUpdateEdge(selectedEdge.id, { directed: false })
                    }
                  >
                    U
                  </Button>
                </div>
                <Input
                  className="h-8 w-[120px]"
                  inputMode="decimal"
                  placeholder="weight"
                  value={
                    selectedEdge.weight === undefined
                      ? ""
                      : String(selectedEdge.weight)
                  }
                  onChange={(e) => {
                    const parsed = parseOptionalNumber(e.target.value);
                    if (parsed === null) return;
                    onUpdateEdge(selectedEdge.id, { weight: parsed });
                  }}
                />
              </div>
            )}
          </div>
        </div>

        {message && (
          <div className="border-t px-3 py-2 text-xs text-foreground/70">
            {message}
          </div>
        )}
      </Card>
    </div>
  );
}
