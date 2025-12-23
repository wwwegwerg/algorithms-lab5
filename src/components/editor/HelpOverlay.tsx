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

function Field({
  label,
  value,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 font-mono text-[11px] leading-relaxed text-white/90">
        {label}
      </div>
      <div className="min-w-0 flex-1 text-right text-[11px] leading-relaxed wrap-break-word whitespace-normal text-white/70">
        {value}
      </div>
    </div>
  );
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded bg-white/10 px-1 py-0.5 font-mono text-[11px] leading-none text-white/90">
      {children}
    </span>
  );
}

export function HelpOverlay({ isOpen }: HelpOverlayProps) {
  if (!isOpen) return null;

  return (
    <div className="w-90 rounded-lg bg-black/60 px-3 py-2 text-xs text-white shadow-lg ring-1 ring-white/10 backdrop-blur">
      <div className="space-y-3">
        <Section title="Modes">
          <Field
            label={
              <>
                <Kbd>select</Kbd>/<Kbd>1</Kbd>
              </>
            }
            value="выделение/перетаскивание"
          />
          <Field
            label={
              <>
                <Kbd>add_node</Kbd>/<Kbd>2</Kbd>
              </>
            }
            value="клик по полотну добавляет вершину"
          />
          <Field
            label={
              <>
                <Kbd>add_edge</Kbd>/<Kbd>3</Kbd>
              </>
            }
            value="клик по source, затем по target"
          />
          <Field
            label={
              <>
                <Kbd>delete</Kbd>/<Kbd>4</Kbd>
              </>
            }
            value="клик по вершине/ребру удаляет"
          />
        </Section>
        <Separator className="bg-white/10" />
        <Section title="Mouse">
          <Field label="select: drag node" value="переместить вершину" />
          <Field label="select: drag blank" value="прямоугольное выделение" />
          <Field
            label={
              <>
                <Kbd>Shift</Kbd> + select: click/drag
              </>
            }
            value="добавить к выделению"
          />
          <Field label="select: click blank" value="очистить выделение" />
          <Field
            label="select: double click node"
            value="редактировать label"
          />
          <Field
            label="select: double click edge"
            value="редактировать weight"
          />
          <Field
            label={
              <>
                <Kbd>Space</Kbd> + drag
              </>
            }
            value="панорамирование"
          />
          <Field label="middle mouse: drag" value="панорамирование" />
          <Field label="scroll" value="панорамирование" />
          <Field
            label={
              <>
                <Kbd>Ctrl/Cmd</Kbd> + scroll
              </>
            }
            value="zoom"
          />
          <Field label="edge: click blank" value="отменить выбор source" />
        </Section>
        <Separator className="bg-white/10" />
        <Section title="Keyboard">
          <Field
            label={
              <>
                <Kbd>3</Kbd> в режиме <Kbd>add_edge</Kbd>
              </>
            }
            value="переключить directed/undirected"
          />
          <Field
            label={
              <>
                <Kbd>Delete</Kbd>/<Kbd>Backspace</Kbd>
              </>
            }
            value="удалить выделенное (все выбранные)"
          />
          <Field label={<Kbd>\</Kbd>} value="переключить Graph/Algorithms" />
          <Field label={<Kbd>0</Kbd>} value="центрировать (0,0)" />
          <Field
            label={<Kbd>Esc</Kbd>}
            value="отменить добавление ребра (edge mode)"
          />
        </Section>
      </div>
    </div>
  );
}
