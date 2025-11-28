import type { ComponentType, SVGProps } from "react";
import { CirclePlus, MousePointer2, Spline, Trash } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { EditMode } from "@/types/graph";

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
  { mode: "add-edge", label: "Добавить ребро", Icon: Spline },
  { mode: "delete", label: "Удаление", Icon: Trash },
];

export function Toolbar({ mode, onModeChange, className = "" }: ToolbarProps) {
  return (
    <div
      className={`flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-4 py-2 text-sm font-medium text-gray-600 shadow-[0_15px_40px_rgba(15,23,42,0.12)] backdrop-blur ${className}`}
    >
      {TOOLBAR_BUTTONS.map(({ mode: btnMode, label, Icon }) => {
        const isActive = mode === btnMode;
        return (
          <Tooltip key={btnMode}>
            <TooltipTrigger asChild>
              <label
                className={`flex cursor-pointer items-center gap-2 rounded-full px-3 py-1 transition-colors ${
                  isActive
                    ? "bg-indigo-100 text-indigo-900"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <input
                  type="radio"
                  className="sr-only"
                  name="toolbar-mode"
                  value={btnMode}
                  checked={isActive}
                  onChange={() => onModeChange(btnMode)}
                />
                <Icon className="h-6 w-6" strokeWidth={1.75} />
                <span className="sr-only">{label}</span>
              </label>
            </TooltipTrigger>
            <TooltipContent>{label}</TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
