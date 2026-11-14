import { type CSSProperties, useEffect, useRef, useState } from "react";
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
type Props = {
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
  useEffect(() => {
    // REQ-034: スナップショットのオブジェクト更新は編集中の選択を変えない。
    if (previousEventId.current !== event.id) {
      previousEventId.current = event.id;
      setStoryId(initialStoryId(event));
      storyGeneration.current++;
      setAddingStory(false);
      setStoryName("");
    } else if (
      storyId === null ||
      event.stories.some((item) => item.id === storyId)
    ) {
      return;
    } else {
      setStoryId(initialStoryId(event));
    }
    taskGeneration.current++;
    setAddingTask(false);
    setTaskName("");
  }, [event, storyId]);
  useEffect(() => {
    if (addingStory) storyNameInput.current?.focus();
  }, [addingStory]);
  useEffect(() => {
    if (addingTask) taskNameInput.current?.focus();
  }, [addingTask]);
  const cancelStory = () => {
    storyGeneration.current++;
    setAddingStory(false);
    setStoryName("");
  };
  const cancelTask = () => {
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
              onClick={() =>
                addingStory ? cancelStory() : setAddingStory(true)
              }
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
              if (savingStory || !storyName.trim()) return;
              const generation = storyGeneration.current;
              storySavingGeneration.current = generation;
              setSavingStory(true);
              try {
                const saved = await onAddStory(event.id, storyName.trim());
                if (saved && generation === storyGeneration.current)
                  cancelStory();
              } finally {
                setSavingStory(false);
              }
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
              onSelect={() => {
                if (onSelectRecord)
                  onSelectRecord(
                    item.id === directGroup.id ? "event" : "story",
                    item.id === directGroup.id ? event.id : item.id,
                    item.id === directGroup.id ? null : undefined,
                  );
                else setStoryId(item.id === directGroup.id ? null : item.id);
              }}
            >
              <button
                className="story-select"
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  if (onSelectRecord)
                    onSelectRecord(
                      item.id === directGroup.id ? "event" : "story",
                      item.id === directGroup.id ? event.id : item.id,
                      item.id === directGroup.id ? null : undefined,
                    );
                  else setStoryId(item.id === directGroup.id ? null : item.id);
                  cancelTask();
                }}
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
              onClick={() => (addingTask ? cancelTask() : setAddingTask(true))}
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
              if (savingTask || !taskName.trim()) return;
              const generation = taskGeneration.current;
              taskSavingGeneration.current = generation;
              setSavingTask(true);
              try {
                const saved = direct
                  ? await onAddEventTask?.(event.id, taskName.trim())
                  : story && (await onAddTask?.(story.id, taskName.trim()));
                if (saved && generation === taskGeneration.current)
                  cancelTask();
              } finally {
                setSavingTask(false);
              }
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
    </section>
  );
}
