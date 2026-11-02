// @vitest-environment jsdom

import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { openLinkedTarget } from "../../packages/extension/src/links.js";
import { BoardSession } from "../../packages/extension/src/session.js";
import { DetailPanel } from "../../packages/webview/src/widgets/detail-panel/index.js";

describe("REQ-028-S02 危険なリンク", () => {
  it("javascript URLを無効にして診断し、開く要求を出さない", () => {
    const onOpenLink = vi.fn();
    render(
      createElement(DetailPanel, {
        selection: {
          kind: "task",
          item: {
            id: "44444444-4444-4444-8444-444444444444",
            name: "Unsafe",
            links: [{ label: "Bad", target: "javascript:alert(1)" }],
          },
          hierarchy: ["Alpha", "Event", "Story", "Unsafe"],
        },
        onClose: vi.fn(),
        onOpenLink,
      }),
    );
    const link = screen.getByRole("button", { name: "Bad" });
    expect(link.hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("alert").textContent).toContain("無効なリンク");
    fireEvent.click(link);
    expect(onOpenLink).not.toHaveBeenCalled();
  });
  it("管理リポジトリ外への相対パスを開かず保存も拒否する", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-invalid-link-"));
    const openFile = vi.fn();
    await expect(
      openLinkedTarget(
        join(root, "manage.yaml"),
        "../secret.md",
        openFile,
        vi.fn(),
      ),
    ).rejects.toThrow("無効なリンク");
    expect(openFile).not.toHaveBeenCalled();
    const manage = join(root, "manage.yaml");
    await writeFile(
      manage,
      "settings: {workdays_off: [sat, sun], public_holidays: false}\nprojects: [{file: project.yaml, load: true}]\n",
    );
    await writeFile(
      join(root, "project.yaml"),
      "id: 11111111-1111-4111-8111-111111111111\nname: Alpha\ncolor: '#123456'\nevents: []\n",
    );
    const session = new BoardSession(manage);
    await session.reload();
    const result = await session.handleOperation({
      type: "editItem",
      kind: "project",
      id: "11111111-1111-4111-8111-111111111111",
      patch: { links: [{ label: "Outside", target: "../secret.md" }] },
    });
    expect(result.ok).toBe(false);
  });
});
