// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import type { Event } from "../../packages/shared/src/domain/index.js";
import { EventDetails } from "../../packages/webview/src/widgets/event-details/ui/EventDetails.js";

describe("REQ-018-S02 未完了Taskがない", () => {
  it("全完了なら先頭Story、Storyがなければ空のTask一覧を示す", () => {
    const event = {
      id: "event",
      name: "Launch",
      due: "2026-11-10",
      stories: [
        {
          id: "first",
          name: "先頭Story",
          tasks: [{ id: "one", name: "Done", doneAt: "2026-11-02" }],
        },
      ],
    } as Event;
    const { rerender } = render(
      createElement(EventDetails, {
        event,
        today: "2026-11-03",
        prediction: null,
      }),
    );
    expect(
      screen
        .getByRole("button", { name: /先頭Story/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
    rerender(
      createElement(EventDetails, {
        event: { ...event, stories: [] },
        today: "2026-11-03",
        prediction: null,
      }),
    );
    expect(screen.getByLabelText("Task一覧").textContent).toContain("Taskなし");
  });
});
