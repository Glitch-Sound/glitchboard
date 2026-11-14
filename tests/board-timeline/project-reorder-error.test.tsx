// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Snapshot } from "../../packages/shared/src/domain/messages.js";

const postMessage = vi.hoisted(() => vi.fn());
vi.mock("../../packages/webview/src/app/bridge.js", () => ({
  localBridge: () => ({ postMessage }),
}));

import { BoardApp } from "../../packages/webview/src/app/board.js";

const projects = ["Alpha", "Beta", "Gamma"].map((name, index) => ({
  id: `11111111-1111-4111-8111-11111111111${index}`,
  name,
  color: "#123456",
  events: [
    {
      id: `22222222-2222-4222-8222-22222222222${index}`,
      name: `${name} Event`,
      due: "2099-01-01",
      stories: [],
    },
  ],
}));
const snapshot: Snapshot = {
  version: 1,
  projects,
  selectedEventId: projects[0].events[0].id,
  settings: { workdays_off: [], public_holidays: false },
  error: null,
  projectEntries: projects.map((p) => ({
    file: `${p.name}.yaml`,
    name: p.name,
    load: true,
  })),
};
const emit = (data: unknown) =>
  act(() => window.dispatchEvent(new MessageEvent("message", { data })));
const moves = () =>
  postMessage.mock.calls
    .map(([message]) => message)
    .filter((message) => message.type === "moveProject");
afterEach(() => {
  cleanup();
  postMessage.mockClear();
});

describe("REQ-032-S05 並べ替え保存失敗の復帰", () => {
  it("失敗理由を示して順序と選択を維持し、再操作の保存済み状態を反映する", async () => {
    const { container } = render(<BoardApp />);
    emit({ type: "snapshot", payload: snapshot });
    const order = () =>
      [...container.querySelectorAll(".project-name")].map(
        (node) => node.textContent,
      );
    const handle = screen.getByRole("button", { name: "Alphaを並べ替え" });
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    const request = moves()[0];
    expect(request).toMatchObject({
      projectId: projects[0].id,
      targetProjectId: projects[1].id,
      placement: "after",
    });
    expect(handle).toHaveProperty("disabled", true);
    expect(order()).toEqual(["Alpha", "Beta", "Gamma"]);
    emit({
      type: "operationResult",
      requestId: request.requestId,
      payload: { ok: false, error: "EACCES: manage.yamlへ書き込めない" },
    });
    await waitFor(() => expect(handle).toHaveProperty("disabled", false));
    expect(screen.getByRole("alert").textContent).toContain("EACCES");
    expect(order()).toEqual(["Alpha", "Beta", "Gamma"]);
    expect(container.querySelector(".event-summary h2")?.textContent).toContain(
      "Alpha Event",
    );
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    expect(moves()).toHaveLength(2);
    const retry = moves()[1];
    expect(retry.requestId).not.toBe(request.requestId);
    emit({
      type: "snapshot",
      payload: {
        ...snapshot,
        version: 2,
        projects: [projects[1], projects[0], projects[2]],
      },
    });
    emit({
      type: "operationResult",
      requestId: retry.requestId,
      payload: { ok: true },
    });
    await waitFor(() => expect(handle).toHaveProperty("disabled", false));
    expect(screen.queryByRole("alert")).toBeNull();
    expect(order()).toEqual(["Beta", "Alpha", "Gamma"]);
    expect(container.querySelector(".event-summary h2")?.textContent).toContain(
      "Alpha Event",
    );
  });
});
