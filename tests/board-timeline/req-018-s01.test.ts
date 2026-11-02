// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import type { Event } from "../../packages/shared/src/domain/index.js";
import { EventDetails } from "../../packages/webview/src/widgets/event-details/ui/EventDetails.js";

describe("REQ-018-S01 未完了Taskを選ぶ", () => {
  it("未完了Taskを持つ最初のStoryとそのTaskを示す", () => {
    const event = {
      id: "event",
      name: "Launch",
      due: "2026-11-10",
      stories: [
        {
          id: "done",
          name: "完了Story",
          tasks: [{ id: "one", name: "Done", doneAt: "2026-11-02", points: 3 }],
        },
        {
          id: "pending",
          name: "未完了Story",
          tasks: [{ id: "two", name: "Todo", points: 5 }],
        },
      ],
    } as Event;
    render(
      createElement(EventDetails, {
        event,
        today: "2026-11-03",
        prediction: "2026-11-08",
      }),
    );
    expect(
      screen
        .getByRole("button", { name: /未完了Story/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    expect(screen.getByText("Todo")).toBeTruthy();
    expect(screen.getByText(/残り7日/)).toBeTruthy();
  });
});
