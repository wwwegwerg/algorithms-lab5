import * as React from "react";
import {
  ArrowLeftFromLine,
  ArrowRightFromLine,
  CirclePlusIcon,
  DownloadIcon,
  Eraser,
  Link2Icon,
  MousePointer2Icon,
  MoveDiagonal,
  MoveUpRight,
  Table2Icon,
  Trash2Icon,
  UploadIcon,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { EditorMode } from "@/core/graph/types";
import { cn } from "@/lib/utils";

export type BottomToolbarProps = {
  className?: string;

  activeToolbar: "graph" | "algorithms";
  onShowGraphToolbar: () => void;
  onShowAlgorithmToolbar: () => void;

  mode: EditorMode;
  onChangeMode: (mode: EditorMode) => void;

  newEdgeDirected: boolean;
  onChangeNewEdgeDirected: (directed: boolean) => void;

  matrixDialogKind: "none" | "adjacency" | "incidence";
  onToggleMatrixDialogOpen: () => void;

  onSaveJson: () => void;
  onLoadJson: (file: File) => void;
  onClearPersistedGraph: () => void;
};

export function BottomToolbar({
  className,
  activeToolbar,
  onShowGraphToolbar,
  onShowAlgorithmToolbar,
  mode,
  onChangeMode,
  newEdgeDirected,
  onChangeNewEdgeDirected,
  matrixDialogKind,
  onToggleMatrixDialogOpen,
  onSaveJson,
  onLoadJson,
  onClearPersistedGraph,
}: BottomToolbarProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  if (activeToolbar === "algorithms") {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 bottom-0 p-3",
          className,
        )}
      >
        <div className="pointer-events-auto mx-auto w-fit max-w-full">
          <Card size="sm" className="gap-0 py-0!">
            <div className="flex items-center justify-center p-3">
              <Button
                size="sm"
                variant="outline"
                onClick={onShowGraphToolbar}
                aria-label="Switch to graph toolbar"
              >
                <ArrowLeftFromLine />
                Graph
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 p-3",
        className,
      )}
    >
      <div className="pointer-events-auto mx-auto w-fit max-w-full">
        <Card size="sm" className="gap-0 py-0!">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 p-3">
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={mode === "select" ? "default" : "outline"}
                onClick={() => onChangeMode("select")}
                title="Select"
                aria-label="Select mode"
                aria-pressed={mode === "select"}
              >
                <MousePointer2Icon />
              </Button>
              <Button
                size="sm"
                variant={mode === "add_node" ? "default" : "outline"}
                onClick={() => onChangeMode("add_node")}
                title="Add node"
                aria-label="Add node mode"
                aria-pressed={mode === "add_node"}
              >
                <CirclePlusIcon />
              </Button>
              <Button
                size="sm"
                variant={mode === "add_edge" ? "default" : "outline"}
                onClick={() => onChangeMode("add_edge")}
                title="Add edge"
                aria-label="Add edge mode"
                aria-pressed={mode === "add_edge"}
              >
                <Link2Icon />
              </Button>
              <Button
                size="sm"
                variant={mode === "delete" ? "destructive" : "outline"}
                onClick={() => onChangeMode("delete")}
                title="Delete"
                aria-label="Delete mode"
                aria-pressed={mode === "delete"}
              >
                <Eraser />
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={newEdgeDirected ? "default" : "outline"}
                onClick={() => onChangeNewEdgeDirected(true)}
                aria-pressed={newEdgeDirected}
              >
                <MoveUpRight />
                Directed
              </Button>
              <Button
                size="sm"
                variant={!newEdgeDirected ? "default" : "outline"}
                onClick={() => onChangeNewEdgeDirected(false)}
                aria-pressed={!newEdgeDirected}
              >
                <MoveDiagonal />
                Undirected
              </Button>
            </div>

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={matrixDialogKind !== "none" ? "default" : "outline"}
                onClick={onToggleMatrixDialogOpen}
                aria-label="Matrices"
                aria-pressed={matrixDialogKind !== "none"}
                aria-expanded={matrixDialogKind !== "none"}
              >
                <Table2Icon />
                Matrices
              </Button>

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

              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      size="sm"
                      variant="destructive"
                      title="Clear saved graph"
                    >
                      <Trash2Icon />
                      Clear canvas
                    </Button>
                  }
                />
                <AlertDialogContent size="sm">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Очистить сохранение?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Это удалит сохранённый граф из браузера. Действие нельзя
                      отменить.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogCancel
                      variant="destructive"
                      onClick={onClearPersistedGraph}
                    >
                      Очистить
                    </AlertDialogCancel>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

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

            <Button
              size="sm"
              variant="outline"
              onClick={onShowAlgorithmToolbar}
              aria-label="Switch to algorithms toolbar"
            >
              Algorithms
              <ArrowRightFromLine />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
