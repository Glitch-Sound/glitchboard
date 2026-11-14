import {
  type CSSProperties,
  type Ref,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { normalizeProjectColor } from "../../../../../shared/src/domain/color.js";
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
  eventSchema,
  eventTasks,
  storyPoints,
} from "../../../../../shared/src/domain/index.js";
import type { Operation } from "../../../../../shared/src/domain/messages.js";
import { DeleteDialog } from "../../../features/delete-item/index.js";
import {
  ColorInput,
  hexColorError,
} from "../../../shared/ui/color-input/index.js";
import { DatePicker } from "../../../shared/ui/date-picker/index.js";
import { PointSelector } from "../../../shared/ui/point-selector/index.js";

export type DetailSelection = { projectColor?: string } & (
  | { kind: "project"; item: Project; hierarchy: string[] }
  | { kind: "event"; item: Event; hierarchy: string[] }
  | { kind: "story"; item: Story; hierarchy: string[]; parentDue?: string }
  | { kind: "task"; item: Task; hierarchy: string[]; parentDue?: string }
);

type EditPatch = Extract<Operation, { type: "editItem" }>["patch"];
export type DetailPanelHandle = {
  requestLeave(action: () => void, onCancel?: () => void): void;
};
type Props = {
  ref?: Ref<DetailPanelHandle>;
  selection: DetailSelection;
  onClose(): void;
  onSave?: (
    kind: DetailSelection["kind"],
    id: string,
    patch: EditPatch,
  ) => undefined | boolean | Promise<boolean>;
  onDelete?: () => void;
  deleteCounts?: DescendantCounts;
};

