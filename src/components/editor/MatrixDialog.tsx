import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  buildAdjacencyMatrix,
  buildIncidenceMatrix,
  matrixToCsv,
  type MatrixTable,
} from "@/core/graph/matrices";
import type {
  GraphEdge,
  GraphNode,
  MatrixUnweightedSymbol,
} from "@/core/graph/types";
import { downloadTextFile } from "@/core/io/download";
import { cn } from "@/lib/utils";
import type { MatrixDialogKind } from "@/stores/graphUiStore";

export type MatrixDialogProps = {
  open: boolean;
  kind: MatrixDialogKind;

  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];

  unweightedSymbol: MatrixUnweightedSymbol;
  onChangeUnweightedSymbol: (symbol: MatrixUnweightedSymbol) => void;

  onClose: () => void;
};

export function MatrixDialog({
  open,
  kind,
  nodes,
  edges,
  unweightedSymbol,
  onChangeUnweightedSymbol,
  onClose,
}: MatrixDialogProps) {
  const matrixTable: MatrixTable | null =
    kind === "adjacency"
      ? buildAdjacencyMatrix(nodes, edges, unweightedSymbol)
      : kind === "incidence"
        ? buildIncidenceMatrix(nodes, edges)
        : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) return;
        onClose();
      }}
    >
      {matrixTable && (
        <DialogContent className="sm:max-w-160 md:max-w-3xl lg:max-w-5xl">
          <DialogHeader>
            <div className="flex flex-col gap-3 pr-10 md:flex-row md:items-start md:justify-between">
              <div className="space-y-1">
                <DialogTitle>
                  {kind === "adjacency"
                    ? "Матрица смежности"
                    : "Матрица инцидентности"}
                </DialogTitle>
                <DialogDescription>
                  {kind === "adjacency" ? (
                    'Ребра нет = пусто. Ребро есть (без веса) = "-"/"1"/"∞".'
                  ) : (
                    <div className="space-y-1">
                      <div>Значения в столбце ребра:</div>
                      <div className="font-mono text-xs text-muted-foreground/90">
                        undirected: source = 1, target = 1
                      </div>
                      <div className="font-mono text-xs text-muted-foreground/90">
                        directed: source = -1, target = 1
                      </div>
                      <div className="font-mono text-xs text-muted-foreground/90">
                        loop: value = 2
                      </div>
                    </div>
                  )}
                </DialogDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {kind === "adjacency" && (
                  <div className="flex items-center gap-1">
                    {(["-", "1", "∞"] as const).map((v) => (
                      <Button
                        key={v}
                        size="sm"
                        variant={unweightedSymbol === v ? "default" : "outline"}
                        onClick={() => onChangeUnweightedSymbol(v)}
                        aria-label={
                          v === "-"
                            ? "Unweighted edge symbol: dash"
                            : v === "1"
                              ? "Unweighted edge symbol: one"
                              : "Unweighted edge symbol: infinity"
                        }
                        aria-pressed={unweightedSymbol === v}
                      >
                        {v}
                      </Button>
                    ))}
                  </div>
                )}

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (kind === "adjacency") {
                      downloadTextFile(
                        "adjacency.csv",
                        matrixToCsv(matrixTable),
                        "text/csv",
                      );
                    }

                    if (kind === "incidence") {
                      downloadTextFile(
                        "incidence.csv",
                        matrixToCsv(matrixTable),
                        "text/csv",
                      );
                    }
                  }}
                >
                  Export CSV
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="overflow-auto [&>div]:max-h-[60vh] [&>div]:border">
            <Table className="text-xs">
              <TableHeader>
                <TableRow className="[&>:not(:last-child)]:border-r">
                  <TableHead className="sticky top-0 left-0 z-30 bg-background text-center">
                    {matrixTable.cornerLabel}
                  </TableHead>
                  {matrixTable.columnLabels.map((c) => (
                    <TableHead
                      key={c}
                      className="sticky top-0 z-10 bg-background text-center"
                    >
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixTable.rowLabels.map((label, rowIndex) => (
                  <TableRow
                    key={label}
                    className="odd:bg-muted hover:bg-transparent odd:hover:bg-muted [&>:not(:last-child)]:border-r"
                  >
                    <TableCell
                      className={cn(
                        "sticky left-0 z-10 bg-background text-center font-medium",
                        rowIndex % 2 === 0 && "bg-muted",
                      )}
                    >
                      {label}
                    </TableCell>
                    {(matrixTable.values[rowIndex] ?? []).map((value, idx) => (
                      <TableCell key={idx} className="text-center">
                        {value}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
