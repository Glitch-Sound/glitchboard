import { describe, expect, it, vi } from "vitest";
import { registerViews } from "../../packages/extension/src/views.js";

describe("REQ-012-S01 二つの表示面", () => {
  it("サイドバーを登録しコマンドでエディタタブを開く", async () => {
    const sidebar = vi.fn();
    const command = vi.fn();
    const editor = vi.fn();
    registerViews({
      registerSidebar: sidebar,
      registerCommand: command,
      openEditor: editor,
    });
    expect(sidebar).toHaveBeenCalledWith("glitchboard.events");
    expect(command).toHaveBeenCalledWith(
      "glitchboard.open",
      expect.any(Function),
    );
    await command.mock.calls[0]?.[1]();
    expect(editor).toHaveBeenCalledWith("glitchboard.board");
  });
});
