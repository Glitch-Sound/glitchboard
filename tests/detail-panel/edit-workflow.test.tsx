// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DetailPanel,
  type DetailSelection,
} from "../../packages/webview/src/widgets/detail-panel/index.js";

const selection: DetailSelection = {
  kind: "story",
  item: { id: "s", name: "Saved", note: "Saved note", tasks: [] },
  hierarchy: ["Project", "Event", "Saved"],
};
afterEach(cleanup);

describe("詳細編集の反復", () => {
  it.each(["名前", "補足"])(
    "REQ-036-S01 %s の保存失敗は入力を残して再送できる",
    async (field) => {
      let finish!: (ok: boolean) => void;
      const onSave = vi.fn(
        () =>
          new Promise<boolean>((resolve) => {
            finish = resolve;
          }),
      );
      render(
        <DetailPanel selection={selection} onClose={vi.fn()} onSave={onSave} />,
      );
      fireEvent.click(
        screen.getByRole("button", {
          name: field === "名前" ? "編集" : "補足を編集",
        }),
      );
      fireEvent.change(screen.getByLabelText(field), {
        target: { value: "Changed" },
      });
      fireEvent.click(
        screen.getByRole("button", {
          name: field === "名前" ? "保存" : "補足を保存",
        }),
      );
      expect(screen.getByLabelText(field)).toHaveProperty("value", "Changed");
      await act(async () => finish(false));
      expect(screen.getByLabelText(field)).toHaveProperty("value", "Changed");
      fireEvent.click(
        screen.getByRole("button", {
          name: field === "名前" ? "保存" : "補足を保存",
        }),
      );
      await act(async () => finish(true));
      expect(
        screen.queryByRole("textbox", {
          name: field,
        }),
      ).toBeNull();
      expect(onSave.mock.calls).toEqual([
        ["story", "s", { [field === "名前" ? "name" : "note"]: "Changed" }],
        ["story", "s", { [field === "名前" ? "name" : "note"]: "Changed" }],
      ]);
    },
  );

  it.each(["名前", "補足"])(
    "REQ-036-S02 %s を取消後、更新された保存値から編集を再開する",
    (field) => {
      const props = { selection, onClose: vi.fn(), onSave: vi.fn() };
      const view = render(<DetailPanel {...props} />);
      const open = () =>
        fireEvent.click(
          screen.getByRole("button", {
            name: field === "名前" ? "編集" : "補足を編集",
          }),
        );
      open();
      fireEvent.change(screen.getByLabelText(field), {
        target: { value: "Discard" },
      });
      fireEvent.click(screen.getByRole("button", { name: "取消" }));
      view.rerender(
        <DetailPanel
          {...props}
          selection={{
            ...selection,
            item: { ...selection.item, name: "Latest", note: "Latest note" },
          }}
        />,
      );
      open();
      expect(screen.getByLabelText(field)).toHaveProperty(
        "value",
        field === "名前" ? "Latest" : "Latest note",
      );
      expect(props.onSave).not.toHaveBeenCalled();
    },
  );

  it("REQ-036-S03 Escは編集、削除確認、詳細を順に閉じ、元の名前に戻る", async () => {
    const trigger = document.createElement("button");
    trigger.textContent = "open";
    document.body.append(trigger);
    trigger.focus();
    const onClose = vi.fn();
    const view = render(
      <DetailPanel
        selection={selection}
        onClose={onClose}
        onDelete={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "編集" }));
    fireEvent.keyDown(screen.getByLabelText("名前"), { key: "Escape" });
    expect(screen.queryByRole("textbox")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "削除" }));
    fireEvent.keyDown(screen.getByRole("dialog", { name: "削除確認" }), {
      key: "Escape",
    });
    expect(screen.queryByRole("dialog", { name: "削除確認" })).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("dialog", { name: "詳細パネル" }), {
      key: "Escape",
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    view.unmount();
    await waitFor(() => expect(document.activeElement).toBe(trigger));
    trigger.remove();
  });
});
