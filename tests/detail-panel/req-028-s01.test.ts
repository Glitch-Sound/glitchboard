// @vitest-environment jsdom
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { openLinkedTarget } from "../../packages/extension/src/links.js";
import { BoardSession } from "../../packages/extension/src/session.js";
import { DetailPanel } from "../../packages/webview/src/widgets/detail-panel/index.js";

describe("REQ-028-S01 相対リンク", () => {
  it("パネルから文章と箇条書き、リンクの保存要求を送る", () => {
    const onSave = vi.fn();
    render(
      createElement(DetailPanel, {
        selection: {
          kind: "project",
          item: {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Alpha",
            color: "#123456",
            events: [],
          },
          hierarchy: ["Alpha"],
        },
        onClose: vi.fn(),
        onSave,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "+ 補足を追加" }));
    fireEvent.change(screen.getByLabelText("補足"), {
      target: { value: "説明\n- 項目" },
    });
    fireEvent.click(screen.getByRole("button", { name: "リンクを追加" }));
    fireEvent.change(screen.getByLabelText("ラベル"), {
      target: { value: "Guide" },
    });
    fireEvent.change(screen.getByLabelText("リンク先"), {
      target: { value: "projects/guide.md" },
    });
    fireEvent.click(screen.getByRole("button", { name: "補足を保存" }));
    expect(onSave).toHaveBeenCalledWith(
      "project",
      "11111111-1111-4111-8111-111111111111",
      {
        note: "説明\n- 項目",
        links: [{ label: "Guide", target: "projects/guide.md" }],
      },
    );
  });
  it("管理リポジトリ内のprojects/guide.mdをVS Codeで開く要求に変換する", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-link-"));
    const path = join(root, "projects", "guide.md");
    const openFile = vi.fn();
    const openUrl = vi.fn();
    await openLinkedTarget(
      join(root, "manage.yaml"),
      "projects/guide.md",
      openFile,
      openUrl,
    );
    expect(openFile).toHaveBeenCalledWith(path);
    expect(openUrl).not.toHaveBeenCalled();
  });

  it("補足とリンク配列を保存し、パネルからリンクを開く", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-note-"));
    const manage = join(root, "manage.yaml");
    const path = join(root, "project.yaml");
    const id = "11111111-1111-4111-8111-111111111111";
    await writeFile(
      manage,
      "settings: {workdays_off: [sat, sun], public_holidays: false}\nprojects: [{file: project.yaml, load: true}]\n",
    );
    await writeFile(
      path,
      `id: ${id}\nname: Alpha\ncolor: '#123456'\nevents: []\n`,
    );
    const session = new BoardSession(manage);
    await session.reload();
    const links = [{ label: "Guide", target: "projects/guide.md" }];
    expect(
      await session.handleOperation({
        type: "editItem",
        kind: "project",
        id,
        patch: { note: "説明\n- 項目", links },
      }),
    ).toEqual({ ok: true });
    expect(await readFile(path, "utf8")).toContain("projects/guide.md");
    const onOpenLink = vi.fn();
    const project = session.snapshot().projects[0];
    if (!project) throw new Error("Projectが見つからない");
    render(
      createElement(DetailPanel, {
        selection: {
          kind: "project",
          item: project,
          hierarchy: ["Alpha"],
        },
        onClose: vi.fn(),
        onOpenLink,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Guide" }));
    expect(onOpenLink).toHaveBeenCalledWith("projects/guide.md");
  });
});
