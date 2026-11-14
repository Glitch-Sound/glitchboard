import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { pointTone } from "../../packages/webview/src/widgets/event-details/model/pointTone.js";

describe("NREQ-003-S01 ライトテーマ", () => {
  it("VS Codeのテーマ色を使い危険と21ptの色を分ける", async () => {
    expect(pointTone(21)).toBe("points-21");
    const css = await readFile("packages/webview/src/app/style.css", "utf8");
    expect(css).toContain("var(--vscode-editor-background)");
    expect(css).toContain("var(--vscode-foreground)");
    expect(css).toContain(".points-21");
    expect(css).toContain(".danger-text");
  });
});
