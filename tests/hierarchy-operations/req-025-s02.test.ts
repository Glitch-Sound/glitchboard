// @vitest-environment jsdom
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { DeleteControl } from "../../packages/webview/src/features/delete-item/index.js";

describe("REQ-025-S02 取消", () => {
  it("確認を取り消すと削除要求を送らずYAMLも変更しない", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-cancel-"));
    const path = join(root, "project.yaml");
    const yaml = "name: Keep\n";
    await writeFile(path, yaml);
    const onConfirm = vi.fn();
    render(
      createElement(DeleteControl, {
        kind: "task",
        name: "Keep",
        counts: { events: 0, stories: 0, tasks: 0 },
        onConfirm,
      }),
    );
    fireEvent.contextMenu(screen.getByRole("button", { name: "Keep" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "削除" }));
    fireEvent.click(screen.getByRole("button", { name: "取消" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onConfirm).not.toHaveBeenCalled();
    expect(await readFile(path, "utf8")).toBe(yaml);
  });
});
