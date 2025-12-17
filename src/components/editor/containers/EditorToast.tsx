import * as React from "react";
import { AlertTriangleIcon } from "lucide-react";
import { useShallow } from "zustand/shallow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useGraphDataStore } from "@/store/graphDataStore";

export function EditorToast() {
  const { message, messageKey } = useGraphDataStore(
    useShallow((s) => ({
      message: s.lastError,
      messageKey: s.lastError ? `graph:${s.errorNonce}` : null,
    })),
  );

  const [toast, setToast] = React.useState<{
    key: string;
    message: string;
  } | null>(null);
  const [isToastOpen, setIsToastOpen] = React.useState(false);

  React.useEffect(() => {
    const EXIT_MS = 200;

    if (!message || !messageKey) {
      setIsToastOpen(false);
      const id = window.setTimeout(() => setToast(null), EXIT_MS);
      return () => window.clearTimeout(id);
    }

    setToast({ key: messageKey, message });
    setIsToastOpen(true);

    const hideId = window.setTimeout(() => setIsToastOpen(false), 4000);
    const unmountId = window.setTimeout(() => setToast(null), 4000 + EXIT_MS);

    return () => {
      window.clearTimeout(hideId);
      window.clearTimeout(unmountId);
    };
  }, [message, messageKey]);

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
              variant="destructive"
              className="shadow-lg ring-1 ring-foreground/10"
            >
              <AlertTriangleIcon />
              <AlertTitle>Ошибка графа</AlertTitle>
              <AlertDescription>{toast.message}</AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    )
  );
}
