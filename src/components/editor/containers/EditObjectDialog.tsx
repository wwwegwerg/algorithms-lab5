import * as React from "react";
import { useShallow } from "zustand/shallow";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useGraphDataStore } from "@/stores/graphDataStore";
import { useGraphUiStore } from "@/stores/graphUiStore";

const MINUS_LIKE_RE = /[−–—]/g;
const WEIGHT_ALLOWED_RE = /^-?\d*(?:\.\d*)?$/;
const WEIGHT_COMPLETE_RE = /^-?\d+(?:\.\d+)?$/;

function normalizeMinus(value: string) {
  return value.replace(MINUS_LIKE_RE, "-");
}

function parseWeight(value: string): number | undefined | null {
  const normalized = normalizeMinus(value);

  if (normalized === "") return undefined;
  if (!WEIGHT_COMPLETE_RE.test(normalized)) return null;

  const next = Number(normalized);
  if (!Number.isFinite(next)) return null;

  return next;
}

type EditKind = "node" | "edge" | null;

export function EditObjectDialog() {
  const { editTarget, closeEditDialog } = useGraphUiStore(
    useShallow((s) => ({
      editTarget: s.editTarget,
      closeEditDialog: s.closeEditDialog,
    })),
  );

  const { nodes, edges, updateNode, updateEdge } = useGraphDataStore(
    useShallow((s) => ({
      nodes: s.nodes,
      edges: s.edges,
      updateNode: s.updateNode,
      updateEdge: s.updateEdge,
    })),
  );

  const open = editTarget !== null;

  const [nodeLabel, setNodeLabel] = React.useState("");
  const [edgeWeight, setEdgeWeight] = React.useState("");

  const kind: EditKind = editTarget?.kind ?? null;

  const node =
    editTarget?.kind === "node"
      ? (nodes.find((n) => n.id === editTarget.id) ?? null)
      : null;

  const edge =
    editTarget?.kind === "edge"
      ? (edges.find((e) => e.id === editTarget.id) ?? null)
      : null;

  const lastTargetKeyRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (!open || !editTarget) {
      lastTargetKeyRef.current = null;
      return;
    }
    const key = `${editTarget.kind}:${editTarget.id}`;
    if (lastTargetKeyRef.current !== key) {
      lastTargetKeyRef.current = key;
      if (editTarget.kind === "node") {
        if (!node) {
          closeEditDialog();
          return;
        }
        setNodeLabel(node.label ?? "");
        return;
      }
      if (editTarget.kind === "edge") {
        if (!edge) {
          closeEditDialog();
          return;
        }
        setEdgeWeight(edge.weight === undefined ? "" : String(edge.weight));
      }
      return;
    }
    if (editTarget.kind === "node" && !node) {
      closeEditDialog();
    }
    if (editTarget.kind === "edge" && !edge) {
      closeEditDialog();
    }
  }, [closeEditDialog, editTarget, edge, node, open]);

  const title =
    kind === "node"
      ? "Редактировать вершину"
      : kind === "edge"
        ? "Редактировать ребро"
        : "";

  const description =
    kind === "node"
      ? `Вершина ${node?.id ?? ""}`
      : kind === "edge"
        ? `Ребро ${edge?.id ?? ""}`
        : "";

  const canSubmit =
    kind === "node"
      ? node !== null && nodeLabel.trim().length > 0
      : kind === "edge"
        ? edge !== null && parseWeight(edgeWeight) !== null
        : false;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen) return;
        closeEditDialog();
      }}
    >
      <DialogContent>
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();

            if (kind === "node" && node) {
              const next = nodeLabel.trim();
              if (next.length === 0) return;

              updateNode(node.id, { label: next });
              closeEditDialog();
              return;
            }

            if (kind === "edge" && edge) {
              const next = parseWeight(edgeWeight);
              if (next === null) return;

              updateEdge(edge.id, { weight: next });
              closeEditDialog();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {kind === "node" && node && (
            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium">Label</div>
              <Input
                value={nodeLabel}
                onChange={(e) => setNodeLabel(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {kind === "edge" && edge && (
            <div className="mt-4 space-y-2">
              <div className="text-sm font-medium">Weight</div>
              <Input
                value={edgeWeight}
                inputMode="decimal"
                placeholder="(empty = unweighted)"
                onChange={(e) => {
                  const next = normalizeMinus(e.target.value);
                  if (!WEIGHT_ALLOWED_RE.test(next)) return;
                  setEdgeWeight(next);
                }}
                autoFocus
              />
            </div>
          )}

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={closeEditDialog}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className={cn(
                canSubmit
                  ? "cursor-pointer"
                  : "cursor-not-allowed disabled:pointer-events-auto",
              )}
            >
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
