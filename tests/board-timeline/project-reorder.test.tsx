// @vitest-environment jsdom
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Timeline } from "../../packages/webview/src/widgets/timeline/ui/Timeline.js";

afterEach(cleanup);
const projects = ["Alpha", "Beta", "Gamma"].map((name) => ({
  id: name,
  name,
  color: "#123456",
  events: [],
}));
function setup(onMoveProject = vi.fn(async () => true)) {
  const result = render(
    <Timeline
      projects={projects}
      days={["2026-11-11"]}
      today="2026-11-11"
      period="week"
      selectedEventId={null}
      onSelect={vi.fn()}
      onMoveProject={onMoveProject}
    />,
  );
  const rows =
    result.container.querySelectorAll<HTMLTableRowElement>(".project-row");
  vi.spyOn(rows[2], "getBoundingClientRect").mockReturnValue({
    top: 100,
    height: 44,
  } as DOMRect);
  return { ...result, rows, onMoveProject };
}

describe("REQ-032 Projectのドラッグ並べ替え", () => {
  it("REQ-032-S06 上下キーで隣へ移動し、先頭と末尾では送信しない", async () => {
    const { onMoveProject } = setup();
    fireEvent.keyDown(screen.getByRole("button", { name: "Alphaを並べ替え" }), {
      key: "ArrowUp",
    });
    fireEvent.keyDown(screen.getByRole("button", { name: "Gammaを並べ替え" }), {
      key: "ArrowDown",
    });
    expect(onMoveProject).not.toHaveBeenCalled();
    const middle = screen.getByRole("button", { name: "Betaを並べ替え" });
    fireEvent.keyDown(middle, { key: "ArrowUp" });
    expect(onMoveProject).toHaveBeenLastCalledWith("Beta", "Alpha", "before");
    await waitFor(() => expect(middle).toHaveProperty("disabled", false));
    fireEvent.keyDown(middle, { key: "ArrowDown" });
    expect(onMoveProject).toHaveBeenLastCalledWith("Beta", "Gamma", "after");
    await waitFor(() => expect(middle).toHaveProperty("disabled", false));
  });

  it.each([
    ["REQ-032-S01", 105, "before"],
    ["REQ-032-S02", 140, "after"],
  ] as const)(
    "%s 行のY=%sへドロップすると%sへ保存要求を送る",
    async (_scenario, clientY, placement) => {
      const { rows, onMoveProject } = setup();
      const dataTransfer = {
        setData: vi.fn(),
        setDragImage: vi.fn(),
        effectAllowed: "",
        dropEffect: "",
      };
      fireEvent.dragStart(
        screen.getByRole("button", { name: "Alphaを並べ替え" }),
        { dataTransfer },
      );
      const over = new MouseEvent("dragover", {
        bubbles: true,
        cancelable: true,
        clientY,
      });
      Object.defineProperty(over, "dataTransfer", { value: dataTransfer });
      fireEvent(rows[2], over);
      expect(rows[2].dataset.drop).toBe(placement);
      const drop = new MouseEvent("drop", {
        bubbles: true,
        cancelable: true,
        clientY,
      });
      Object.defineProperty(drop, "dataTransfer", { value: dataTransfer });
      fireEvent(rows[2], drop);
      await waitFor(() =>
        expect(onMoveProject).toHaveBeenCalledWith("Alpha", "Gamma", placement),
      );
      expect(rows[2].dataset.drop).toBeUndefined();
    },
  );

  it("REQ-032-S04/S05/S06 外部ドロップとキャンセルを無視し、保存失敗後もキーボードで操作できる", async () => {
    const onMoveProject = vi.fn(async () => false);
    const { rows } = setup(onMoveProject);
    const handle = screen.getByRole("button", { name: "Alphaを並べ替え" });
    fireEvent.drop(rows[2]);
    expect(onMoveProject).not.toHaveBeenCalled();
    const dataTransfer = { setData: vi.fn(), setDragImage: vi.fn() };
    fireEvent.dragStart(handle, { dataTransfer });
    fireEvent.drop(rows[0], { dataTransfer });
    expect(onMoveProject).not.toHaveBeenCalled();
    fireEvent.dragStart(handle, { dataTransfer });
    fireEvent.dragEnd(handle);
    fireEvent.drop(rows[2]);
    expect(onMoveProject).not.toHaveBeenCalled();
    fireEvent.keyDown(handle, { key: "ArrowUp" });
    expect(onMoveProject).not.toHaveBeenCalled();
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    await waitFor(() => expect(handle).toHaveProperty("disabled", false));
    expect(onMoveProject).toHaveBeenCalledWith("Alpha", "Beta", "after");
    fireEvent.keyDown(handle, { key: "ArrowDown" });
    await waitFor(() => expect(onMoveProject).toHaveBeenCalledTimes(2));
  });
});
