import type * as React from "react";
import { Separator } from "@/components/ui/separator";
import type {
  EditorMode,
  GraphEdge,
  GraphNode,
  Selection,
} from "@/core/graph/types";

export type InfoOverlayProps = {
  isOpen: boolean;
  selection: Selection;
  node: GraphNode | null;
  edge: GraphEdge | null;
  mode: EditorMode;
  nodesCount: number;
  edgesCount: number;
};

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="text-[11px] text-white/70">{label}</div>
      <div className="min-w-0 font-mono text-[11px] text-white/90">{value}</div>
    </div>
  );
}

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

export function InfoOverlay({
  isOpen,
  selection,
  node,
  edge,
  mode,
  nodesCount,
  edgesCount,
}: InfoOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="pointer-events-auto w-90 rounded-lg bg-black/60 px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
      <div className="space-y-3">
        <Section title="Graph">
          <Field label="mode" value={mode} />
          <Field label="nodes" value={nodesCount} />
          <Field label="edges" value={edgesCount} />
          <Field
            label="selected"
            value={
              selection.focus
                ? `${selection.focus.kind}: ${selection.focus.id}`
                : "(none)"
            }
          />
          <Field label="selectedNodes" value={selection.nodeIds.length} />
          <Field label="selectedEdges" value={selection.edgeIds.length} />
        </Section>

        {node && (
          <>
            <Separator className="bg-white/10" />
            <Section title="Node">
              <Field label="id" value={node.id} />
              <Field label="label" value={node.label} />
              <Field label="x" value={Math.round(node.x)} />
              <Field label="y" value={Math.round(node.y)} />
            </Section>
          </>
        )}

        {edge && (
          <>
            <Separator className="bg-white/10" />
            <Section title="Edge">
              <Field label="id" value={edge.id} />
              <Field
                label="directed"
                value={edge.directed ? "true" : "false"}
              />
              <Field label="source" value={edge.source} />
              <Field label="target" value={edge.target} />
              <Field
                label="weight"
                value={edge.weight === undefined ? "(none)" : edge.weight}
              />
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
