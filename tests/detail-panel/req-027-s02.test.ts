// @vitest-environment jsdom
import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import { BoardSession } from "../../packages/extension/src/session.js";
import { DetailPanel } from "../../packages/webview/src/widgets/detail-panel/index.js";
import { Timeline } from "../../packages/webview/src/widgets/timeline/ui/Timeline.js";

describe("REQ-027-S02 Project色変更", () => {
  it("パネルの色選択から保存要求を送る", () => {
    const onSave = vi.fn();
    render(
      createElement(DetailPanel, {
        selection: {
          kind: "project",
          item: {
            id: "11111111-1111-4111-8111-111111111111",
            name: "Alpha",
            color: "#0000ff",
            events: [],
          },
          hierarchy: ["Alpha"],
        },
        onClose: vi.fn(),
        onSave,
      }),
    );
    fireEvent.change(screen.getByLabelText("色"), {
      target: { value: "#00aa00" },
    });
    expect(onSave).toHaveBeenCalledWith(
      "project",
      "11111111-1111-4111-8111-111111111111",
      { color: "#00aa00" },
    );
  });
  it("青から緑へ保存するとマーカー色も緑になる", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-edit-color-"));
    const manage = join(root, "manage.yaml");
    const path = join(root, "project.yaml");
    const projectId = "11111111-1111-4111-8111-111111111111";
    await writeFile(
      manage,
      "settings: {workdays_off: [sat, sun], public_holidays: false}\nprojects: [{file: project.yaml, load: true}]\n",
    );
    await writeFile(
      path,
      `id: ${projectId}\nname: Alpha\ncolor: '#0000ff'\nevents:\n  - id: 22222222-2222-4222-8222-222222222222\n    name: Launch\n    due: 2026-11-12\n    stories: []\n`,
    );
    const session = new BoardSession(manage);
    await session.reload();
    expect(
      await session.handleOperation({
        type: "editItem",
        kind: "project",
        id: projectId,
        patch: { color: "#00aa00" },
      }),
    ).toEqual({ ok: true });
    expect(session.snapshot().projects[0]?.color).toBe("#00aa00");
    render(
      createElement(Timeline, {
        projects: session.snapshot().projects,
        days: ["2026-11-12"],
        today: "2026-11-03",
        period: "week",
        selectedEventId: null,
        onSelect: () => {},
      }),
    );
    expect(
      screen.getByRole("button", { name: "Launch" }).getAttribute("style"),
    ).toContain("rgb(0, 170, 0)");
  });
});
