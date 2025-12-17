import type * as React from "react";
import { Separator } from "@/components/ui/separator";

export type HelpOverlayProps = {
  isOpen: boolean;
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

export function HelpOverlay({ isOpen }: HelpOverlayProps) {
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
        <Separator className="bg-white/10" />
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
          <Row left="select: double click node" right="редактировать label" />
          <Row left="select: double click edge" right="редактировать weight" />
          <Row
            left={
              <>
                <Kbd>Space</Kbd> + drag
              </>
            }
            right="панорамирование"
          />
          <Row left="middle mouse: drag" right="панорамирование" />
          <Row left="scroll" right="панорамирование" />
          <Row left="Ctrl/⌘ + scroll" right="zoom" />
          <Row left="edge: click blank" right="отменить выбор source" />
        </Section>
        <Separator className="bg-white/10" />
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
          <Row left={<Kbd>0</Kbd>} right="центрировать (0,0)" />
          <Row
            left={<Kbd>Esc</Kbd>}
            right="отменить добавление ребра (edge mode)"
          />
        </Section>
      </div>
    </div>
  );
}
