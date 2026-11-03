import { useState } from "react";
import { createPortal } from "react-dom";

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
  iconOnly?: boolean;
};

/** REQ-025: 右クリックで子孫件数を確認し、承認後だけ削除を依頼する。 */
export const deleteKindName = {
  project: "プロジェクト",
  event: "イベント",
  story: "ストーリー",
  task: "タスク",
} as const;
export function DeleteDialog({
  kind,
  name,
  counts,
  onConfirm,
  onCancel,
}: Props & { onCancel(): void }) {
  const descendants = (
    [
      ["イベント", counts.events],
      ["ストーリー", counts.stories],
      ["タスク", counts.tasks],
    ] as const
  ).filter(([, count]) => count > 0);
  return createPortal(
    <div className="delete-backdrop">
      <button
        type="button"
        className="delete-backdrop-dismiss"
        aria-label="削除確認を閉じる"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="削除確認"
        className="delete-dialog"
      >
        <strong>
          {deleteKindName[kind]}「{name}」を削除しますか？
        </strong>
        {descendants.length > 0 && (
          <p>
            {descendants
              .map(([label, count]) => `${label} ${count}件`)
              .join("、")}
            も削除されます。
          </p>
        )}
        <div className="dialog-actions">
          <button type="button" onClick={onCancel}>
            キャンセル
          </button>
          <button type="button" className="danger-button" onClick={onConfirm}>
            削除する
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function DeleteControl({
  kind,
  name,
  counts,
  onConfirm,
  iconOnly = false,
}: Props) {
  const [menu, setMenu] = useState(false);
  const [confirming, setConfirming] = useState(false);
  return (
    <span className="delete-control">
      {!iconOnly && (
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
      )}
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
        <DeleteDialog
          kind={kind}
          name={name}
          counts={counts}
          onCancel={() => setConfirming(false)}
          onConfirm={() => {
            setConfirming(false);
            onConfirm();
          }}
        />
      )}
    </span>
  );
}
