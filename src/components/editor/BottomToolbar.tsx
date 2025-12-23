import {
  AlgorithmToolbar,
  type AlgorithmToolbarProps,
} from "@/components/editor/AlgorithmToolbar";
import {
  GraphToolbar,
  type GraphToolbarProps,
} from "@/components/editor/GraphToolbar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type BottomToolbarProps = {
  className?: string;
  activeToolbar: "graph" | "algorithms";
  graph: GraphToolbarProps;
  algorithms: AlgorithmToolbarProps;
};

export function BottomToolbar({
  className,
  activeToolbar,
  graph,
  algorithms,
}: BottomToolbarProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 p-3 select-none",
        className,
      )}
    >
      <div className="pointer-events-auto mx-auto w-fit max-w-full">
        <Card size="sm" className="gap-0 py-0!">
          {activeToolbar === "graph" ? (
            <GraphToolbar {...graph} />
          ) : (
            <AlgorithmToolbar {...algorithms} />
          )}
        </Card>
      </div>
    </div>
  );
}
