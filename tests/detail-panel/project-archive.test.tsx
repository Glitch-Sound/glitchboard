// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { createRef } from "react";
import { afterEach, expect, it, vi } from "vitest";
import {
  DetailPanel,
  type DetailPanelHandle,
} from "../../packages/webview/src/widgets/detail-panel/index.js";

const project = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "Alpha",
  color: "#123456",
  events: [],
};
afterEach(cleanup);
function setup(onSave = vi.fn(async () => true), archived = false) {
  const ref = createRef<DetailPanelHandle>();
  const view = render(
    <DetailPanel
      ref={ref}
      selection={{
        kind: "project",
        item: { ...project, archived },
        hierarchy: ["Alpha"],
      }}
      onClose={vi.fn()}
      onSave={onSave}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "編集" }));
  return { ...view, ref, onSave };
}
it("REQ-047-S03 編集の取消では送信せず再編集は未チェックになる", () => {
  const { onSave } = setup();
  fireEvent.click(screen.getByRole("checkbox", { name: "アーカイブ" }));
  fireEvent.click(screen.getByRole("button", { name: "取消" }));
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "編集" }));
  expect(screen.getByRole("checkbox", { name: "アーカイブ" })).toHaveProperty(
    "checked",
    false,
  );
});
it.each(["キャンセル", "破棄して進む", "保存して進む"])(
  "REQ-047-S03 移動確認の%sは元のアーカイブ編集を安全に解決する",
  async (choice) => {
    const { ref, onSave } = setup();
    const leave = vi.fn();
    fireEvent.click(screen.getByRole("checkbox", { name: "アーカイブ" }));
    act(() => ref.current?.requestLeave(leave));
    fireEvent.click(screen.getByRole("button", { name: choice }));
    if (choice === "キャンセル") {
      expect(leave).not.toHaveBeenCalled();
      expect(onSave).not.toHaveBeenCalled();
      expect(
        screen.getByRole("checkbox", { name: "アーカイブ" }),
      ).toHaveProperty("checked", true);
    } else {
      await waitFor(() => expect(leave).toHaveBeenCalledTimes(1));
      if (choice === "保存して進む")
        expect(onSave.mock.calls).toEqual([
          ["project", project.id, { name: "Alpha", archived: true }],
        ]);
      else expect(onSave).not.toHaveBeenCalled();
    }
  },
);
it("REQ-047-S04 移動時の保存失敗では名前とチェックを保持し再保存できる", async () => {
  const save = vi.fn(async () => false);
  const { ref } = setup(save);
  const leave = vi.fn();
  fireEvent.change(screen.getByLabelText("名前"), {
    target: { value: "New Alpha" },
  });
  fireEvent.click(screen.getByRole("checkbox", { name: "アーカイブ" }));
  act(() => ref.current?.requestLeave(leave));
  fireEvent.click(screen.getByRole("button", { name: "保存して進む" }));
  await waitFor(() =>
    expect(screen.getAllByRole("alert")[0].textContent).toBe(
      "保存に失敗しました。入力を残しています。",
    ),
  );
  expect(screen.getByLabelText("名前")).toHaveProperty("value", "New Alpha");
  expect(screen.getByRole("checkbox", { name: "アーカイブ" })).toHaveProperty(
    "checked",
    true,
  );
  expect(leave).not.toHaveBeenCalled();
  save.mockResolvedValue(true);
  fireEvent.click(screen.getByRole("button", { name: "保存して進む" }));
  await waitFor(() => expect(leave).toHaveBeenCalledTimes(1));
  expect(save.mock.calls).toEqual(
    Array(2).fill([
      "project",
      project.id,
      { name: "New Alpha", archived: true },
    ]),
  );
});
it("REQ-047-S05 アーカイブ済みは状態だけを示し復元のチェック欄を置かない", () => {
  const { onSave } = setup(undefined, true);
  expect(screen.queryByRole("checkbox", { name: "アーカイブ" })).toBeNull();
  expect(screen.getByText("アーカイブ済み")).toBeTruthy();
  expect(onSave).not.toHaveBeenCalled();
});