function metrics(selection: DetailSelection): [string, string, string] {
  switch (selection.kind) {
    case "project":
      return [
        `Event ${selection.item.events.length}件`,
        `Story ${selection.item.events.reduce((n, event) => n + event.stories.length, 0)}件`,
        `Task ${selection.item.events.reduce((n, event) => n + eventTasks(event).length, 0)}件`,
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
  ref,
  onClose,
  onSave,
  onDelete,
  deleteCounts,
}: Props) {
  const storedColor =
    selection.kind === "project" ? selection.item.color : "#000000";
  const [color, setColor] = useState(storedColor);
  const previousColor = useRef(storedColor);
  const colorDirty = selection.kind === "project" && color !== storedColor;
  useEffect(() => {
    const previous = previousColor.current;
    previousColor.current = storedColor;
    setColor((value) => (value === previous ? storedColor : value));
  }, [storedColor]);
  const [editing, setEditing] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState(selection.item.name);
  const [due, setDue] = useState(
    selection.kind === "event" ? selection.item.due : "",
  );
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [dueError, setDueError] = useState<string>();
  const [note, setNote] = useState(selection.item.note ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const generation = useRef(0);
  const panel = useRef<HTMLElement>(null);
  const [pendingLeave, setPendingLeave] = useState<(() => void) | null>(null);
  const pendingRef = useRef<(() => void) | null>(null);
  const leaveCancelled = useRef<(() => void) | undefined>(undefined);
  const requestLeave = useCallback(
    (action: () => void, onCancel?: () => void) => {
      if (pendingRef.current) {
        onCancel?.();
        return;
      }
      if (saving) {
        setSaveError("保存中です。完了後にもう一度操作してください。");
        onCancel?.();
        return;
      }
      if (editing || editingNote || colorDirty) {
        leaveCancelled.current = onCancel;
        pendingRef.current = action;
        setPendingLeave(() => action);
      } else action();
    },
    [saving, editing, editingNote, colorDirty],
  );
  useImperativeHandle(ref, () => ({ requestLeave }));
  const prompt = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pendingLeave) return;
    const origin = document.activeElement;
    prompt.current
      ?.querySelector<HTMLButtonElement>("button:last-child")
      ?.focus();
    return () => {
      if (origin instanceof HTMLElement && origin.isConnected) origin.focus();
    };
  }, [pendingLeave]);
  const clearPending = useCallback(() => {
    pendingRef.current = null;
    leaveCancelled.current = undefined;
    setPendingLeave(null);
  }, []);
  const cancelPending = useCallback(() => {
    const cancel = leaveCancelled.current;
    clearPending();
    cancel?.();
  }, [clearPending]);
  useEffect(() => {
    const origin = document.activeElement;
    panel.current?.querySelector<HTMLButtonElement>(".detail-close")?.focus();
    return () => {
      if (origin instanceof HTMLElement && origin.isConnected) origin.focus();
    };
  }, []);
  const cancelEditing = useCallback(() => {
    generation.current++;
    setEditing(false);
    setEditingNote(false);
    setCalendarOpen(false);
    setDueError(undefined);
    setSaveError(undefined);
  }, []);
  const beginEditing = (target: "name" | "note") => {
    requestLeave(() => {
      cancelEditing();
      setName(selection.item.name);
      setDue(selection.kind === "event" ? selection.item.due : "");
      setNote(selection.item.note ?? "");
      if (target === "name") setEditing(true);
      else setEditingNote(true);
    });
  };
  const save = async (patch: EditPatch): Promise<boolean> => {
    if (saving) return false;
    const current = generation.current;
    setSaving(true);
    setSaveError(undefined);
    try {
      const result = await onSave?.(selection.kind, selection.item.id, patch);
      if (current !== generation.current) return false;
      if (result === false) {
        setSaveError("保存に失敗しました。入力を残しています。");
        return false;
      }
      if (patch.color) setColor(patch.color);
      cancelEditing();
      return true;
    } catch (error) {
      if (current === generation.current)
        setSaveError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      setSaving(false);
    }
  };
  const saveCurrent = async () => {
    const patch: EditPatch = {};
    if (editingNote) patch.note = note;
    if (editing) {
      if (!name.trim()) {
        setSaveError("名前を入力してください。");
        return false;
      }
      if (
        selection.kind === "event" &&
        !eventSchema.shape.due.safeParse(due).success
      ) {
        const reason = due
          ? "YYYY-MM-DDで実在する日付を入力してください。"
          : "期限を選んでください。";
        setDueError(reason);
        if (pendingRef.current) setSaveError(reason);
        else if (!due) setCalendarOpen(true);
        return false;
      }
      patch.name = name.trim();
      if (selection.kind === "event") patch.due = due;
    }
    if (colorDirty) {
      const normalized = normalizeProjectColor(color);
      if (!normalized) {
        setSaveError(hexColorError);
        return false;
      }
      patch.color = normalized;
    }
    return save(patch);
  };
  const saveColor = async (value: string) => {
    const normalized = normalizeProjectColor(value);
    if (!normalized || saving) return;
    setSaving(true);
    setSaveError(undefined);
    try {
      const saved = await onSave?.("project", selection.item.id, {
        color: normalized,
      });
      if (saved === false)
        setSaveError("保存に失敗しました。入力を残しています。");
      else setColor(normalized);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : String(error));
    } finally {
      setSaving(false);
    }
  };
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      if (pendingRef.current) {
        if (!saving) cancelPending();
      } else if (confirmDelete) setConfirmDelete(false);
      else if (editing || editingNote) requestLeave(cancelEditing);
      else requestLeave(onClose);
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [
    onClose,
    confirmDelete,
    editing,
    editingNote,
    cancelEditing,
    saving,
    cancelPending,
    requestLeave,
  ]);
  return (
    <aside
      ref={panel}
      className="detail-panel"
      role="dialog"
      aria-label="詳細パネル"
      aria-modal="false"
      style={
        {
          "--detail-accent":
            selection.projectColor ??
            (selection.kind === "project"
              ? selection.item.color
              : "var(--vscode-charts-blue)"),
        } as CSSProperties
      }
    >
      <header>
        <div className="detail-header-content">
          <h2 className="detail-title">
            {selection.hierarchy[0] ?? selection.item.name}
          </h2>
          <p className="detail-target">
            {selection.kind.toUpperCase()} : {selection.item.name}
          </p>
          <p className="detail-hierarchy">{selection.hierarchy.join(" / ")}</p>
        </div>
        <button
          className="detail-close"
          type="button"
          aria-label="詳細を閉じる"
          onClick={() => requestLeave(onClose)}
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
          aria-busy={saving}
          onSubmit={(event) => {
            event.preventDefault();
            void saveCurrent();
          }}
        >
          <label>
            名前{" "}
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              disabled={saving}
            />
          </label>
          {selection.kind === "event" && (
            <DatePicker
              value={due}
              onChange={(value) => {
                setDue(value);
                setDueError(undefined);
              }}
              open={calendarOpen}
              onOpenChange={setCalendarOpen}
              error={dueError}
            />
          )}
          <button type="submit" disabled={saving}>
            {saving ? "保存中…" : "保存"}
          </button>
          <button type="button" onClick={cancelEditing}>
            取消
          </button>
        </form>
      )}
      {selection.kind === "project" && (
        <form
          className="detail-color-form"
          onSubmit={(event) => {
            event.preventDefault();
            void saveColor(color);
          }}
        >
          <h3>Project の色</h3>
          <ColorInput
            value={color}
            fallback={storedColor}
            disabled={saving}
            onChange={setColor}
            onPick={(value) => {
              void saveColor(value);
            }}
            onCancel={() => {
              setColor(storedColor);
              setSaveError(undefined);
            }}
          />
          {colorDirty && (
            <div className="color-actions">
              <button type="submit" disabled={saving}>
                色を保存
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  setColor(storedColor);
                  setSaveError(undefined);
                }}
              >
                色を取消
              </button>
            </div>
          )}
        </form>
      )}
      {selection.kind === "task" && (
        <div className="detail-points">
          <span>ポイント</span>
          <PointSelector
            points={selection.item.points}
            disabled={Boolean(selection.item.doneAt) || saving}
            onChange={(points) => {
              void onSave?.("task", selection.item.id, { points });
            }}
          />
        </div>
      )}
      <section>
        <h3>補足</h3>
        {selection.item.note ? (
          <p className="detail-note">{selection.item.note}</p>
        ) : (
          <button type="button" onClick={() => beginEditing("note")}>
            + 補足を追加
          </button>
        )}
        {selection.item.note && (
          <button type="button" onClick={() => beginEditing("note")}>
            補足を編集
          </button>
        )}
      </section>
      {editingNote && (
        <form
          className="detail-note-form"
          aria-busy={saving}
          onSubmit={(event) => {
            event.preventDefault();
            void saveCurrent();
          }}
        >
          <label>
            補足{" "}
            <textarea
              value={note}
              disabled={saving}
              onChange={(event) => setNote(event.target.value)}
            />
          </label>
          <button type="submit" disabled={saving}>
            {saving ? "保存中…" : "補足を保存"}
          </button>
          <button type="button" onClick={cancelEditing}>
            取消
          </button>
        </form>
      )}
      {saveError && <p role="alert">{saveError}</p>}
      <footer className="detail-actions">
        <button
          className="detail-action"
          type="button"
          onClick={() => beginEditing("name")}
        >
          編集
        </button>
        {onDelete && (
          <button
            className="detail-action detail-delete-action"
            type="button"
            onClick={() => requestLeave(() => setConfirmDelete(true))}
          >
            削除
          </button>
        )}
      </footer>
      {pendingLeave && (
        <div className="unsaved-backdrop">
          <div
            ref={prompt}
            role="alertdialog"
            aria-modal="true"
            aria-label="未保存の編集"
            className="unsaved-dialog"
            onKeyDown={(event) => {
              if (event.key === "Tab") {
                const buttons = Array.from(
                  prompt.current?.querySelectorAll<HTMLButtonElement>(
                    "button:not(:disabled)",
                  ) ?? [],
                );
                const current = buttons.indexOf(
                  document.activeElement as HTMLButtonElement,
                );
                event.preventDefault();
                buttons[
                  (current + (event.shiftKey ? -1 : 1) + buttons.length) %
                    buttons.length
                ]?.focus();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                if (!saving) cancelPending();
              }
            }}
          >
            <h3>未保存の編集があります</h3>
            <p>保存して進むか、編集を破棄するか選んでください。</p>
            {saveError && <p role="alert">{saveError}</p>}
            <button
              type="button"
              disabled={saving}
              onClick={async () => {
                if (await saveCurrent()) {
                  const next = pendingRef.current;
                  clearPending();
                  next?.();
                }
              }}
            >
              {saving ? "保存中…" : "保存して進む"}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                const next = pendingRef.current;
                cancelEditing();
                setColor(storedColor);
                clearPending();
                next?.();
              }}
            >
              破棄して進む
            </button>
            <button type="button" disabled={saving} onClick={cancelPending}>
              キャンセル
            </button>
          </div>
        </div>
      )}
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
