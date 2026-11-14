// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { createRef } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { InlineAdd } from "../../packages/webview/src/features/inline-add/index.js";
import {
  DetailPanel,
  type DetailPanelHandle,
} from "../../packages/webview/src/widgets/detail-panel/index.js";
import { Timeline } from "../../packages/webview/src/widgets/timeline/index.js";

const project = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Alpha",
  color: "#123456",
  events: [],
};
afterEach(cleanup);
it.each(["timeline", "inline"])(
  "REQ-042-S02 REQ-042-S03 %s はコードを検証して追加し、選び直しを同期する",
  async (entry) => {
    const add = vi.fn().mockResolvedValue(true);
    if (entry === "timeline")
      render(
        <Timeline
          projects={[]}
          days={["2026-11-14"]}
          today="2026-11-14"
          period="week"
          selectedEventId={null}
          onSelect={() => {}}
          onAddProject={add}
        />,
      );
    else render(<InlineAdd kind="project" onSubmit={add} />);
    fireEvent.click(screen.getByRole("button", { name: "Projectを追加" }));
    fireEvent.change(screen.getByRole("textbox", { name: "名前" }), {
      target: { value: "Created" },
    });
    const code = screen.getByRole("textbox", { name: "カラーコード" });
    fireEvent.change(code, { target: { value: "bad" } });
    fireEvent.click(screen.getByRole("button", { name: "追加" }));
    expect(add).not.toHaveBeenCalled();
    expect(code).toHaveProperty("value", "bad");
    expect(code.getAttribute("aria-invalid")).toBe("true");
    fireEvent.change(code, { target: { value: " #AaBbCc " } });
    expect(screen.getByLabelText("色")).toHaveProperty("value", "#aabbcc");
    fireEvent.change(screen.getByLabelText("色"), {
      target: { value: "#654321" },
    });
    expect(code).toHaveProperty("value", "#654321");
    fireEvent.change(code, { target: { value: " #AaBbCc " } });
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "追加" })),
    );
    expect(add.mock.calls).toEqual(
      entry === "timeline"
        ? [["Created", "#aabbcc"]]
        : [
            [
              {
                name: "Created",
                color: "#aabbcc",
                due: undefined,
                projectId: undefined,
              },
            ],
          ],
    );
  },
);
it("REQ-042-S04 詳細のコードは確定まで送らず、Escape はコードだけを戻す", async () => {
  const save = vi.fn().mockResolvedValue(true);
  render(
    <DetailPanel
      selection={{ kind: "project", item: project, hierarchy: ["Alpha"] }}
      onClose={vi.fn()}
      onSave={save}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "編集" }));
  fireEvent.change(screen.getByLabelText("名前"), {
    target: { value: "Keep name" },
  });
  const code = screen.getByRole("textbox", { name: "カラーコード" });
  fireEvent.change(code, { target: { value: "#AABBCC" } });
  expect(save).not.toHaveBeenCalled();
  fireEvent.keyDown(code, { key: "Escape" });
  expect(code).toHaveProperty("value", "#123456");
  expect(screen.getByLabelText("名前")).toHaveProperty("value", "Keep name");
  fireEvent.change(code, { target: { value: "#AABBCC" } });
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "色を保存" })),
  );
  expect(save.mock.calls).toEqual([
    ["project", project.id, { color: "#aabbcc" }],
  ]);
  expect(screen.getByLabelText("名前")).toHaveProperty("value", "Keep name");
});
it("REQ-042-S03 REQ-042-S05 無効な色の移動保存を拒否し、取消でも両入力を保持する", () => {
  const save = vi.fn(),
    move = vi.fn(),
    ref = createRef<DetailPanelHandle>();
  render(
    <DetailPanel
      ref={ref}
      selection={{ kind: "project", item: project, hierarchy: ["Alpha"] }}
      onClose={vi.fn()}
      onSave={save}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "編集" }));
  fireEvent.change(screen.getByLabelText("名前"), {
    target: { value: "Keep" },
  });
  fireEvent.change(screen.getByRole("textbox", { name: "カラーコード" }), {
    target: { value: "#abc" },
  });
  act(() => ref.current?.requestLeave(move));
  fireEvent.click(screen.getByRole("button", { name: "保存して進む" }));
  expect(save).not.toHaveBeenCalled();
  expect(move).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
  expect(screen.getByRole("textbox", { name: "カラーコード" })).toHaveProperty(
    "value",
    "#abc",
  );
  expect(screen.getByLabelText("名前")).toHaveProperty("value", "Keep");
});
it.each(["name", "note"])(
  "REQ-042-S05 %s と色をまとめて保存し、失敗後も同じ対象へ再送する",
  async (kind) => {
    const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true),
      move = vi.fn(),
      ref = createRef<DetailPanelHandle>();
    render(
      <DetailPanel
        ref={ref}
        selection={{ kind: "project", item: project, hierarchy: ["Alpha"] }}
        onClose={vi.fn()}
        onSave={save}
      />,
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: kind === "name" ? "編集" : "+ 補足を追加",
      }),
    );
    fireEvent.change(screen.getByLabelText(kind === "name" ? "名前" : "補足"), {
      target: { value: "Changed" },
    });
    fireEvent.change(screen.getByRole("textbox", { name: "カラーコード" }), {
      target: { value: " #ABCDEF " },
    });
    act(() => ref.current?.requestLeave(move));
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "保存して進む" })),
    );
    expect(move).not.toHaveBeenCalled();
    expect(
      screen.getByRole("textbox", { name: "カラーコード" }),
    ).toHaveProperty("value", " #ABCDEF ");
    await act(async () =>
      fireEvent.click(screen.getByRole("button", { name: "保存して進む" })),
    );
    const patch =
      kind === "name"
        ? { name: "Changed", color: "#abcdef" }
        : { note: "Changed", color: "#abcdef" };
    expect(save.mock.calls).toEqual([
      ["project", project.id, patch],
      ["project", project.id, patch],
    ]);
    expect(move).toHaveBeenCalledTimes(1);
  },
);
it("REQ-042-S04 色の取消は保存済み値へ戻り、色だけでも移動確認で保護する", () => {
  const move = vi.fn(),
    ref = createRef<DetailPanelHandle>();
  render(
    <DetailPanel
      ref={ref}
      selection={{ kind: "project", item: project, hierarchy: ["Alpha"] }}
      onClose={vi.fn()}
      onSave={vi.fn()}
    />,
  );
  const code = screen.getByRole("textbox", { name: "カラーコード" });
  fireEvent.change(code, { target: { value: "#abcdef" } });
  act(() => ref.current?.requestLeave(move));
  expect(
    screen.getByRole("alertdialog", { name: "未保存の編集" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "キャンセル" }));
  fireEvent.click(screen.getByRole("button", { name: "色を取消" }));
  expect(code).toHaveProperty("value", "#123456");
  expect(move).not.toHaveBeenCalled();
});
it("REQ-042-S04 色だけの保存失敗でもコードを保持し、再試行は色だけを送る", async () => {
  const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValue(true);
  render(
    <DetailPanel
      selection={{ kind: "project", item: project, hierarchy: ["Alpha"] }}
      onClose={vi.fn()}
      onSave={save}
    />,
  );
  const code = screen.getByRole("textbox", { name: "カラーコード" });
  fireEvent.change(code, { target: { value: " #ABCDEF " } });
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "色を保存" })),
  );
  expect(code).toHaveProperty("value", " #ABCDEF ");
  expect(screen.getByRole("alert").textContent).toBe(
    "保存に失敗しました。入力を残しています。",
  );
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "色を保存" })),
  );
  expect(save.mock.calls).toEqual([
    ["project", project.id, { color: "#abcdef" }],
    ["project", project.id, { color: "#abcdef" }],
  ]);
});
it("REQ-042-S06 再読込した色を詳細入力と所属色へ反映し、未保存入力は外部更新で消さない", () => {
  const view = render(
    <DetailPanel
      selection={{ kind: "project", item: project, hierarchy: ["Alpha"] }}
      onClose={vi.fn()}
      onSave={vi.fn()}
    />,
  );
  view.rerender(
    <DetailPanel
      selection={{
        kind: "project",
        item: { ...project, color: "#abcdef" },
        hierarchy: ["Alpha"],
      }}
      onClose={vi.fn()}
      onSave={vi.fn()}
    />,
  );
  const code = screen.getByRole("textbox", { name: "カラーコード" });
  expect(code).toHaveProperty("value", "#abcdef");
  expect(screen.getByLabelText("色")).toHaveProperty("value", "#abcdef");
  expect(
    screen.getByRole("dialog", { name: "詳細パネル" }).getAttribute("style"),
  ).toBe("--detail-accent: #abcdef;");
  fireEvent.change(code, { target: { value: "#invalid" } });
  view.rerender(
    <DetailPanel
      selection={{
        kind: "project",
        item: { ...project, color: "#654321" },
        hierarchy: ["Alpha"],
      }}
      onClose={vi.fn()}
      onSave={vi.fn()}
    />,
  );
  expect(code).toHaveProperty("value", "#invalid");
});
it("REQ-042-S07 名前と同時保存したコードも正規化し、保存済みの色を再び未保存にしない", async () => {
  const save = vi.fn().mockResolvedValue(true);
  render(
    <DetailPanel
      selection={{ kind: "project", item: project, hierarchy: ["Alpha"] }}
      onClose={vi.fn()}
      onSave={save}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "編集" }));
  fireEvent.change(screen.getByLabelText("名前"), {
    target: { value: "Changed" },
  });
  const code = screen.getByRole("textbox", { name: "カラーコード" });
  fireEvent.change(code, { target: { value: " #123456 " } });
  await act(async () =>
    fireEvent.click(screen.getByRole("button", { name: "保存" })),
  );
  expect(save.mock.calls).toEqual([
    ["project", project.id, { name: "Changed", color: "#123456" }],
  ]);
  expect(code).toHaveProperty("value", "#123456");
  expect(screen.queryByRole("button", { name: "色を保存" })).toBeNull();
});
