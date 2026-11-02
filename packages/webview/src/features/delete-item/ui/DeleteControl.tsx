import { useState } from "react";

export type DeleteKind = "project" | "event" | "story" | "task";
export type DescendantCounts = {
  events: number;
  stories: number;
  tasks: number;
};
type Props = {
  kind: DeleteKind;
  name: string;
  counts: DescendantCounts;
  onConfirm(): void;
};

/** REQ-025: 右クリックで子孫件数を確認し、承認後だけ削除を依頼する。 */
export function DeleteControl({ kind, name, counts, onConfirm }: Props) {
  const [menu, setMenu] = useState(false);
  const [confirming, setConfirming] = useState(false);
  return (
    <span className="delete-control">
      <button
        type="button"
        onContextMenu={(event) => {
          event.preventDefault();
          setMenu(true);
        }}
        onKeyDown={(event) => {
          if (
            event.key === "ContextMenu" ||
            (event.shiftKey && event.key === "F10")
          ) {
            event.preventDefault();
            setMenu(true);
          }
        }}
      >
        {name}
      </button>
      <button
        type="button"
        aria-label={`${name}の操作`}
        onClick={() => setMenu(!menu)}
      >
        ⋮
      </button>
      {menu && (
        <span role="menu" className="delete-menu">
          <button
            role="menuitem"
            type="button"
            onClick={() => {
              setMenu(false);
              setConfirming(true);
            }}
          >
            削除
          </button>
        </span>
      )}
      {confirming && (
        <span role="dialog" aria-label="削除確認" className="delete-dialog">
          <strong>
            {kind}「{name}」を削除する。
          </strong>
          <span>
            Event {counts.events}件、Story {counts.stories}件、Task{" "}
            {counts.tasks}件も削除される。
          </span>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              onConfirm();
            }}
          >
            削除する
          </button>
          <button type="button" onClick={() => setConfirming(false)}>
            取消
          </button>
        </span>
      )}
    </span>
  );
}
