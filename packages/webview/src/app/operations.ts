export type LocalBridge = { postMessage(message: unknown): void };

/** NREQ-001: WebviewのTask変更をVS Codeのローカル通信へ送る。 */
export function postTaskPoints(
  bridge: LocalBridge,
  taskId: string,
  points: 1 | 2 | 3 | 5 | 8 | 13 | 21 | null,
): void {
  bridge.postMessage({ type: "updateTask", taskId, points });
}
