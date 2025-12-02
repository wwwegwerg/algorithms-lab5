import { useRef } from "react";
import {
  parseGraphSnapshot,
  serializeGraphSnapshot,
  type GraphSnapshot,
} from "@/lib/graph-io";
import type { Edge, Node } from "@/types/graph";

type SidebarProps = {
  nodes: Node[];
  edges: Edge[];
  adjacencyMatrix: string;
  onImportSnapshot: (snapshot: GraphSnapshot) => void;
  onImportMatrix: (
    rawMatrix: string,
  ) => { success: true } | { success: false; error?: string };
};

export function Sidebar({
  nodes,
  edges,
  adjacencyMatrix,
  onImportSnapshot,
  onImportMatrix,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSaveJson = () => {
    const snapshot = serializeGraphSnapshot(nodes, edges);
    const blob = new Blob([snapshot], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    link.href = url;
    link.download = `graph-${timestamp}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleCopyMatrix = async () => {
    if (!adjacencyMatrix.trim()) {
      console.warn("Граф пуст — нечего копировать.");
      return;
    }
    try {
      await navigator.clipboard.writeText(adjacencyMatrix);
      console.info("Матрица смежности скопирована.");
    } catch (error) {
      console.warn(error);
      console.warn("Не удалось скопировать матрицу.");
    }
  };

  const handleLoadMatrix = () => {
    const value = window.prompt("Вставьте матрицу смежности:");
    if (value === null) return;
    const result = onImportMatrix(value);
    if (result.success) {
      console.info(
        value.trim() ? "Граф обновлён из матрицы." : "Граф очищен матрицей.",
      );
      return;
    }
    console.warn(result.error ?? "Не удалось загрузить матрицу.");
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const content = String(reader.result ?? "");
        const snapshot = parseGraphSnapshot(content);
        onImportSnapshot(snapshot);
        console.info("Граф загружен из JSON.");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Не удалось прочитать JSON.";
        console.warn(message);
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex w-64 flex-col gap-3 bg-neutral-50 p-3 text-sm">
      <div>
        <h3 className="font-semibold">Граф</h3>
        <p className="text-xs text-gray-600">
          Быстрые действия: сохранить/загрузить файл или работать с матрицей.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <button
          type="button"
          onClick={handleSaveJson}
          className="rounded border border-gray-300 bg-white px-3 py-1 font-medium transition hover:bg-gray-100"
        >
          Сохранить .json
        </button>
        <button
          type="button"
          onClick={handleCopyMatrix}
          className="rounded border border-gray-300 bg-white px-3 py-1 font-medium transition hover:bg-gray-100"
        >
          Скопировать матрицу смежности
        </button>
        <button
          type="button"
          onClick={triggerFileSelect}
          className="rounded border border-gray-300 bg-white px-3 py-1 font-medium transition hover:bg-gray-100"
        >
          Загрузить .json
        </button>
        <button
          type="button"
          onClick={handleLoadMatrix}
          className="rounded border border-gray-300 bg-white px-3 py-1 font-medium transition hover:bg-gray-100"
        >
          Загрузить матрицу смежности
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
