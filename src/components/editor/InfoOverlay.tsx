import type * as React from "react";
import { Separator } from "@/components/ui/separator";
import type { OverlayState } from "@/core/algorithms/types";
import type {
  EditorMode,
  GraphEdge,
  GraphNode,
  Selection,
} from "@/core/graph/types";
import type { ActiveToolbar, CanvasCamera } from "@/stores/graphUiStore";

export type InfoOverlayProps = {
  isOpen: boolean;
  activeToolbar: ActiveToolbar;
  algorithmOverlay: OverlayState | null;
  selection: Selection;
  node: GraphNode | null;
  edge: GraphEdge | null;
  mode: EditorMode;
  nodesCount: number;
  edgesCount: number;
  camera: CanvasCamera | null;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1">
      <div className="text-[11px] font-semibold tracking-wide text-white/80 uppercase">
        {title}
      </div>
      <div className="space-y-1">{children}</div>
    </section>
  );
}

function Field({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 text-[11px] text-white/70">{label}</div>
      <div className="min-w-0 flex-1 text-right font-mono text-[11px] wrap-break-word whitespace-normal text-white/90">
        {value}
      </div>
    </div>
  );
}

function fmt(n: number) {
  return n.toFixed(2);
}

export function InfoOverlay({
  isOpen,
  activeToolbar,
  algorithmOverlay,
  selection,
  node,
  edge,
  mode,
  nodesCount,
  edgesCount,
  camera,
}: InfoOverlayProps) {
  if (!isOpen) return null;

  const overlay =
    algorithmOverlay ??
    ({
      activeNodeIds: [],
      visitedNodeIds: [],
      frontierNodeIds: [],
      activeEdgeIds: [],
      frontierEdgeIds: [],
    } satisfies OverlayState);

  return (
    <div className="w-90 rounded-lg bg-black/60 px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
      <div className="space-y-3">
        <Section title="Graph">
          <Field label="mode" value={mode} />
          <Field label="nodes" value={nodesCount} />
          <Field label="edges" value={edgesCount} />
        </Section>

        {camera && (
          <>
            <Separator className="bg-white/10" />
            <Section title="Camera">
              <Field label="x" value={fmt(camera.x)} />
              <Field label="y" value={fmt(camera.y)} />
              <Field label="scale" value={fmt(camera.scale)} />
              <Field label="viewWidth" value={fmt(camera.viewWidth)} />
              <Field label="viewHeight" value={fmt(camera.viewHeight)} />
            </Section>
          </>
        )}

        {mode === "select" && activeToolbar === "graph" && (
          <>
            <Separator className="bg-white/10" />
            <Section title="Selection">
              <Field
                label="selected"
                value={
                  selection.nodeIds.length + selection.edgeIds.length === 0
                    ? "(none)"
                    : `${selection.nodeIds.length} node(s), ${selection.edgeIds.length} edge(s)`
                }
              />
              <Field
                label="selectedNodeIds"
                value={selection.nodeIds.join(", ")}
              />
              <Field
                label="drag"
                value={
                  mode !== "select"
                    ? "(n/a)"
                    : selection.nodeIds.length > 1
                      ? `multi (drag selected moves ${selection.nodeIds.length})`
                      : "single"
                }
              />
            </Section>
          </>
        )}

        {activeToolbar === "algorithms" && (
          <>
            <Separator className="bg-white/10" />
            <Section title="Algorithm (nodes)">
              <Field
                label="activeNodeIds"
                value={
                  overlay.activeNodeIds.length === 0
                    ? "(none)"
                    : overlay.activeNodeIds.join(", ")
                }
              />
              <Field
                label="visitedNodeIds"
                value={
                  overlay.visitedNodeIds.length === 0
                    ? "(none)"
                    : overlay.visitedNodeIds.join(", ")
                }
              />
              <Field
                label="frontierNodeIds"
                value={
                  overlay.frontierNodeIds.length === 0
                    ? "(none)"
                    : overlay.frontierNodeIds.join(", ")
                }
              />
            </Section>
          </>
        )}

        {activeToolbar === "algorithms" && (
          <>
            <Separator className="bg-white/10" />
            <Section title="Algorithm (edges)">
              <Field
                label="activeEdgeIds"
                value={
                  overlay.activeEdgeIds.length === 0
                    ? "(none)"
                    : overlay.activeEdgeIds.join(", ")
                }
              />
              <Field
                label="frontierEdgeIds"
                value={
                  overlay.frontierEdgeIds.length === 0
                    ? "(none)"
                    : overlay.frontierEdgeIds.join(", ")
                }
              />
            </Section>
          </>
        )}

        {selection.focus && (
          <>
            <Separator className="bg-white/10" />
            <Section title="Focus">
              <Field label="kind" value={selection.focus.kind} />
              {node && (
                <>
                  <Field label="id" value={node.id} />
                  <Field label="label" value={node.label} />
                  <Field label="x" value={Math.round(node.x)} />
                  <Field label="y" value={Math.round(node.y)} />
                </>
              )}
              {edge && (
                <>
                  <Field label="id" value={edge.id} />
                  <Field
                    label="weight"
                    value={edge.weight === undefined ? "(none)" : edge.weight}
                  />
                  <Field
                    label="isDirected"
                    value={edge.isDirected ? "true" : "false"}
                  />
                  <Field label="source" value={edge.source} />
                  <Field label="target" value={edge.target} />
                </>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
