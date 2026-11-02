import { describe, expect, it, vi } from "vitest";
import { navigateToEvent } from "../../packages/extension/src/navigation.js";

describe("REQ-021-S01 サイドバーから移動", () => {
  it("Eventを選択してボードのタブを開く", async () => {
    const selectEvent = vi.fn();
    const openBoard = vi.fn();
    await navigateToEvent("event-1", { selectEvent, openBoard });
    expect(selectEvent).toHaveBeenCalledWith("event-1");
    expect(openBoard).toHaveBeenCalledOnce();
  });
});
