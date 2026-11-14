import { expect, it, vi } from "vitest";
import {
  connectionChangeRequestSchema,
  connectionChangeResultSchema,
  connectionChangeSettledSchema,
  operationConnectionSchema,
} from "../../packages/shared/src/domain/messages.js";
import { connectionBridge } from "../../packages/webview/src/app/operations.js";

it("REQ-014-S01 REQ-013-S09 接続要求、応答、操作の識別子を共有境界で検証する", () => {
  expect(
    connectionChangeRequestSchema.parse({
      type: "prepareConnectionChange",
      requestId: 1,
    }),
  ).toEqual({ type: "prepareConnectionChange", requestId: 1 });
  expect(
    connectionChangeSettledSchema.parse({
      type: "connectionChangeSettled",
      requestId: 1,
    }),
  ).toEqual({ type: "connectionChangeSettled", requestId: 1 });
  expect(
    connectionChangeResultSchema.parse({
      type: "connectionChangeResult",
      requestId: 1,
      ok: false,
    }),
  ).toEqual({ type: "connectionChangeResult", requestId: 1, ok: false });
  for (const requestId of [0, -1, 0.5, "1", undefined]) {
    expect(
      connectionChangeSettledSchema.safeParse({
        type: "connectionChangeSettled",
        requestId,
      }).success,
    ).toBe(false);
    expect(
      connectionChangeRequestSchema.safeParse({
        type: "prepareConnectionChange",
        requestId,
      }).success,
    ).toBe(false);
    expect(
      connectionChangeResultSchema.safeParse({
        type: "connectionChangeResult",
        requestId,
        ok: true,
      }).success,
    ).toBe(false);
  }
  expect(
    connectionChangeResultSchema.safeParse({
      type: "connectionChangeResult",
      requestId: 1,
      ok: "true",
    }).success,
  ).toBe(false);
  expect(
    connectionChangeResultSchema.safeParse({
      type: "connectionChangeResult",
      requestId: 1,
      ok: true,
      extra: true,
    }).success,
  ).toBe(false);
  expect(
    operationConnectionSchema.parse({
      type: "addTask",
      connectionId: "/a/manage.yaml",
    }),
  ).toEqual({ connectionId: "/a/manage.yaml" });
  expect(operationConnectionSchema.parse({ type: "addTask" })).toEqual({});
  expect(
    operationConnectionSchema.safeParse({ connectionId: "" }).success,
  ).toBe(false);
  expect(operationConnectionSchema.safeParse({ connectionId: 1 }).success).toBe(
    false,
  );
});
it("REQ-013-S09 要求は表示時の接続に束縛し、入力による接続上書きを受け付けない", () => {
  const postMessage = vi.fn();
  connectionBridge({ postMessage }, "/a/manage.yaml")?.postMessage({
    type: "addTask",
    connectionId: "/b/manage.yaml",
    name: "Source",
  });
  expect(postMessage.mock.calls).toEqual([
    [{ type: "addTask", connectionId: "/a/manage.yaml", name: "Source" }],
  ]);
  expect(connectionBridge(undefined, "/a/manage.yaml")).toBeUndefined();
});
