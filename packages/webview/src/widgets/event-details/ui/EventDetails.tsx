import {
  type CSSProperties,
  type Ref,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import type { EventDanger } from "../../../../../shared/src/calculation/danger.js";
import { calendarDayDifference } from "../../../../../shared/src/calculation/dates.js";
import {
  type DescendantCounts,
  eventCounts,
  type ItemKind,
} from "../../../../../shared/src/domain/deletion.js";
import {
  type Event,
  effectiveTaskPoints,
  eventPoints,
  eventTaskGroupName,
  eventTasks,
  storyPoints,
} from "../../../../../shared/src/domain/index.js";
import { DeleteControl } from "../../../features/delete-item/index.js";
import { DetailButton } from "../../../features/detail-button/index.js";
import { RecordSurface } from "../../../shared/ui/record-surface/index.js";
import { pointTone } from "../model/pointTone.js";
import { PointSelector } from "./PointSelector.js";

type Points = 1 | 2 | 3 | 5 | 8 | 13 | 21 | null;
export type EventDetailsHandle = {
  requestLeave(
    action: () => void,
    target: { eventId: string | null; storyId?: string | null },
  ): void;
};
type Props = {
  ref?: Ref<EventDetailsHandle>;
  event: Event;
  selectedStoryId?: string | null;
  selectedTaskId?: string;
  onSelectRecord?: (
    kind: "event" | "story" | "task",
    id: string,
    groupId?: null,
  ) => void;
  today: string;
  prediction: string | null;
  danger?: EventDanger;
  projectName?: string;
  projectColor?: string;
  onPointsChange?: (taskId: string, points: Points) => void;
  onDoneChange?: (taskId: string, done: boolean) => void;
  onAddStory?: (eventId: string, name: string) => boolean | Promise<boolean>;
  onAddTask?: (storyId: string, name: string) => boolean | Promise<boolean>;
  onAddEventTask?: (
    eventId: string,
    name: string,
  ) => boolean | Promise<boolean>;
  onDelete?: (kind: ItemKind, id: string, counts: DescendantCounts) => void;
  onOpenDetail?: (
    kind: "event" | "story" | "task",
    id: string,
    groupId?: null,
  ) => void;
};

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

function shortDate(date: string): string {
  const day = new Date(`${date}T00:00:00Z`).getUTCDay();
  return `${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}(${weekdays[day]})`;
}

function initialStoryId(event: Event): string | null {
  if (event.tasks?.some((task) => !task.doneAt)) return null;
  const pending = event.stories.find((story) =>
    story.tasks.some((task) => !task.doneAt),
  );
  if (pending) return pending.id;
  return event.tasks?.length ? null : (event.stories[0]?.id ?? null);
}

/** REQ-018/REQ-023/REQ-024: 選択Eventの要約とTask操作を表示する。 */
export function EventDetails({
  event,
  ref,
  selectedStoryId,
  selectedTaskId,
  onSelectRecord,
  today,
  prediction,
  danger,
  projectName,
  projectColor,
  onPointsChange,
  onDoneChange,
  onAddStory,
  onAddTask,
  onAddEventTask,
  onDelete,
  onOpenDetail,
}: Props) {
  const [internalStoryId, setStoryId] = useState<string | null>(() =>
    initialStoryId(event),
  );
  const storyId =
    selectedStoryId !== undefined ? selectedStoryId : internalStoryId;
  const [addingStory, setAddingStory] = useState(false);
  const [storyName, setStoryName] = useState("");
  const [savingStory, setSavingStory] = useState(false);
  const storyNameInput = useRef<HTMLInputElement>(null);
  const [addingTask, setAddingTask] = useState(false);
  const [taskName, setTaskName] = useState("");
  const [savingTask, setSavingTask] = useState(false);
  const taskNameInput = useRef<HTMLInputElement>(null);
  const previousEventId = useRef(event.id);
  const storyGeneration = useRef(0);
  const taskGeneration = useRef(0);
  const storySavingGeneration = useRef<number | null>(null);
  const taskSavingGeneration = useRef<number | null>(null);
  const taskTarget = useRef<{ eventId: string; storyId: string | null } | null>(
    null,
  );
  const storyTarget = useRef<string | null>(null);
  const taskBusy = useRef(false);
  const storyBusy = useRef(false);
  type Pending = { action: () => void; task: boolean; story: boolean };
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const prompt = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // REQ-034: スナップショットのオブジェクト更新は編集中の選択を変えない。
    if (previousEventId.current !== event.id) {
      previousEventId.current = event.id;
      setStoryId(initialStoryId(event));
      storyGeneration.current++;
      setAddingStory(false);
      setStoryName("");
      storyTarget.current = null;
    } else if (
      (storyId === null || event.stories.some((item) => item.id === storyId)) &&
      (!taskTarget.current || taskTarget.current.storyId === storyId)
    ) {
      return;
    } else {
      setStoryId(initialStoryId(event));
    }
    taskGeneration.current++;
    setAddingTask(false);
    setTaskName("");
    taskTarget.current = null;
    pendingRef.current = null;
    setPending(null);
  }, [event, storyId]);
  useEffect(() => {
    if (addingStory) storyNameInput.current?.focus();
  }, [addingStory]);
  useEffect(() => {
    if (addingTask) taskNameInput.current?.focus();
  }, [addingTask]);
  const cancelStory = () => {
    setDraftError(null);
    storyTarget.current = null;
    storyGeneration.current++;
    setAddingStory(false);
    setStoryName("");
  };
  const cancelTask = () => {
    setDraftError(null);
    taskTarget.current = null;
    taskGeneration.current++;
    setAddingTask(false);
    setTaskName("");
  };
  const story = event.stories.find((item) => item.id === storyId);
  const direct = storyId === null;
  const directGroup = {
    id: `${event.id}-direct`,
    name: eventTaskGroupName,
    note: undefined,
    tasks: event.tasks ?? [],
  };
  const selectedTasks = direct ? directGroup.tasks : story?.tasks;
  const canAddTask = direct
    ? Boolean(onAddEventTask)
    : Boolean(onAddTask && story);
  const saveTaskDraft = async (): Promise<boolean> => {
    const target = taskTarget.current;
    if (taskBusy.current) return false;
    if (!taskName.trim()) {
      setDraftError("Task名を入力してください。");
      return false;
    }
    if (!target || target.eventId !== event.id || target.storyId !== storyId) {
      setDraftError("追加先が変わったため保存できません。");
      return false;
    }
    const generation = taskGeneration.current;
    taskSavingGeneration.current = generation;
    taskBusy.current = true;
    setSavingTask(true);
    setDraftError(null);
    try {
      const saved =
        target.storyId === null
          ? await onAddEventTask?.(target.eventId, taskName.trim())
          : await onAddTask?.(target.storyId, taskName.trim());
      if (generation !== taskGeneration.current) return false;
      if (!saved) {
        if (pendingRef.current)
          setDraftError("追加に失敗しました。入力と追加先を残しています。");
        return false;
      }
      cancelTask();
      return true;
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      taskBusy.current = false;
      setSavingTask(false);
    }
  };
  const saveStoryDraft = async (): Promise<boolean> => {
    const target = storyTarget.current;
    if (storyBusy.current) return false;
    if (!storyName.trim()) {
      setDraftError("Story名を入力してください。");
      return false;
    }
    if (!target || target !== event.id) {
      setDraftError("追加先が変わったため保存できません。");
      return false;
    }
    const generation = storyGeneration.current;
    storySavingGeneration.current = generation;
    storyBusy.current = true;
    setSavingStory(true);
    setDraftError(null);
    try {
      const saved = await onAddStory?.(target, storyName.trim());
      if (generation !== storyGeneration.current) return false;
      if (!saved) {
        if (pendingRef.current)
          setDraftError("追加に失敗しました。入力と追加先を残しています。");
        return false;
      }
      cancelStory();
      return true;
    } catch (error) {
      setDraftError(error instanceof Error ? error.message : String(error));
      return false;
    } finally {
      storyBusy.current = false;
      setSavingStory(false);
    }
  };
  const requestLeave: EventDetailsHandle["requestLeave"] = (action, target) => {
    if (pendingRef.current) return;
    const eventMoves = target.eventId !== event.id;
    const taskMoves =
      eventMoves ||
      (target.storyId === undefined ? internalStoryId : target.storyId) !==
        storyId;
    if ((taskMoves && taskBusy.current) || (eventMoves && storyBusy.current)) {
      setDraftError("追加中です。完了後にもう一度操作してください。");
      return;
    }
    const task = taskMoves && addingTask && taskName.length > 0;
    const story = eventMoves && addingStory && storyName.length > 0;
    const commit = () => {
      if (taskMoves) cancelTask();
      if (eventMoves) cancelStory();
      action();
    };
    if (task || story) {
      const next = { action: commit, task, story };
      pendingRef.current = next;
      setPending(next);
      setDraftError(null);
    } else commit();
  };
  useImperativeHandle(ref, () => ({ requestLeave }));
  const cancelLeave = () => {
    if (taskBusy.current || storyBusy.current) return;
    pendingRef.current = null;
    setPending(null);
    setDraftError(null);
  };
  useEffect(() => {
    if (!pending) return;
    const origin = document.activeElement;
    prompt.current
      ?.querySelector<HTMLButtonElement>("button:last-child")
      ?.focus();
    return () => {
      if (origin instanceof HTMLElement && origin.isConnected) origin.focus();
    };
  }, [pending]);
  const selectGroup = (id: string) => {
    const next = id === directGroup.id ? null : id;
    if (onSelectRecord)
      onSelectRecord(
        next === null ? "event" : "story",
        next ?? event.id,
        next === null ? null : undefined,
      );
    else
      requestLeave(() => setStoryId(next), {
        eventId: event.id,
        storyId: next,
      });
  };
  const groups = [directGroup, ...event.stories];
  const points = eventPoints(event);
  const remaining = points.total - points.done;
  const unestimated = eventTasks(event).filter(
    (task) => task.points === undefined && !task.doneAt,
  ).length;
  const days = calendarDayDifference(today, event.due);
  return (
    <section
      className="event-details"
      aria-label="Event詳細"
      style={
        {
          "--event-accent": projectColor ?? "var(--vscode-charts-blue)",
        } as CSSProperties
      }
    >
      <RecordSurface
        className="event-summary"
        name={event.name}
        onSelect={() => onSelectRecord?.("event", event.id)}
      >
        <div className="event-summary-heading">
          {projectName && (
            <p className="event-project-label">
              <i style={{ backgroundColor: projectColor }} aria-hidden="true" />
              {projectName}
            </p>
          )}
          <h2>
            {onDelete ? (
              <DeleteControl
                kind="event"
                name={event.name}
                counts={eventCounts(event)}
                onOpen={
                  onOpenDetail
                    ? () => onSelectRecord?.("event", event.id)
                    : undefined
                }
                onConfirm={() =>
                  onDelete("event", event.id, eventCounts(event))
                }
              />
            ) : onOpenDetail ? (
              <button
                type="button"
                className="item-name"
                onClick={() => onSelectRecord?.("event", event.id)}
              >
                {event.name}
              </button>
            ) : (
              event.name
            )}
            {onOpenDetail && (
              <DetailButton
                name={event.name}
                note={event.note}
                icon="document"
                onOpen={() => onOpenDetail("event", event.id)}
              />
            )}
          </h2>
          <p className="event-due">
            期限 <time dateTime={event.due}>{shortDate(event.due)}</time>
          </p>
        </div>
        <p
          className={`event-days ${danger?.approaching || danger?.overdue || danger?.overflow ? "danger-text" : ""}`}
        >
          <span className="visually-hidden">
            {days < 0 ? `${-days}日超過` : `残り${days}日`}
          </span>
          <span aria-hidden="true">{days < 0 ? "超過" : "残り"}</span>
          <strong aria-hidden="true">{Math.abs(days)}</strong>
          <span aria-hidden="true">日</span>
        </p>
        <div className="event-summary-metrics">
          {prediction && (
            <p
              className={`event-prediction ${prediction > event.due ? "danger-text" : "success-text"}`}
            >
              <span>完了予測</span>
              <time dateTime={prediction}>{shortDate(prediction)}</time>
            </p>
          )}
          <p>
            <span>残りポイント</span>
            <strong>
              {remaining}pt (未見積{unestimated})
            </strong>
          </p>
          <p>
            <span>消化</span>
            <strong>
              {points.done}/{points.total}pt
            </strong>
          </p>
          <progress
            className="event-progress"
            style={
              {
                "--event-progress-color":
                  projectColor ?? "var(--vscode-charts-blue)",
              } as CSSProperties
            }
            value={points.done}
            max={points.total || 1}
            aria-label="Event進捗"
          />
        </div>
      </RecordSurface>
      <section aria-label="Story一覧">
        <h3>
          Story{" "}
          {onAddStory && (
            <button
              className="inline-add-trigger"
              type="button"
              aria-label="Storyを追加"
              aria-expanded={addingStory}
              onClick={() => {
                if (addingStory) cancelStory();
                else {
                  storyTarget.current = event.id;
                  setAddingStory(true);
                }
              }}
            >
              <span className="inline-add-plus" aria-hidden="true">
                +
              </span>
            </button>
          )}
        </h3>
        {addingStory && onAddStory && (
          <form
            className="story-add-form section-add-form"
            onKeyDown={(keyEvent) => {
              if (keyEvent.key === "Escape") {
                keyEvent.preventDefault();
                cancelStory();
              }
            }}
            onSubmit={async (submitEvent) => {
              submitEvent.preventDefault();
              await saveStoryDraft();
            }}
          >
            <input
              ref={storyNameInput}
              disabled={
                savingStory &&
                storySavingGeneration.current === storyGeneration.current
              }
              type="text"
              aria-label="名前"
              placeholder="Story名 — Enterで追加 / Escで取消"
              value={storyName}
              onChange={(changeEvent) => setStoryName(changeEvent.target.value)}
            />
            {storyName.trim() && (
              <button type="submit" disabled={savingStory}>
                追加
              </button>
            )}
          </form>
        )}
        {groups.map((item) => {
          const selected =
            item.id === directGroup.id ? direct : item.id === storyId;
          const progress = storyPoints(item);
          const done = item.tasks.filter((task) => task.doneAt).length;
          return (
            <RecordSurface
              key={item.id}
              name={item.name}
              className={`story-choice ${selected ? "selected" : ""}`}
              onSelect={() => selectGroup(item.id)}
            >
              <button
                className="story-select"
                type="button"
                aria-pressed={selected}
                onClick={() => selectGroup(item.id)}
              >
                <span className="story-name">{item.name}</span>
                <small>
                  {done}/{item.tasks.length} Task
                </small>
                <progress value={progress.done} max={progress.total || 1} />
                <strong className="story-points">
                  {progress.done}/{progress.total}pt
                </strong>
              </button>
              {onDelete && item.id !== directGroup.id && (
                <DeleteControl
                  kind="story"
                  name={item.name}
                  iconOnly
                  counts={{ events: 0, stories: 0, tasks: item.tasks.length }}
                  onConfirm={() =>
                    onDelete("story", item.id, {
                      events: 0,
                      stories: 0,
                      tasks: item.tasks.length,
                    })
                  }
                />
              )}
              {onOpenDetail && item.id !== directGroup.id && (
                <DetailButton
                  name={item.name}
                  note={item.note}
                  icon="document"
                  onOpen={() => onOpenDetail("story", item.id)}
                />
              )}
            </RecordSurface>
          );
        })}
        <p className="workflow-hint">
          Story は必要なときだけ作業をまとめるグループです。
        </p>
      </section>
      <section aria-label="Task一覧">
        <h3>
          Task
          {story ? `・${story.name}` : direct ? `・${eventTaskGroupName}` : ""}{" "}
          {canAddTask && (
            <button
              className="inline-add-trigger"
              type="button"
              aria-label="Taskを追加"
              aria-expanded={addingTask}
              onClick={() => {
                if (addingTask) cancelTask();
                else {
                  taskTarget.current = { eventId: event.id, storyId };
                  setAddingTask(true);
                }
              }}
            >
              <span className="inline-add-plus" aria-hidden="true">
                +
              </span>
            </button>
          )}
        </h3>
        {addingTask && canAddTask && (
          <form
            className="task-add-form section-add-form"
            onKeyDown={(keyEvent) => {
              if (keyEvent.key === "Escape") {
                keyEvent.preventDefault();
                cancelTask();
              }
            }}
            onSubmit={async (submitEvent) => {
              submitEvent.preventDefault();
              await saveTaskDraft();
            }}
          >
            <input
              ref={taskNameInput}
              disabled={
                savingTask &&
                taskSavingGeneration.current === taskGeneration.current
              }
              type="text"
              aria-label="名前"
              placeholder="Task名 — Enterで追加 / Escで取消"
              value={taskName}
              onChange={(changeEvent) => setTaskName(changeEvent.target.value)}
            />
            {taskName.trim() && (
              <button type="submit" disabled={savingTask}>
                追加
              </button>
            )}
          </form>
        )}
        {selectedTasks?.length ? (
          selectedTasks.map((task) => (
            <RecordSurface
              key={task.id}
              name={task.name}
              className={`task-line${task.doneAt ? " completed" : ""}${selectedTaskId === task.id ? " selected" : ""}`}
              onSelect={() => onSelectRecord?.("task", task.id)}
            >
              <input
                type="checkbox"
                checked={Boolean(task.doneAt)}
                readOnly={!onDoneChange}
                onChange={(change) =>
                  onDoneChange?.(task.id, change.target.checked)
                }
                aria-label={`${task.name}の完了`}
              />
              {onOpenDetail ? (
                <button
                  type="button"
                  className="task-name item-name"
                  onClick={() => onSelectRecord?.("task", task.id)}
                >
                  {task.name}
                </button>
              ) : (
                <span
                  className="task-name"
                  style={{
                    textDecoration: task.doneAt ? "line-through" : undefined,
                  }}
                >
                  {task.name}
                </span>
              )}
              {onPointsChange ? (
                <PointSelector
                  points={task.points}
                  disabled={Boolean(task.doneAt)}
                  onChange={(points) => onPointsChange(task.id, points)}
                />
              ) : (
                <b className={`point-badge ${pointTone(task.points)}`}>
                  {task.points === undefined
                    ? "未見積"
                    : `${effectiveTaskPoints(task)}pt`}
                </b>
              )}
              <span className="task-actions">
                {onDelete && (
                  <DeleteControl
                    kind="task"
                    name={task.name}
                    iconOnly
                    counts={{ events: 0, stories: 0, tasks: 0 }}
                    onConfirm={() =>
                      onDelete("task", task.id, {
                        events: 0,
                        stories: 0,
                        tasks: 0,
                      })
                    }
                  />
                )}
                {onOpenDetail && (
                  <DetailButton
                    name={task.name}
                    note={task.note}
                    icon="document"
                    onOpen={() => onOpenDetail("task", task.id)}
                  />
                )}
              </span>
            </RecordSurface>
          ))
        ) : (
          <p className="workflow-hint">
            {onAddEventTask
              ? "＋ から Task を追加できます。Story の作成は不要です。"
              : "Task はまだありません。"}
          </p>
        )}
      </section>
      {draftError && !pending && <p role="alert">{draftError}</p>}
      {pending &&
        createPortal(
          <div className="unsaved-backdrop">
            <div
              ref={prompt}
              role="alertdialog"
              aria-modal="true"
              aria-label="未保存の追加入力"
              className="unsaved-dialog"
              onKeyDown={(key) => {
                if (key.key === "Escape") {
                  key.preventDefault();
                  key.stopPropagation();
                  cancelLeave();
                }
                if (key.key === "Tab") {
                  key.preventDefault();
                  const buttons = Array.from(
                    prompt.current?.querySelectorAll<HTMLButtonElement>(
                      "button:not(:disabled)",
                    ) ?? [],
                  );
                  const current = buttons.indexOf(
                    document.activeElement as HTMLButtonElement,
                  );
                  buttons[
                    (current + (key.shiftKey ? -1 : 1) + buttons.length) %
                      buttons.length
                  ]?.focus();
                }
              }}
            >
              <h3>未保存の追加入力があります</h3>
              {pending.task && (
                <p>
                  Task「{taskName}」の追加先: {event.name} /{" "}
                  {story?.name ?? eventTaskGroupName}
                </p>
              )}
              {pending.story && (
                <p>
                  Story「{storyName}」の追加先: {event.name}
                </p>
              )}
              {draftError && <p role="alert">{draftError}</p>}
              <button
                type="button"
                disabled={savingTask || savingStory}
                onClick={async () => {
                  const next = pendingRef.current;
                  if (!next || taskBusy.current || storyBusy.current) return;
                  if (next.task) {
                    if (!(await saveTaskDraft())) return;
                    next.task = false;
                  }
                  if (next.story) {
                    if (!(await saveStoryDraft())) return;
                    next.story = false;
                  }
                  pendingRef.current = null;
                  setPending(null);
                  next.action();
                }}
              >
                {savingTask || savingStory ? "追加中…" : "追加して進む"}
              </button>
              <button
                type="button"
                disabled={savingTask || savingStory}
                onClick={() => {
                  const next = pendingRef.current;
                  if (!next) return;
                  pendingRef.current = null;
                  setPending(null);
                  next.action();
                }}
              >
                破棄して進む
              </button>
              <button
                type="button"
                disabled={savingTask || savingStory}
                onClick={cancelLeave}
              >
                キャンセル
              </button>
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
