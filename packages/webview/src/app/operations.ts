export type LocalBridge = { postMessage(message: unknown): void };

let nextRequestId = 1;
const pending = new Map<number, (ok: boolean) => void>();

export function sendOperation(
  bridge: LocalBridge | undefined,
  message: Record<string, unknown>,
): Promise<boolean> {
  if (!bridge) return Promise.resolve(false);
  const requestId = nextRequestId++;
  return new Promise((resolve) => {
    pending.set(requestId, resolve);
    bridge.postMessage({ ...message, requestId });
  });
}

export function subscribeOperationResults(
  onError: (error: string | null) => void,
): () => void {
  const handler = (event: MessageEvent) => {
    const message = event.data;
    if (
      message?.type !== "operationResult" ||
      typeof message.payload?.ok !== "boolean"
    )
      return;
    const ok = message.payload.ok;
    if (typeof message.requestId === "number") {
      pending.get(message.requestId)?.(ok);
      pending.delete(message.requestId);
    }
    onError(
      ok
        ? null
        : typeof message.payload.error === "string"
          ? message.payload.error
          : "操作に失敗しました",
    );
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}

/** NREQ-001: WebviewのTask変更をVS Codeのローカル通信へ送る。 */
export function postTaskPoints(
  bridge: LocalBridge,
  taskId: string,
  points: 1 | 2 | 3 | 5 | 8 | 13 | 21 | null,
): void {
  bridge.postMessage({ type: "updateTask", taskId, points });
}
