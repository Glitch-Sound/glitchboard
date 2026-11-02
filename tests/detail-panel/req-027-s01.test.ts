// @vitest-environment jsdom
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";
import { calculateDanger } from "../../packages/shared/src/calculation/danger.js";
import { DetailPanel } from "../../packages/webview/src/widgets/detail-panel/index.js";

describe("REQ-027-S01 期限変更", () => {
  it("パネルの期限編集から保存要求を送る", () => {
    const onSave = vi.fn();
    render(
      createElement(DetailPanel, {
        selection: {
          kind: "event",
          item: {
            id: "22222222-2222-4222-8222-222222222222",
            name: "Launch",
            due: "2026-11-10",
            stories: [],
          },
          hierarchy: ["Alpha", "Launch"],
        },
        onClose: vi.fn(),
        onSave,
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "編集" }));
    fireEvent.change(screen.getByLabelText("期限"), {
      target: { value: "2026-11-12" },
    });
    fireEvent.click(screen.getByRole("button", { name: "保存" }));
    expect(onSave).toHaveBeenCalledWith(
      "event",
      "22222222-2222-4222-8222-222222222222",
      { name: "Launch", due: "2026-11-12" },
    );
  });
  it("Event期限を保存し危険判定を更新する", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-edit-event-"));
    const manage = join(root, "manage.yaml");
    const path = join(root, "project.yaml");
    const eventId = "22222222-2222-4222-8222-222222222222";
    await writeFile(
      manage,
      "settings: {workdays_off: [sat, sun], public_holidays: false}\nprojects: [{file: project.yaml, load: true}]\n",
    );
    await writeFile(
      path,
      `id: 11111111-1111-4111-8111-111111111111\nname: Alpha\ncolor: '#123456'\nevents:\n  - id: ${eventId}\n    name: Launch\n    due: 2026-11-10\n    stories:\n      - id: 33333333-3333-4333-8333-333333333333\n        name: Work\n        tasks:\n          - id: 44444444-4444-4444-8444-444444444444\n            name: Finish\n            points: 8\n`,
    );
    const session = new BoardSession(manage);
    await session.reload();
    const settings = session.snapshot().settings;
    const before = calculateDanger(
      session.snapshot().projects,
      "2026-11-03",
      "2026-11-03",
      "2026-11-13",
      settings,
      1,
      false,
    );
    expect(before.events[eventId]?.overflow).toBe(true);
    expect(
      await session.handleOperation({
        type: "editItem",
        kind: "event",
        id: eventId,
        patch: { due: "2026-11-12" },
      }),
    ).toEqual({ ok: true });
    expect(session.snapshot().projects[0]?.events[0]?.due).toBe("2026-11-12");
    const after = calculateDanger(
      session.snapshot().projects,
      "2026-11-03",
      "2026-11-03",
      "2026-11-13",
      settings,
      1,
      false,
    );
    expect(after.events[eventId]?.overflow).toBe(false);
  });
});
