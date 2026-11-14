// @vitest-environment jsdom

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";
import { DeleteControl } from "../../packages/webview/src/features/delete-item/index.js";

describe("REQ-025-S01 子孫の確認", () => {
  it("Storyの右クリックからTask 12件を示し承認後だけ削除要求を送る", () => {
    const onConfirm = vi.fn();
    render(
      createElement(DeleteControl, {
        kind: "story",
        name: "Story",
        counts: { events: 0, stories: 0, tasks: 12 },
        onConfirm,
      }),
    );
    fireEvent.contextMenu(screen.getByRole("button", { name: "Story" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "削除" }));
    expect(screen.getByRole("dialog").textContent).toContain("タスク 12件");
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "削除する" }));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it("承認したStoryとTask 12件をYAMLから物理削除する", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-delete-"));
    const path = join(root, "project.yaml");
    const manage = join(root, "manage.yaml");
    const storyId = "33333333-3333-4333-8333-333333333333";
    const tasks = Array.from(
      { length: 12 },
      (_, index) =>
        `          - id: 44444444-4444-4444-8444-${String(index + 1).padStart(12, "0")}\n            name: Task ${index + 1}\n`,
    ).join("");
    await writeFile(
      manage,
      "settings: {workdays_off: [sat, sun], public_holidays: false}\nprojects: [{file: project.yaml, load: true}]\n",
    );
    await writeFile(
      path,
      `id: 11111111-1111-4111-8111-111111111111\nname: Alpha\ncolor: '#123456'\nevents:\n  - id: 22222222-2222-4222-8222-222222222222\n    name: Launch\n    due: 2026-11-20\n    stories:\n      - id: ${storyId}\n        name: Remove\n        tasks:\n${tasks}`,
    );
    const session = new BoardSession(manage);
    await session.reload();
    const result = await session.handleOperation({
      type: "deleteItem",
      kind: "story",
      id: storyId,
      version: session.snapshot().version,
      expected: { events: 0, stories: 0, tasks: 12 },
    });
    expect(result).toEqual({ ok: true });
    expect(session.snapshot().projects[0]?.events[0]?.stories).toEqual([]);
    const yaml = await readFile(path, "utf8");
    expect(yaml).not.toContain("Remove");
    expect(yaml).not.toContain("Task 12");
  });

  it("Project削除で参照とファイルを消し、古い表示版の要求を拒否する", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-delete-project-"));
    const path = join(root, "project.yaml");
    const manage = join(root, "manage.yaml");
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
    const version = session.snapshot().version;
    await session.reload();
    const operation = {
      type: "deleteItem",
      kind: "project",
      id,
      version,
      expected: { events: 0, stories: 0, tasks: 0 },
    };
    expect((await session.handleOperation(operation)).ok).toBe(false);
    expect(await readFile(path, "utf8")).toContain("Alpha");
    expect(
      await session.handleOperation({
        ...operation,
        version: session.snapshot().version,
      }),
    ).toEqual({ ok: true });
    await expect(readFile(path, "utf8")).rejects.toThrow();
    expect((await readFile(manage, "utf8")).includes("project.yaml")).toBe(
      false,
    );
  });
});
