export type ErrorState = {
  lastError: string | null;
  errorNonce: number;
};

export function createErrorState(): ErrorState {
  return { lastError: null, errorNonce: 0 };
}

export function nextErrorState(
  prev: Pick<ErrorState, "errorNonce">,
  message: string | null,
):
  | Pick<ErrorState, "lastError" | "errorNonce">
  | Pick<ErrorState, "lastError"> {
  if (message === null) return { lastError: null };
  return { lastError: message, errorNonce: prev.errorNonce + 1 };
}
