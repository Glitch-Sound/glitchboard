// @vitest-environment jsdom

import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  parseProjectYaml,
  updateTask,
} from "../../packages/extension/src/storage/project.js";
import { predictCompletionDates } from "../../packages/shared/src/calculation/prediction.js";
import { eventPoints } from "../../packages/shared/src/domain/index.js";
import { PointSelector } from "../../packages/webview/src/widgets/event-details/ui/PointSelector.js";

describe("REQ-023-S01 未見積を設定", () => {
  it("8ptを選ぶとオレンジ色の8ptを示し更新を送る", () => {
    const onChange = vi.fn();
    const view = render(
      createElement(PointSelector, { points: undefined, onChange }),
    );
    fireEvent.click(screen.getByRole("button", { name: "未見積" }));
    fireEvent.click(screen.getByRole("button", { name: /^8$/ }));
    expect(onChange).toHaveBeenCalledWith(8);
    view.rerender(createElement(PointSelector, { points: 8, onChange }));
    expect(screen.getByRole("button", { name: "8pt" }).className).toBe(
      "points-high",
    );
  });

  it("保存後に残りポイントと完了予測を再計算できる", async () => {
    const root = await mkdtemp(join(tmpdir(), "glitchboard-points-"));
    const path = join(root, "project.yaml");
    const eventId = "22222222-2222-4222-8222-222222222222";
    const taskId = "44444444-4444-4444-8444-444444444444";
    await writeFile(
      path,
      `id: 11111111-1111-4111-8111-111111111111\nname: Alpha\ncolor: '#123456'\nevents:\n  - id: ${eventId}\n    name: Launch\n    due: 2026-11-20\n    stories:\n      - id: 33333333-3333-4333-8333-333333333333\n        name: Work\n        tasks:\n          - id: ${taskId}\n            name: Estimate me\n`,
    );
    const settings = { workdays_off: ["sat", "sun"], public_holidays: false };
    const before = parseProjectYaml(await readFile(path, "utf8"));
    const beforeEvent = before.events[0];
    if (!beforeEvent) throw new Error("更新前のEventが見つからない");
    expect(eventPoints(beforeEvent).total).toBe(3);
    await updateTask(path, taskId, { points: 8 });
    const after = parseProjectYaml(await readFile(path, "utf8"));
    const afterEvent = after.events[0];
    if (!afterEvent) throw new Error("更新後のEventが見つからない");
    expect(eventPoints(afterEvent).total).toBe(8);
    expect(
      predictCompletionDates([after], "2026-11-03", settings, 2)[eventId],
    ).toBe("2026-11-06");
  });
});
