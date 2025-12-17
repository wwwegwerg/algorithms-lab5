import * as React from "react";
import {
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
import { Separator } from "@/components/ui/separator";
import type { EditorMode } from "@/core/graph/types";
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
  onClearPersistedGraph: () => void;
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
  onClearPersistedGraph,
}: BottomToolbarProps) {
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 p-3",
        className,
      )}
    >
      <div className="pointer-events-auto mx-auto flex max-w-300 flex-wrap items-end justify-center gap-2">
        <Card size="sm" className="gap-0 py-0">
          <div className="flex items-center gap-2 p-2">
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
                <Eraser />
              </Button>
            </div>

            <Separator orientation="vertical" className="mx-1 h-7" />

            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={newEdgeDirected ? "default" : "outline"}
                onClick={() => onChangeNewEdgeDirected(true)}
              >
                <MoveUpRight />
                Directed
              </Button>
              <Button
                size="sm"
                variant={!newEdgeDirected ? "default" : "outline"}
                onClick={() => onChangeNewEdgeDirected(false)}
              >
                <MoveDiagonal />
                Undirected
              </Button>
            </div>
          </div>
        </Card>

        <Card size="sm" className="gap-0 py-0">
          <div className="flex items-center gap-2 p-2">
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

              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button
                      size="sm"
                      variant="destructive"
                      title="Очистить сохранение"
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
          </div>
        </Card>
      </div>
    </div>
  );
}
