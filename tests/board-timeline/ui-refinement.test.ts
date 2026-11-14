// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { Event } from "../../packages/shared/src/domain/index.js";
import { EventDetails } from "../../packages/webview/src/widgets/event-details/ui/EventDetails.js";
import { PointSelector } from "../../packages/webview/src/widgets/event-details/ui/PointSelector.js";

describe("Event詳細の視覚情報", () => {
  it("期限内予測を曜日付きで緑にし、Project色の進捗バーと選択Storyを示す", () => {
    const event = {
      id: "event",
      name: "Launch",
      due: "2026-11-20",
      stories: [
        {
          id: "story",
          name: "実装",
          tasks: [
            { id: "done", name: "完了", points: 13, doneAt: "2026-11-03" },
            { id: "pending", name: "残り", points: 21 },
          ],
        },
      ],
    } as Event;
    const { container } = render(
      createElement(EventDetails, {
        event,
        today: "2026-11-03",
        prediction: "2026-11-16",
        projectColor: "#123456",
        onPointsChange: vi.fn(),
      }),
    );
    expect(screen.getByText("11/16(月)")).toBeTruthy();
    expect(
      container.querySelector(".event-prediction.success-text"),
    ).toBeTruthy();
    const progress = screen.getByRole("progressbar", { name: "Event進捗" });
    expect(progress.getAttribute("value")).toBe("13");
    expect(progress.getAttribute("max")).toBe("34");
    expect(
      (progress as HTMLElement).style.getPropertyValue(
        "--event-progress-color",
      ),
    ).toBe("#123456");
    expect(container.querySelector(".story-choice.selected")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "13pt" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByRole("button", { name: "21pt" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
    expect(screen.getByText("完了").closest(".task-line")?.classList).toContain(
      "completed",
    );
  });

  it("ポイントカードのスライダーと7値の選択を使える", () => {
    const onChange = vi.fn();
    render(createElement(PointSelector, { points: 3, onChange }));
    fireEvent.click(screen.getByRole("button", { name: "3pt" }));
    const slider = screen.getByRole("slider", {
      name: "ポイントをスライダーで選択",
    });
    fireEvent.change(slider, { target: { value: "5" } });
    expect(onChange).toHaveBeenCalledWith(13);
    expect(screen.getByRole("button", { name: "21" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "未見積" })).toBeTruthy();
  });
});
