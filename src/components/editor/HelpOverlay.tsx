import type * as React from "react";
import type { EditorMode } from "@/core/graph/types";

export type HelpOverlayProps = {
  isOpen: boolean;
  mode: EditorMode;
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

function Row({
  left,
  right,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-2 items-start gap-3">
      <div className="min-w-0 font-mono text-[11px] leading-relaxed text-white/90">
        {left}
      </div>
      <div className="min-w-0 text-right text-[11px] leading-relaxed text-white/80">
        {right}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded bg-white/10 px-1 py-0.5 font-mono text-[11px] leading-none text-white">
      {children}
    </span>
  );
}

export function HelpOverlay({ isOpen, mode }: HelpOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="pointer-events-auto w-90 rounded-lg bg-black/60 px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
      <div className="space-y-3">
        <Section title="Modes">
          <Row left={<Kbd>select</Kbd>} right="выделение/перетаскивание" />
          <Row
            left={<Kbd>node</Kbd>}
            right="клик по полотну добавляет вершину"
          />
          <Row left={<Kbd>edge</Kbd>} right="клик по source, затем по target" />
          <Row left={<Kbd>delete</Kbd>} right="клик по вершине/ребру удаляет" />
        </Section>

        <Section title="Mouse">
          <Row left="select: drag node" right="переместить вершину" />
          <Row left="select: drag blank" right="прямоугольное выделение" />
          <Row
            left={
              <>
                <Kbd>Shift</Kbd> + select: click/drag
              </>
            }
            right="добавить к выделению"
          />
          <Row left="select: click blank" right="очистить выделение" />
          <Row left="edge: click blank" right="отменить выбор source" />
        </Section>

        <Section title="Keyboard">
          <Row
            left={
              <span className="inline-flex flex-wrap items-center gap-1">
                <Kbd>Delete</Kbd>
                <span className="text-white/60">/</span>
                <Kbd>Backspace</Kbd>
              </span>
            }
            right="удалить выделенное (все выбранные)"
          />
          <Row
            left={<Kbd>Esc</Kbd>}
            right="отменить добавление ребра (edge mode)"
          />
        </Section>

        <div className="border-t border-white/10 pt-2 text-[11px] text-white/70">
          mode: <span className="font-mono text-white/90">{mode}</span>
        </div>
      </div>
    </div>
  );
}
