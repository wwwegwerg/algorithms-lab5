import { XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type {
  EdgeId,
  GraphEdge,
  GraphNode,
  NodeId,
  Selection,
} from "@/core/graph/types";
import { isLoop } from "@/core/graph/types";
import { cn } from "@/lib/utils";

export type PropertiesPanelProps = {
  className?: string;
  selection: Selection;

  node: GraphNode | null;
  edge: GraphEdge | null;

  onUpdateNode: (
    id: NodeId,
    patch: Partial<Pick<GraphNode, "label" | "x" | "y">>,
  ) => void;

  onUpdateEdge: (
    id: EdgeId,
    patch: Partial<Pick<GraphEdge, "directed" | "weight">>,
  ) => void;

  onClose: () => void;

  lastError: string | null;
};

function parseOptionalNumber(value: string) {
  if (value.trim().length === 0) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function PropertiesPanel({
  className,
  selection,
  node,
  edge,
  onUpdateNode,
  onUpdateEdge,
  onClose,
  lastError,
}: PropertiesPanelProps) {
  if (!selection) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute top-3 right-3 z-30 w-[360px]",
        className,
      )}
    >
      <Card className="pointer-events-auto border-0 bg-foreground/70 text-background shadow-lg ring-1 ring-background/20 backdrop-blur">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <CardTitle className="text-sm">Свойства</CardTitle>
          <Button size="icon-sm" variant="ghost" onClick={onClose}>
            <XIcon />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {lastError ? (
            <div className="rounded-md border border-background/20 bg-background/10 px-3 py-2 text-sm">
              {lastError}
            </div>
          ) : null}

          {selection.kind === "node" && node ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-background/80" htmlFor="node-id">
                  ID
                </Label>
                <Input id="node-id" value={node.id} readOnly />
              </div>
              <div className="space-y-1">
                <Label className="text-background/80" htmlFor="node-label">
                  Label
                </Label>
                <Input
                  id="node-label"
                  value={node.label}
                  onChange={(e) =>
                    onUpdateNode(node.id, { label: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-background/80" htmlFor="node-x">
                    X
                  </Label>
                  <Input
                    id="node-x"
                    type="number"
                    value={String(Math.round(node.x))}
                    onChange={(e) =>
                      onUpdateNode(node.id, { x: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-background/80" htmlFor="node-y">
                    Y
                  </Label>
                  <Input
                    id="node-y"
                    type="number"
                    value={String(Math.round(node.y))}
                    onChange={(e) =>
                      onUpdateNode(node.id, { y: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}

          {selection.kind === "edge" && edge ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-background/80" htmlFor="edge-id">
                  ID
                </Label>
                <Input id="edge-id" value={edge.id} readOnly />
              </div>

              <div className="space-y-1">
                <Label className="text-background/80" htmlFor="edge-endpoints">
                  Концы
                </Label>
                <Input
                  id="edge-endpoints"
                  value={
                    edge.directed
                      ? `${edge.source} -> ${edge.target}`
                      : `${edge.source} -- ${edge.target}`
                  }
                  readOnly
                />
              </div>

              <div className="space-y-1">
                <Label className="text-background/80">Тип</Label>
                <div className="flex gap-2">
                  <Button
                    variant={edge.directed ? "default" : "outline"}
                    disabled={isLoop(edge)}
                    onClick={() => onUpdateEdge(edge.id, { directed: true })}
                  >
                    Directed
                  </Button>
                  <Button
                    variant={!edge.directed ? "default" : "outline"}
                    onClick={() => onUpdateEdge(edge.id, { directed: false })}
                  >
                    Undirected
                  </Button>
                </div>
                {isLoop(edge) ? (
                  <div className="text-xs text-background/70">
                    Петля всегда неориентированная.
                  </div>
                ) : null}
              </div>

              <div className="space-y-1">
                <Label className="text-background/80" htmlFor="edge-weight">
                  Вес (пусто = без веса)
                </Label>
                <Input
                  id="edge-weight"
                  inputMode="decimal"
                  value={edge.weight === undefined ? "" : String(edge.weight)}
                  onChange={(e) => {
                    const parsed = parseOptionalNumber(e.target.value);
                    if (parsed === null) return;
                    onUpdateEdge(edge.id, { weight: parsed });
                  }}
                />
              </div>
            </div>
          ) : null}

          <div className="text-xs text-background/70">
            Удаление: режим Delete в тулбаре или клавиша Delete.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
