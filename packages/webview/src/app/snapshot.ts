import {
  type Snapshot,
  snapshotMessageSchema,
} from "../../../shared/src/domain/messages.js";
import { localBridge } from "./bridge.js";

export type { Snapshot };

/** REQ-013: Extensionから届く版番号付きスナップショットを購読する。 */
export function subscribeSnapshots(
  onSnapshot: (snapshot: Snapshot) => void,
): () => void {
  const handler = (event: MessageEvent) => {
    const message = snapshotMessageSchema.safeParse(event.data);
    if (message.success) onSnapshot(message.data.payload);
  };
  window.addEventListener("message", handler);
  localBridge()?.postMessage({ type: "ready" });
  return () => window.removeEventListener("message", handler);
}
