import * as React from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildAdjacencyMatrix,
  buildIncidenceMatrix,
  matrixToCsv,
  type MatrixTable,
} from "@/core/graph/matrices";
import type {
  GraphEdge,
  GraphNode,
  MatrixDiagonalSymbol,
  MatrixUnweightedSymbol,
} from "@/core/graph/types";
import { downloadTextFile } from "@/core/io/download";
import { cn } from "@/lib/utils";

type MatrixTab = "adjacency" | "incidence";

export type MatrixDialogProps = {
  isOpen: boolean;
  tab: MatrixTab;
  onChangeTab: (tab: MatrixTab) => void;

  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];

  unweightedSymbol: MatrixUnweightedSymbol;
  onChangeUnweightedSymbol: (symbol: MatrixUnweightedSymbol) => void;

  diagonalSymbol: MatrixDiagonalSymbol;
  onChangeDiagonalSymbol: (symbol: MatrixDiagonalSymbol) => void;

  onClose: () => void;
};

export function MatrixDialog({
  isOpen,
  tab,
  onChangeTab,
  nodes,
  edges,
  unweightedSymbol,
  onChangeUnweightedSymbol,
  diagonalSymbol,
  onChangeDiagonalSymbol,
  onClose,
}: MatrixDialogProps) {
  const adjacencyTable = React.useMemo(() => {
    return buildAdjacencyMatrix(nodes, edges, unweightedSymbol, diagonalSymbol);
  }, [diagonalSymbol, edges, nodes, unweightedSymbol]);

  const incidenceTable = React.useMemo(() => {
    return buildIncidenceMatrix(nodes, edges);
  }, [edges, nodes]);

  const matrixTable: MatrixTable =
    tab === "adjacency" ? adjacencyTable : incidenceTable;

  const onValueChange = React.useCallback(
    (value: string) => {
      if (value === "adjacency" || value === "incidence") {
        onChangeTab(value);
      }
    },
    [onChangeTab],
  );

  const [isContentMounted, setIsContentMounted] = React.useState(isOpen);

  React.useEffect(() => {
    if (isOpen) {
      setIsContentMounted(true);
    }
  }, [isOpen]);

  const handleExited = React.useCallback(
    (e: React.AnimationEvent | React.TransitionEvent) => {
      if (e.currentTarget !== e.target) return;
      if (isOpen) return;
      setIsContentMounted(false);
    },
    [isOpen],
  );

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (nextOpen) return;
        onClose();
      }}
    >
      {isContentMounted && (
        <DialogContent
          className="sm:max-w-160 md:max-w-3xl lg:max-w-5xl"
          onAnimationEnd={handleExited}
          onTransitionEnd={handleExited}
        >
          <Tabs value={tab} onValueChange={onValueChange} className="min-w-0">
            <DialogHeader>
              <div className="flex flex-col gap-3 pr-10 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <DialogTitle>Матрицы</DialogTitle>
                  <TabsList>
                    <TabsTrigger value="adjacency">Смежности</TabsTrigger>
                    <TabsTrigger value="incidence">Инцидентности</TabsTrigger>
                  </TabsList>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {tab === "adjacency" && (
                    <div className="flex items-center gap-1">
                      <div className="flex items-center gap-1">
                        {(["-", "1"] as const).map((v) => (
                          <Button
                            key={v}
                            size="sm"
                            variant={
                              unweightedSymbol === v ? "default" : "outline"
                            }
                            onClick={() => onChangeUnweightedSymbol(v)}
                            aria-label={
                              v === "-"
                                ? "Unweighted edge symbol: dash"
                                : "Unweighted edge symbol: one"
                            }
                            aria-pressed={unweightedSymbol === v}
                          >
                            {v}
                          </Button>
                        ))}
                      </div>

                      <div className="flex items-center gap-1">
                        {(["∞", "0"] as const).map((v) => (
                          <Button
                            key={v}
                            size="sm"
                            variant={
                              diagonalSymbol === v ? "default" : "outline"
                            }
                            onClick={() => onChangeDiagonalSymbol(v)}
                            aria-label={
                              v === "∞"
                                ? "Diagonal default: infinity"
                                : "Diagonal default: zero"
                            }
                            aria-pressed={diagonalSymbol === v}
                          >
                            {v}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      if (tab === "adjacency") {
                        downloadTextFile(
                          "adjacency.csv",
                          matrixToCsv(matrixTable),
                          "text/csv",
                        );
                      }

                      if (tab === "incidence") {
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

            <TabsContent value="adjacency" className="flex-none">
              <DialogDescription>
                Нет ребра = "∞". Диагональ (если петли нет) = "0"/"∞". Ребро без
                веса = "-"/"1". Ребро с весом = weight.
              </DialogDescription>
            </TabsContent>

            <TabsContent value="incidence" className="flex-none">
              <DialogDescription>
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
              </DialogDescription>
            </TabsContent>

            <div className="max-h-[60vh] min-w-0 overflow-auto border">
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
                      {(matrixTable.values[rowIndex] ?? []).map(
                        (value, idx) => (
                          <TableCell key={idx} className="text-center">
                            {value}
                          </TableCell>
                        ),
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Tabs>
        </DialogContent>
      )}
    </Dialog>
  );
}
