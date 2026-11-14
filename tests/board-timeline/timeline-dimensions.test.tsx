// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { Timeline } from "../../packages/webview/src/widgets/timeline/index.js";
import { timelineDimensions } from "../../packages/webview/src/widgets/timeline/model/dimensions.js";

afterEach(cleanup);
it("REQ-040-S01 REQ-040-S02 寸法は全行共通、境界内、取消と初期化に対応する", () => {
  render(
    <Timeline
      projects={[]}
      days={["2099-01-01"]}
      today="2099-01-01"
      period="week"
      selectedEventId={null}
      onSelect={vi.fn()}
    />,
  );
  const width = screen.getByRole("slider", {
    name: "Project列幅",
  }) as HTMLInputElement;
  const height = screen.getByRole("slider", {
    name: "Project行高",
  }) as HTMLInputElement;
  const initial = width.value;
  fireEvent.pointerDown(width, { button: 0 });
  fireEvent.change(width, { target: { value: width.max } });
  fireEvent.keyDown(width, { key: "Escape" });
  expect(width.value).toBe(initial);
  fireEvent.pointerDown(width, { button: 0 });
  fireEvent.change(width, { target: { value: width.max } });
  fireEvent.pointerCancel(width);
  expect(width.value).toBe(initial);
  fireEvent.change(height, { target: { value: height.max } });
  expect(height.value).toBe(height.max);
  fireEvent.keyDown(height, { key: "Home" });
  expect(Number(height.value)).toBeGreaterThan(Number(height.min));
});
it("REQ-040-S02 再表示時の無効値は初期値または上限に収まり、描画へ無制限な値を渡さない", () => {
  const { container } = render(
    <Timeline
      projects={[]}
      days={["2099-01-01"]}
      today="2099-01-01"
      period="week"
      selectedEventId={null}
      onSelect={vi.fn()}
      initialLayout={{ width: Number.NaN, height: 1e9 }}
    />,
  );
  const height = screen.getByRole("slider", {
    name: "Project行高",
  }) as HTMLInputElement;
  expect(
    container
      .querySelector<HTMLElement>(".timeline-layout")
      ?.style.getPropertyValue("--project-row-height"),
  ).toBe(`${height.max}px`);
  expect(screen.getByRole("slider", { name: "Project列幅" })).toHaveProperty(
    "value",
    String(timelineDimensions.width.initial),
  );
});
