import { describe, expect, it } from "vitest";
import { nextProjectColor } from "../../packages/webview/src/features/inline-add/ui/InlineAdd.js";

describe("REQ-022-S04 Project色の初期値", () => {
  it("既存Projectが未使用の色を選び、基本色を使い切っても重複しない", () => {
    const used = ["#4c8dff", "#a979df", "#4ebd91"];
    expect(nextProjectColor(used)).toBe("#efaa4d");
    const allBasic = [...used, "#efaa4d", "#db6d9b", "#c4b84c", "#47b8c3"];
    const next = nextProjectColor(allBasic);
    expect(next).toMatch(/^#[0-9a-f]{6}$/);
    expect(allBasic).not.toContain(next);
  });
});
