import { itemReference } from "../../../shared/src/domain/identity.js";

export type LocalBridge = { postMessage(message: unknown): void };

const targetFields: Record<string, string> = {
  updateTask: "taskId",
  setTaskDone: "taskId",
  editItem: "id",
  deleteItem: "id",
  selectEvent: "eventId",
  addEvent: "projectId",
  addStory: "eventId",
  addEventTask: "eventId",
  addTask: "storyId",
  moveProject: "projectId",
};

export function scopedOperation(
  message: Record<string, unknown>,
): Record<string, unknown> {
  const field = targetFields[String(message.type)];
  const key = message[field];
  if (!field || typeof key !== "string") return message;
  const ref = itemReference(key);
  const result: Record<string, unknown> = {
    ...message,
    [field]: ref.id,
    ...(ref.projectFile ? { projectFile: ref.projectFile } : {}),
  };
  if (
    message.type === "moveProject" &&
    typeof message.targetProjectId === "string"
  ) {
    const target = itemReference(message.targetProjectId);
    result.targetProjectId = target.id;
    if (target.projectFile) result.targetProjectFile = target.projectFile;
  }
  return result;
}

export function postOperation(
  bridge: LocalBridge | undefined,
  message: Record<string, unknown>,
): void {
  bridge?.postMessage(scopedOperation(message));
}

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
    bridge.postMessage({ ...scopedOperation(message), requestId });
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
  postOperation(bridge, { type: "updateTask", taskId, points });
}
