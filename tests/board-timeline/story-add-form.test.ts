// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Event } from "../../packages/shared/src/domain/index.js";
import { EventDetails } from "../../packages/webview/src/widgets/event-details/ui/EventDetails.js";

const event = {
  id: "event",
  name: "Release",
  due: "2026-11-20",
  stories: [{ id: "story", name: "既存Story", tasks: [] }],
} as Event;

afterEach(cleanup);

describe("STORY追加欄", () => {
  it("見出しの直下で入力して追加できる", async () => {
    const onAddStory = vi.fn(async () => true);
    const { container } = render(
      createElement(EventDetails, {
        event,
        today: "2026-11-06",
        prediction: null,
        onAddStory,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Storyを追加" }));
    const form = container.querySelector(".story-add-form");
    expect(form?.previousElementSibling?.tagName).toBe("H3");
    expect(form?.nextElementSibling?.classList.contains("story-choice")).toBe(
      true,
    );
    const name = screen.getByRole("textbox", { name: "名前" });
    expect(name).toHaveProperty(
      "placeholder",
      "Story名 — Enterで追加 / Escで取消",
    );
    fireEvent.change(name, { target: { value: " 新しいStory " } });
    if (!form) throw new Error("Story追加フォームが見つからない");
    fireEvent.submit(form);
    await waitFor(() =>
      expect(onAddStory).toHaveBeenCalledWith("event", "新しいStory"),
    );
    await waitFor(() =>
      expect(container.querySelector(".story-add-form")).toBeNull(),
    );
  });

  it("Escで入力を取り消す", () => {
    const onAddStory = vi.fn();
    render(
      createElement(EventDetails, {
        event,
        today: "2026-11-06",
        prediction: null,
        onAddStory,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Storyを追加" }));
    fireEvent.keyDown(screen.getByRole("textbox", { name: "名前" }), {
      key: "Escape",
    });
    expect(screen.queryByRole("textbox", { name: "名前" })).toBeNull();
    expect(onAddStory).not.toHaveBeenCalled();
  });
});
