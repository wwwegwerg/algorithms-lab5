import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MatrixTable } from "@/core/graph/matrices";
import type { MatrixUnweightedSymbol } from "@/core/graph/types";
import { cn } from "@/lib/utils";

export type MatrixPanelProps = {
  className?: string;
  title: string;
  table: MatrixTable;
  onExportCsv: () => void;

  unweightedSymbol?: MatrixUnweightedSymbol;
  onChangeUnweightedSymbol?: (symbol: MatrixUnweightedSymbol) => void;
};

export function MatrixPanel({
  className,
  title,
  table,
  onExportCsv,
  unweightedSymbol,
  onChangeUnweightedSymbol,
}: MatrixPanelProps) {
  return (
    <Card className={cn("h-full w-full", className)}>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-base">{title}</CardTitle>
        <div className="flex items-center gap-2">
          {unweightedSymbol && onChangeUnweightedSymbol ? (
            <div className="flex items-center gap-2">
              <div className="text-xs text-foreground/70">Без веса:</div>
              <div className="flex items-center gap-1">
                {(["_", "1", "∞"] as const).map((v) => (
                  <Button
                    key={v}
                    size="sm"
                    variant={unweightedSymbol === v ? "default" : "outline"}
                    onClick={() => onChangeUnweightedSymbol(v)}
                    className="h-8 px-3"
                  >
                    {v}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
          <Button size="sm" variant="outline" onClick={onExportCsv}>
            Export CSV
          </Button>
        </div>
      </CardHeader>
      <CardContent className="h-[420px] overflow-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-20 min-w-[80px] border bg-background px-2 py-1 text-left">
                {table.cornerLabel}
              </th>
              {table.columnLabels.map((c) => (
                <th
                  key={c}
                  className="sticky top-0 z-10 border bg-background px-2 py-1 text-left"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.values.map((row, rowIndex) => (
              <tr key={table.rowLabels[rowIndex] ?? rowIndex}>
                <td className="sticky left-0 z-10 border bg-background px-2 py-1 font-medium">
                  {table.rowLabels[rowIndex]}
                </td>
                {row.map((v, colIndex) => (
                  <td key={colIndex} className="border px-2 py-1">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 text-xs text-foreground/60">
          Пустая ячейка = ребра нет. "_"/"1"/"∞" = ребро есть без веса.
        </div>
      </CardContent>
    </Card>
  );
}
