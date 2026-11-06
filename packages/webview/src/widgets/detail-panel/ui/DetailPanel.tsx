import { useEffect, useState } from "react";
import type { DescendantCounts } from "../../../../../shared/src/domain/deletion.js";
import type {
  Event,
  Project,
  Story,
  Task,
} from "../../../../../shared/src/domain/index.js";
import {
  effectiveTaskPoints,
  eventPoints,
  storyPoints,
} from "../../../../../shared/src/domain/index.js";
import type { Operation } from "../../../../../shared/src/domain/messages.js";
import { DeleteDialog } from "../../../features/delete-item/index.js";

export type DetailSelection =
  | { kind: "project"; item: Project; hierarchy: string[] }
  | { kind: "event"; item: Event; hierarchy: string[] }
  | { kind: "story"; item: Story; hierarchy: string[]; parentDue?: string }
  | { kind: "task"; item: Task; hierarchy: string[]; parentDue?: string };

type EditPatch = Extract<Operation, { type: "editItem" }>["patch"];
type Props = {
  selection: DetailSelection;
  onClose(): void;
  onSave?: (
    kind: DetailSelection["kind"],
    id: string,
    patch: EditPatch,
  ) => void;
  onDelete?: () => void;
  deleteCounts?: DescendantCounts;
};

function metrics(selection: DetailSelection): [string, string, string] {
  switch (selection.kind) {
    case "project":
      return [
        `Event ${selection.item.events.length}件`,
        `Story ${selection.item.events.reduce((n, event) => n + event.stories.length, 0)}件`,
        `Task ${selection.item.events.reduce((n, event) => n + event.stories.reduce((m, story) => m + story.tasks.length, 0), 0)}件`,
      ];
    case "event": {
      const points = eventPoints(selection.item);
      return [
        `期限 ${selection.item.due}`,
        `残り ${points.total - points.done}pt`,
        `完了 ${points.done}pt`,
      ];
    }
    case "story": {
      const points = storyPoints(selection.item);
      return [
        `Task ${selection.item.tasks.length}件`,
        `残り ${points.total - points.done}pt`,
        `完了 ${points.done}pt`,
      ];
    }
    case "task":
      return [
        `ポイント ${effectiveTaskPoints(selection.item)}pt`,
        selection.item.doneAt
          ? `状態 完了 ${selection.item.doneAt}`
          : "状態 未完了",
        `期限 ${selection.parentDue ?? "なし"}`,
      ];
  }
}

/** REQ-026/REQ-027/REQ-028: 全階層に共通する詳細、編集、補足。 */
export function DetailPanel({
  selection,
  onClose,
  onSave,
  onDelete,
  deleteCounts,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(selection.item.name);
  const [due, setDue] = useState(
    selection.kind === "event" ? selection.item.due : "",
  );
  const [note, setNote] = useState(selection.item.note ?? "");
  const pointValues = [1, 2, 3, 5, 8, 13, 21] as const;
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <aside
      className="detail-panel"
      role="dialog"
      aria-label="詳細パネル"
      aria-modal="false"
    >
      <header>
        <div className="detail-header-content">
          <small className={`detail-kind detail-kind-${selection.kind}`}>
            {selection.kind.toUpperCase()}
          </small>
          <p className="detail-hierarchy">{selection.hierarchy.join(" / ")}</p>
          <h2 className="detail-title">{selection.item.name}</h2>
        </div>
        <button
          className="detail-close"
          type="button"
          aria-label="詳細を閉じる"
          onClick={onClose}
        >
          ×
        </button>
      </header>
      <div className="detail-metrics">
        {metrics(selection).map((metric) => {
          const [label, ...value] = metric.split(" ");
          return (
            <span key={metric}>
              <small>{label}</small>
              <strong>{value.join(" ")}</strong>
            </span>
          );
        })}
      </div>
      {editing && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (!name.trim()) return;
            onSave?.(
              selection.kind,
              selection.item.id,
              selection.kind === "event"
                ? { name: name.trim(), due }
                : { name: name.trim() },
            );
            setEditing(false);
          }}
        >
          <label>
            名前{" "}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </label>
          {selection.kind === "event" && (
            <label>
              期限{" "}
              <input
                type="date"
                value={due}
                onChange={(event) => setDue(event.target.value)}
                required
              />
            </label>
          )}
          <button type="submit">保存</button>
          <button type="button" onClick={() => setEditing(false)}>
            取消
          </button>
        </form>
      )}
      {selection.kind === "project" && (
        <label>
          色{" "}
          <input
            type="color"
            value={selection.item.color}
            onChange={(event) =>
              onSave?.("project", selection.item.id, {
                color: event.target.value,
              })
            }
          />
        </label>
      )}
      {selection.kind === "task" && (
        <div className="detail-points">
          <label htmlFor="detail-point-range">
            ポイント{" "}
            <strong>
              {selection.item.points === undefined
                ? "未見積"
                : `${selection.item.points}pt`}
            </strong>
          </label>
          <input
            id="detail-point-range"
            type="range"
            min="0"
            max={pointValues.length - 1}
            step="1"
            value={Math.max(0, pointValues.indexOf(selection.item.points ?? 3))}
            onChange={(event) =>
              onSave?.("task", selection.item.id, {
                points: pointValues[Number(event.target.value)] ?? 3,
              })
            }
          />
          <button
            type="button"
            onClick={() =>
              onSave?.("task", selection.item.id, { points: null })
            }
          >
            未見積に戻す
          </button>
        </div>
      )}
      <section>
        <h3>補足</h3>
        {selection.item.note ? (
          <p className="detail-note">{selection.item.note}</p>
        ) : (
          <button type="button" onClick={() => setEditingNote(true)}>
            + 補足を追加
          </button>
        )}
        {selection.item.note && (
          <button type="button" onClick={() => setEditingNote(true)}>
            補足を編集
          </button>
        )}
      </section>
      {editingNote && (
        <form
          className="detail-note-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSave?.(selection.kind, selection.item.id, { note });
            setEditingNote(false);
          }}
        >
          <label>
            補足{" "}
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <button type="submit">補足を保存</button>
          <button type="button" onClick={() => setEditingNote(false)}>
            取消
          </button>
        </form>
      )}
      <footer className="detail-actions">
        <button
          className="detail-action"
          type="button"
          onClick={() => setEditing(true)}
        >
          編集
        </button>
        {onDelete && (
          <button
            className="detail-action detail-delete-action"
            type="button"
            onClick={() => setConfirmDelete(true)}
          >
            削除
          </button>
        )}
      </footer>
      {confirmDelete && (
        <DeleteDialog
          kind={selection.kind}
          name={selection.item.name}
          counts={deleteCounts ?? { events: 0, stories: 0, tasks: 0 }}
          onCancel={() => setConfirmDelete(false)}
          onConfirm={() => {
            setConfirmDelete(false);
            onDelete?.();
            onClose();
          }}
        />
      )}
    </aside>
  );
}
