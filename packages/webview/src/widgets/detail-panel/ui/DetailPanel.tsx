import { useEffect, useRef, useState } from "react";
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
import { classifyLinkTarget } from "../../../../../shared/src/domain/link.js";
import type { Operation } from "../../../../../shared/src/domain/messages.js";

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
  onOpenLink?: (target: string) => void;
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
        `${effectiveTaskPoints(selection.item)}pt`,
        selection.item.doneAt ? `完了 ${selection.item.doneAt}` : "未完了",
        `期限 ${selection.parentDue ?? "なし"}`,
      ];
  }
}

/** REQ-026/REQ-027/REQ-028: 全階層に共通する詳細、編集、補足とリンク。 */
export function DetailPanel({
  selection,
  onClose,
  onSave,
  onOpenLink,
  onDelete,
  deleteCounts,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [noteError, setNoteError] = useState("");
  const [name, setName] = useState(selection.item.name);
  const [due, setDue] = useState(
    selection.kind === "event" ? selection.item.due : "",
  );
  const [note, setNote] = useState(selection.item.note ?? "");
  const [links, setLinks] = useState(
    (selection.item.links ?? []).map((link, index) => ({
      ...link,
      key: String(index),
    })),
  );
  const nextLinkId = useRef(links.length);
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
        <div>
          <small>{selection.kind.toUpperCase()}</small>
          <h2>{selection.item.name}</h2>
        </div>
        <button type="button" aria-label="詳細を閉じる" onClick={onClose}>
          ×
        </button>
      </header>
      <p className="detail-hierarchy">{selection.hierarchy.join(" / ")}</p>
      <div className="detail-metrics">
        {metrics(selection).map((metric) => (
          <span key={metric}>{metric}</span>
        ))}
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
        <label>
          ポイント{" "}
          <select
            value={selection.item.points ?? ""}
            onChange={(event) =>
              onSave?.("task", selection.item.id, {
                points: event.target.value
                  ? (Number(event.target.value) as 1 | 2 | 3 | 5 | 8 | 13 | 21)
                  : null,
              })
            }
          >
            <option value="">未見積</option>
            {[1, 2, 3, 5, 8, 13, 21].map((point) => (
              <option key={point} value={point}>
                {point}pt
              </option>
            ))}
          </select>
        </label>
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
      <section>
        <h3>リンク</h3>
        {selection.item.links?.length ? (
          <ul>
            {selection.item.links.map((link) => {
              const safe = classifyLinkTarget(link.target);
              return (
                <li key={`${link.label}-${link.target}`}>
                  <button
                    type="button"
                    disabled={!safe}
                    onClick={() => {
                      if (safe) onOpenLink?.(link.target);
                    }}
                  >
                    {link.label}
                  </button>
                  {!safe && (
                    <span role="alert">無効なリンク: {link.target}</span>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p>リンクなし</p>
        )}
        <button type="button" onClick={() => setEditingNote(true)}>
          リンクを編集
        </button>
      </section>
      {editingNote && (
        <form
          className="detail-note-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              links.some(
                (link) =>
                  !classifyLinkTarget(link.target) || !link.label.trim(),
              )
            ) {
              setNoteError("無効なリンクを修正する");
              return;
            }
            setNoteError("");
            onSave?.(selection.kind, selection.item.id, {
              note,
              links: links.map(({ label, target }) => ({ label, target })),
            });
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
          {links.map((link, index) => (
            <div key={link.key}>
              <label>
                ラベル{" "}
                <input
                  value={link.label}
                  onChange={(event) =>
                    setLinks(
                      links.map((item, i) =>
                        i === index
                          ? { ...item, label: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <label>
                リンク先{" "}
                <input
                  value={link.target}
                  onChange={(event) =>
                    setLinks(
                      links.map((item, i) =>
                        i === index
                          ? { ...item, target: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </label>
              <button
                type="button"
                onClick={() => setLinks(links.filter((_, i) => i !== index))}
              >
                リンクを削除
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              setLinks([
                ...links,
                { label: "", target: "", key: String(nextLinkId.current++) },
              ])
            }
          >
            リンクを追加
          </button>
          {noteError && <p role="alert">{noteError}</p>}
          <button type="submit">補足を保存</button>
          <button type="button" onClick={() => setEditingNote(false)}>
            取消
          </button>
        </form>
      )}
      <footer>
        <button type="button" onClick={() => setEditing(true)}>
          編集
        </button>
        {onDelete && (
          <button type="button" onClick={() => setConfirmDelete(true)}>
            削除
          </button>
        )}
      </footer>
      {confirmDelete && (
        <div
          role="alertdialog"
          aria-label="削除確認"
          className="detail-delete-confirm"
        >
          <p>
            {selection.item.name}と子孫を削除する。Event{" "}
            {deleteCounts?.events ?? 0}件、Story {deleteCounts?.stories ?? 0}
            件、Task {deleteCounts?.tasks ?? 0}件。
          </p>
          <button
            type="button"
            onClick={() => {
              setConfirmDelete(false);
              onDelete?.();
              onClose();
            }}
          >
            削除する
          </button>
          <button type="button" onClick={() => setConfirmDelete(false)}>
            取消
          </button>
        </div>
      )}
    </aside>
  );
}
