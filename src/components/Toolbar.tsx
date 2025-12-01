import type { ComponentType, SVGProps } from "react";
import {
  CirclePlus,
  MousePointer2,
  MoveUpRight,
  Slash,
  SplinePointer,
  Trash,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import type { EditMode } from "@/types/graph";
import { ToggleGroup, ToggleGroupItem } from "./ui/toggle-group";

type ToolbarProps = {
  mode: EditMode;
  onModeChange: (mode: EditMode) => void;
  className?: string;
};

const TOOLBAR_BUTTONS: Array<{
  mode: EditMode;
  label: string;
  Icon: ComponentType<SVGProps<SVGSVGElement>>;
}> = [
  { mode: "idle", label: "Выбор", Icon: MousePointer2 },
  { mode: "add-node", label: "Добавить вершину", Icon: CirclePlus },
  { mode: "add-edge", label: "Добавить ребро", Icon: Slash },
  {
    mode: "add-directed-edge",
    label: "Добавить направленное ребро",
    Icon: MoveUpRight,
  },
  {
    mode: "adjust-curvature",
    label: "Настроить кривизну ребер",
    Icon: SplinePointer,
  },
  { mode: "delete", label: "Удаление вершин / ребер", Icon: Trash },
];

export function Toolbar({ mode, onModeChange, className = "" }: ToolbarProps) {
  return (
    <ToggleGroup
      type="single"
      value={mode}
      className={cn(className, "bg-white/95")}
      variant="outline"
      size="lg"
    >
      {TOOLBAR_BUTTONS.map(({ mode: btnMode, label, Icon }) => {
        return (
          <ToggleGroupItem
            key={btnMode}
            value={btnMode}
            className="cursor-pointer px-0"
            aria-label={label}
            onClick={() => onModeChange(btnMode)}
          >
            <Tooltip key={btnMode}>
              <TooltipTrigger asChild>
                <span className="flex h-full w-full items-center justify-center px-3">
                  <Icon strokeWidth={1.75} />
                </span>
              </TooltipTrigger>
              <TooltipContent>{label}</TooltipContent>
            </Tooltip>
          </ToggleGroupItem>
        );
      })}
    </ToggleGroup>
  );
}
