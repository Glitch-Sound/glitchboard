// @vitest-environment jsdom

import { describe, expect, it, vi } from "vitest";
import { subscribeSnapshots } from "../../packages/webview/src/app/snapshot.js";

describe("REQ-013-S01 スナップショットの受信境界", () => {
  it("不正な更新を無視し、検証済みの版だけを画面へ渡す", () => {
    const onSnapshot = vi.fn();
    const unsubscribe = subscribeSnapshots(onSnapshot);
    window.dispatchEvent(
      new MessageEvent("message", {
        data: {
          type: "snapshot",
          payload: { version: 1, projects: "invalid" },
        },
      }),
    );
    expect(onSnapshot).not.toHaveBeenCalled();

    const valid = {
      version: 2,
      projects: [],
      selectedEventId: null,
      error: null,
      settings: { workdays_off: ["sat", "sun"], public_holidays: true },
      projectEntries: [],
    };
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: "snapshot", payload: valid },
      }),
    );
    expect(onSnapshot).toHaveBeenCalledWith(valid);
    unsubscribe();
  });
});
