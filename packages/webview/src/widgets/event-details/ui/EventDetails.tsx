import { useEffect, useState } from "react";
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
  storyPoints,
} from "../../../../../shared/src/domain/index.js";
import { DeleteControl } from "../../../features/delete-item/index.js";
import { DetailButton } from "../../../features/detail-button/index.js";
import { InlineAdd } from "../../../features/inline-add/index.js";
import { pointTone } from "../model/pointTone.js";
import { PointSelector } from "./PointSelector.js";

type Points = 1 | 2 | 3 | 5 | 8 | 13 | 21 | null;
type Props = {
  event: Event;
  today: string;
  prediction: string | null;
  danger?: EventDanger;
  onPointsChange?: (taskId: string, points: Points) => void;
  onDoneChange?: (taskId: string, done: boolean) => void;
  onAddStory?: (eventId: string, name: string) => boolean | Promise<boolean>;
  onAddTask?: (storyId: string, name: string) => boolean | Promise<boolean>;
  onDelete?: (kind: ItemKind, id: string, counts: DescendantCounts) => void;
  onOpenDetail?: (kind: "event" | "story" | "task", id: string) => void;
};

function initialStoryId(event: Event): string | null {
  return (
    event.stories.find((story) => story.tasks.some((task) => !task.doneAt))
      ?.id ??
    event.stories[0]?.id ??
    null
  );
}

/** REQ-018/REQ-023/REQ-024: 選択Eventの要約とTask操作を表示する。 */
export function EventDetails({
  event,
  today,
  prediction,
  danger,
  onPointsChange,
  onDoneChange,
  onAddStory,
  onAddTask,
  onDelete,
  onOpenDetail,
}: Props) {
  const [storyId, setStoryId] = useState<string | null>(() =>
    initialStoryId(event),
  );
  useEffect(() => setStoryId(initialStoryId(event)), [event]);
  const story = event.stories.find((item) => item.id === storyId);
  const points = eventPoints(event);
  const remaining = points.total - points.done;
  const unestimated = event.stories.reduce(
    (sum, item) =>
      sum +
      item.tasks.filter((task) => task.points === undefined && !task.doneAt)
        .length,
    0,
  );
  const days = calendarDayDifference(today, event.due);
  return (
    <section className="event-details" aria-label="Event詳細">
      <div
        className={`event-summary ${danger?.approaching || danger?.overdue || danger?.overflow ? "danger-text" : ""}`}
      >
        <h2>
          {onDelete ? (
            <DeleteControl
              kind="event"
              name={event.name}
              counts={eventCounts(event)}
              onConfirm={() => onDelete("event", event.id, eventCounts(event))}
            />
          ) : (
            event.name
          )}
          {onOpenDetail && (
            <DetailButton
              name={event.name}
              note={event.note}
              onOpen={() => onOpenDetail("event", event.id)}
            />
          )}
        </h2>
        <p>{days < 0 ? `${-days}日超過` : `残り${days}日`}</p>
        {prediction && (
          <p>
            完了予測: <time dateTime={prediction}>{prediction}</time>
          </p>
        )}
        <p>
          残り{remaining}pt・未見積{unestimated}件
        </p>
        <p>
          {points.done}pt / {points.total}pt
        </p>
      </div>
      <section aria-label="Story一覧">
        <h3>
          Story{" "}
          {onAddStory && (
            <InlineAdd
              kind="story"
              onSubmit={({ name }) => onAddStory(event.id, name)}
            />
          )}
        </h3>
        {event.stories.map((item) => {
          const progress = storyPoints(item);
          const done = item.tasks.filter((task) => task.doneAt).length;
          return (
            <div key={item.id} className="story-choice">
              <button
                type="button"
                aria-pressed={item.id === storyId}
                onClick={() => setStoryId(item.id)}
              >
                <span>{item.name}</span>
                <small>
                  {done}/{item.tasks.length} Task・{progress.done}/
                  {progress.total}pt
                </small>
                <progress value={progress.done} max={progress.total || 1} />
              </button>
              {onDelete && (
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
              {onOpenDetail && (
                <DetailButton
                  name={item.name}
                  note={item.note}
                  onOpen={() => onOpenDetail("story", item.id)}
                />
              )}
            </div>
          );
        })}
      </section>
      <section aria-label="Task一覧">
        <h3>
          Task{" "}
          {onAddTask && story && (
            <InlineAdd
              kind="task"
              onSubmit={({ name }) => onAddTask(story.id, name)}
            />
          )}
        </h3>
        {story ? (
          story.tasks.map((task) => (
            <div key={task.id} className="task-line">
              <input
                type="checkbox"
                checked={Boolean(task.doneAt)}
                readOnly={!onDoneChange}
                onChange={(change) =>
                  onDoneChange?.(task.id, change.target.checked)
                }
                aria-label={`${task.name}の完了`}
              />
              <span
                className="task-name"
                style={{
                  textDecoration: task.doneAt ? "line-through" : undefined,
                }}
              >
                {task.name}
              </span>
              {onPointsChange ? (
                <PointSelector
                  points={task.points}
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
                    onOpen={() => onOpenDetail("task", task.id)}
                  />
                )}
              </span>
            </div>
          ))
        ) : (
          <p>Taskなし</p>
        )}
      </section>
    </section>
  );
}
