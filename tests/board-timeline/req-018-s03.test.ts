// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it } from "vitest";
import type { Event } from "../../packages/shared/src/domain/index.js";
import { EventDetails } from "../../packages/webview/src/widgets/event-details/ui/EventDetails.js";

afterEach(cleanup);

describe("REQ-018-S03 危険なEventの要約", () => {
  it.each(["approaching", "overdue", "overflow"] as const)(
    "%sを赤で示す",
    (kind) => {
      const event = {
        id: "event",
        name: "Launch",
        due: "2026-11-10",
        stories: [],
      } as Event;
      const { container } = render(
        createElement(EventDetails, {
          event,
          today: "2026-11-03",
          prediction: "2026-11-12",
          danger: {
            approaching: false,
            overdue: false,
            overflow: false,
            caution: false,
            [kind]: true,
          },
        }),
      );
      expect(container.querySelector(".event-days.danger-text")).toBeTruthy();
      expect(
        container.querySelector(".event-prediction.danger-text"),
      ).toBeTruthy();
      expect(screen.getByText("11/12(木)")).toBeTruthy();
      expect(container.querySelector(".event-summary.danger-text")).toBeNull();
    },
  );
});
