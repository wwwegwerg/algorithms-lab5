import * as React from "react";
import { AlertTriangleIcon, InfoIcon } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { selectOverlay, useAlgorithmStore } from "@/stores/algorithmStore";
import { useGraphDataStore } from "@/stores/graphDataStore";
import { useGraphUiStore } from "@/stores/graphUiStore";

type ToastKind = "error" | "info";

export function EditorToast() {
  const activeToolbar = useGraphUiStore((s) => s.activeToolbar);

  const { graphMessage, graphMessageKey } = useGraphDataStore(
    useShallow((s) => ({
      graphMessage: s.lastError,
      graphMessageKey: s.lastError ? `graph:${s.errorNonce}` : null,
    })),
  );

  const { algorithmId, stepIndex } = useAlgorithmStore(
    useShallow((s) => ({ algorithmId: s.algorithmId, stepIndex: s.stepIndex })),
  );
  const algorithmOverlay = useAlgorithmStore(selectOverlay);

  const algorithmMessage =
    activeToolbar === "algorithms" ? (algorithmOverlay?.message ?? null) : null;
  const algorithmMessageKey = algorithmMessage
    ? `algo:${algorithmId}:${stepIndex}`
    : null;

  const message = graphMessage ?? algorithmMessage;
  const messageKey = graphMessageKey ?? algorithmMessageKey;
  const kind: ToastKind = graphMessage ? "error" : "info";

  const [toast, setToast] = React.useState<{
    key: string;
    kind: ToastKind;
    message: string;
  } | null>(null);
  const [isToastOpen, setIsToastOpen] = React.useState(false);

  React.useEffect(() => {
    const EXIT_MS = 200;
    // const DURATION_MS = kind === "error" ? 4000 : 1200;
    const DURATION_MS = 4000;

    if (!message || !messageKey) {
      setIsToastOpen(false);
      const id = window.setTimeout(() => setToast(null), EXIT_MS);
      return () => window.clearTimeout(id);
    }

    setToast({ key: messageKey, kind, message });
    setIsToastOpen(true);

    const hideId = window.setTimeout(() => setIsToastOpen(false), DURATION_MS);
    const unmountId = window.setTimeout(
      () => setToast(null),
      DURATION_MS + EXIT_MS,
    );

    return () => {
      window.clearTimeout(hideId);
      window.clearTimeout(unmountId);
    };
  }, [kind, message, messageKey]);

  return (
    toast && (
      <div className="pointer-events-none fixed inset-y-0 left-3 z-50 flex items-center">
        <div className="pointer-events-auto w-90 max-w-[calc(100vw-24px)]">
          <div
            key={toast.key}
            data-state={isToastOpen ? "open" : "closed"}
            className="duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-left-2 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-2 motion-reduce:animate-none"
          >
            <Alert
              variant={toast.kind === "error" ? "destructive" : "default"}
              className="shadow-lg ring-1 ring-foreground/10"
            >
              {toast.kind === "error" ? <AlertTriangleIcon /> : <InfoIcon />}
              <AlertTitle>
                {toast.kind === "error" ? "Ошибка графа" : "Алгоритм"}
              </AlertTitle>
              <AlertDescription>{toast.message}</AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  );
}
