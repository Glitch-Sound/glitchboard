import type { LocalBridge } from "./operations.js";

let bridge: LocalBridge | undefined;

export function localBridge(): LocalBridge | undefined {
  if (!bridge) {
    bridge = (
      globalThis as typeof globalThis & { acquireVsCodeApi?: () => LocalBridge }
    ).acquireVsCodeApi?.();
  }
  return bridge;
}
