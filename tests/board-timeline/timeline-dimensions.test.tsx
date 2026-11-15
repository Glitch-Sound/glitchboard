// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Timeline } from "../../packages/webview/src/widgets/timeline/index.js";
import { timelineDimensions as dimensions } from "../../packages/webview/src/widgets/timeline/model/dimensions.js";

beforeEach(() => {
  vi.stubGlobal(
    "PointerEvent",
    class extends MouseEvent {
      pointerId: number;
      constructor(type: string, init: PointerEventInit) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
      }
    },
  );
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
const projects = [0, 1, 2].map((index) => ({
  id: `project-${index}`,
  name: `Project ${index}`,
  color: "#123456",
  events: [],
}));
function setup(
  initialLayout?: { width: number; height: number },
  empty = false,
) {
  const change = vi.fn(),
    select = vi.fn(),
    detail = vi.fn(),
    move = vi.fn();
  const { container } = render(
    <Timeline
      projects={empty ? [] : projects}
      days={["2099-01-01"]}
      today="2099-01-01"
      period="week"
      selectedEventId={null}
      onSelect={vi.fn()}
      onSelectProject={select}
      onOpenDetail={detail}
      onMoveProject={move}
      initialLayout={initialLayout}
      onLayoutChange={change}
    />,
  );
  const width = screen.getByRole("separator", {
    name: "Project列幅",
  });
  const height = empty
    ? null
    : screen.getByRole("separator", {
        name: "Project 0から全Projectの行高",
      });
  for (const handle of screen.getAllByRole("separator"))
    Object.assign(handle, {
      setPointerCapture: vi.fn(),
      hasPointerCapture: () => true,
      releasePointerCapture: vi.fn(),
    });
  const value = (handle: HTMLElement) =>
    Number(handle.getAttribute("aria-valuenow"));
  return {
    container,
    width,
    height: height as HTMLElement,
    change,
    select,
    detail,
    move,
    value,
  };
}

it("REQ-040-S02 REQ-040-S11 境界のキー、初期化と取消は共通の寸法と範囲を使う", () => {
  const { width, height, value } = setup();
  fireEvent.keyDown(width, { key: "ArrowRight" });
  expect(value(width)).toBe(dimensions.width.initial + dimensions.step);
  fireEvent.keyDown(width, { key: "Escape" });
  expect(value(width)).toBe(dimensions.width.initial);
  fireEvent.keyDown(height, { key: "End" });
  expect(value(height)).toBe(dimensions.height.max);
  fireEvent.keyDown(height, { key: "ArrowDown" });
  expect(value(height)).toBe(dimensions.height.max);
  fireEvent.keyDown(height, { key: "Home" });
  expect(value(height)).toBe(dimensions.height.initial);
  fireEvent.keyDown(width, { key: "ArrowDown" });
  expect(value(width)).toBe(dimensions.width.initial);
  fireEvent.keyDown(width, { key: "ArrowLeft" });
  fireEvent.doubleClick(width);
  expect(value(width)).toBe(dimensions.width.initial);
  expect(value(height)).toBe(dimensions.height.initial);
});
it("REQ-040-S02 REQ-040-S13 不正な復元値は既定値または上限に収まる", () => {
  const { container, width, height, value } = setup({
    width: Number.NaN,
    height: 1e9,
  });
  expect(value(height)).toBe(dimensions.height.max);
  expect(value(width)).toBe(dimensions.width.initial);
  expect(
    container
      .querySelector<HTMLElement>(".timeline-layout")
      ?.style.getPropertyValue("--project-row-height"),
  ).toBe(`${dimensions.height.max}px`);
});
it("REQ-040-S08 セル右端のドラッグは全境界へ同期し、行選択、詳細と並べ替えに伝わらない", () => {
  const { width, change, select, detail, move, value } = setup();
  const handle = screen.getByRole("separator", {
    name: "Project 1の列幅",
  });
  fireEvent.pointerDown(handle, { button: 2, pointerId: 1, clientX: 300 });
  fireEvent.pointerMove(handle, { pointerId: 1, clientX: 500 });
  expect(value(width)).toBe(dimensions.width.initial);
  fireEvent.pointerDown(handle, { button: 0, pointerId: 4, clientX: 300 });
  fireEvent.pointerMove(handle, { pointerId: 5, clientX: 700 });
  expect(value(width)).toBe(dimensions.width.initial);
  fireEvent.pointerMove(handle, { pointerId: 4, clientX: 337 });
  fireEvent.pointerUp(handle, { pointerId: 4, clientX: 337 });
  fireEvent.click(handle);
  fireEvent.lostPointerCapture(handle, { pointerId: 4 });
  fireEvent.pointerMove(handle, { pointerId: 4, clientX: 500 });
  expect(value(width)).toBe(dimensions.width.initial + 37);
  expect(change).toHaveBeenLastCalledWith({
    width: dimensions.width.initial + 37,
    height: dimensions.height.initial,
  });
  for (const row of projects)
    expect(
      value(
        screen.getByRole("separator", {
          name: `${row.name}の列幅`,
        }),
      ),
    ).toBe(dimensions.width.initial + 37);
  expect(select).not.toHaveBeenCalled();
  expect(detail).not.toHaveBeenCalled();
  expect(move).not.toHaveBeenCalled();
  fireEvent.keyDown(handle, { key: "ArrowRight" });
  fireEvent.keyDown(handle, { key: "Escape" });
  expect(value(width)).toBe(dimensions.width.initial + 37);
});
it("REQ-040-S09 3番目の下端を動かすと境界の距離に合わせて全行の高さを変える", () => {
  const { width, height, change, value } = setup();
  const handle = screen.getByRole("separator", {
    name: "Project 2から全Projectの行高",
  });
  fireEvent.pointerDown(handle, { button: 0, pointerId: 8, clientY: 300 });
  fireEvent.pointerMove(handle, { pointerId: 8, clientY: 330 });
  fireEvent.pointerUp(handle, { pointerId: 8, clientY: 330 });
  expect(value(height)).toBe(dimensions.height.initial + 10);
  expect(value(width)).toBe(dimensions.width.initial);
  expect(change).toHaveBeenLastCalledWith({
    width: dimensions.width.initial,
    height: dimensions.height.initial + 10,
  });
  for (const row of projects)
    expect(
      value(
        screen.getByRole("separator", {
          name: `${row.name}から全Projectの行高`,
        }),
      ),
    ).toBe(dimensions.height.initial + 10);
});
it.each(["Escape", "pointercancel", "lostpointercapture"])(
  "REQ-040-S10 列幅の %s は元の寸法へ戻して後続移動を止める",
  (cancel) => {
    const { width, change, value } = setup();
    fireEvent.pointerDown(width, { button: 0, pointerId: 1, clientX: 300 });
    fireEvent.pointerMove(width, { pointerId: 1, clientX: 350 });
    if (cancel === "Escape") fireEvent.keyDown(width, { key: cancel });
    else
      fireEvent(
        width,
        new PointerEvent(cancel, { pointerId: 1, bubbles: true }),
      );
    fireEvent.pointerMove(width, { pointerId: 1, clientX: 400 });
    expect(value(width)).toBe(dimensions.width.initial);
    expect(change).toHaveBeenLastCalledWith({
      width: dimensions.width.initial,
      height: dimensions.height.initial,
    });
  },
);
it("REQ-040-S10 行高のフォーカス喪失は取消し、キー操作はフォーカス移動で確定する", () => {
  const { height, value } = setup();
  fireEvent.pointerDown(height, { button: 0, pointerId: 3, clientY: 100 });
  fireEvent.pointerMove(height, { pointerId: 3, clientY: 130 });
  fireEvent.blur(height);
  expect(value(height)).toBe(dimensions.height.initial);
  fireEvent.keyDown(height, { key: "ArrowDown" });
  fireEvent.blur(height);
  fireEvent.keyDown(height, { key: "Escape" });
  expect(value(height)).toBe(dimensions.height.initial + dimensions.step);
});
it("REQ-040-S12 空の一覧でも列幅境界があり、寸法スライダーはない", () => {
  const { width, value } = setup(undefined, true);
  expect(screen.queryByRole("slider", { name: "Project列幅" })).toBeNull();
  expect(screen.queryByRole("slider", { name: "Project行高" })).toBeNull();
  fireEvent.keyDown(width, { key: "ArrowLeft" });
  expect(value(width)).toBe(dimensions.width.initial - dimensions.step);
});

it("REQ-040-S08 移動イベントを省略する速いドラッグも解放位置の寸法を確定する", () => {
  const { width, value } = setup();
  fireEvent.pointerDown(width, { button: 0, pointerId: 4, clientX: 300 });
  fireEvent.pointerUp(width, { pointerId: 4, clientX: 340 });
  expect(value(width)).toBe(dimensions.width.initial + 40);
});
