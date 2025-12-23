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
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
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
  const {
    activeToolbar,
    isEditDialogOpen,
    editTarget,
    closeEditDialog,
    dismissEditDialog,
    finalizeCloseEditDialog,
  } = useGraphUiStore(
    useShallow((s) => ({
      activeToolbar: s.activeToolbar,
      isEditDialogOpen: s.isEditDialogOpen,
      editTarget: s.editTarget,
      closeEditDialog: s.closeEditDialog,
      dismissEditDialog: s.dismissEditDialog,
      finalizeCloseEditDialog: s.finalizeCloseEditDialog,
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

  const isOpen = isEditDialogOpen;

  React.useEffect(() => {
    if (activeToolbar !== "algorithms") return;
    if (!isOpen) return;
    dismissEditDialog();
  }, [activeToolbar, dismissEditDialog, isOpen]);

  const [nodeLabel, setNodeLabel] = React.useState("");
  const [edgeWeight, setEdgeWeight] = React.useState("");
  const [nodeLabelTouched, setNodeLabelTouched] = React.useState(false);
  const [edgeWeightTouched, setEdgeWeightTouched] = React.useState(false);

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
  const closingTargetKeyRef = React.useRef<string | null>(null);

  const requestClose = React.useCallback(() => {
    closingTargetKeyRef.current = editTarget
      ? `${editTarget.kind}:${editTarget.id}`
      : null;
    closeEditDialog();
  }, [closeEditDialog, editTarget]);

  const finalizeClose = React.useCallback(
    (e: React.AnimationEvent | React.TransitionEvent) => {
      if (e.currentTarget !== e.target) return;
      if (isOpen) return;
      if (!closingTargetKeyRef.current) return;

      finalizeCloseEditDialog(closingTargetKeyRef.current);
      closingTargetKeyRef.current = null;
    },
    [finalizeCloseEditDialog, isOpen],
  );

  React.useEffect(() => {
    if (!isOpen || !editTarget) {
      lastTargetKeyRef.current = null;
      setNodeLabelTouched(false);
      setEdgeWeightTouched(false);
      return;
    }
    const key = `${editTarget.kind}:${editTarget.id}`;
    if (lastTargetKeyRef.current !== key) {
      lastTargetKeyRef.current = key;
      if (editTarget.kind === "node") {
        if (!node) {
          dismissEditDialog();
          return;
        }
        setNodeLabel(node.label ?? "");
        setNodeLabelTouched(false);
        return;
      }
      if (editTarget.kind === "edge") {
        if (!edge) {
          dismissEditDialog();
          return;
        }
        setEdgeWeight(edge.weight === undefined ? "" : String(edge.weight));
        setEdgeWeightTouched(false);
      }
      return;
    }
    if (editTarget.kind === "node" && !node) {
      dismissEditDialog();
    }
    if (editTarget.kind === "edge" && !edge) {
      dismissEditDialog();
    }
  }, [dismissEditDialog, editTarget, edge, node, isOpen]);

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

  const isValid =
    kind === "node"
      ? node !== null && nodeLabel.trim().length > 0
      : kind === "edge"
        ? edge !== null && parseWeight(edgeWeight) !== null
        : false;

  if (activeToolbar === "algorithms") return null;
  if (!isOpen && !editTarget) return null;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(nextOpen) => {
        if (nextOpen) return;
        requestClose();
      }}
    >
      <DialogContent
        onAnimationEnd={finalizeClose}
        onTransitionEnd={finalizeClose}
      >
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();

            if (kind === "node" && node) {
              const next = nodeLabel.trim();
              if (next.length === 0) return;

              updateNode(node.id, { label: next });
              requestClose();
              return;
            }

            if (kind === "edge" && edge) {
              const next = parseWeight(edgeWeight);
              if (next === null) return;

              updateEdge(edge.id, { weight: next });
              requestClose();
            }
          }}
        >
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {kind === "node" && node && (
            <FieldGroup className="mt-4">
              <Field data-invalid={nodeLabel.trim().length === 0}>
                <FieldLabel htmlFor="node-label-input">Label</FieldLabel>
                <FieldContent>
                  <Input
                    id="node-label-input"
                    value={nodeLabel}
                    aria-invalid={nodeLabel.trim().length === 0}
                    onChange={(e) => {
                      setNodeLabelTouched(true);
                      setNodeLabel(e.target.value);
                    }}
                    onBlur={() => setNodeLabelTouched(true)}
                    autoFocus
                  />
                  {nodeLabelTouched && nodeLabel.trim().length === 0 && (
                    <FieldError>Введите название</FieldError>
                  )}
                </FieldContent>
              </Field>
            </FieldGroup>
          )}

          {kind === "edge" && edge && (
            <FieldGroup className="mt-4">
              <Field data-invalid={parseWeight(edgeWeight) === null}>
                <FieldLabel htmlFor="edge-weight-input">
                  Weight/capacity
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="edge-weight-input"
                    value={edgeWeight}
                    inputMode="decimal"
                    placeholder="(empty = unweighted)"
                    aria-invalid={parseWeight(edgeWeight) === null}
                    onChange={(e) => {
                      const next = normalizeMinus(e.target.value);
                      if (!WEIGHT_ALLOWED_RE.test(next)) return;
                      setEdgeWeight(next);
                    }}
                    onBlur={() => setEdgeWeightTouched(true)}
                    autoFocus
                  />
                  {edgeWeightTouched && parseWeight(edgeWeight) === null && (
                    <FieldError>Введите число</FieldError>
                  )}
                </FieldContent>
              </Field>
            </FieldGroup>
          )}

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={requestClose}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid}
              className={cn(
                isValid
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
