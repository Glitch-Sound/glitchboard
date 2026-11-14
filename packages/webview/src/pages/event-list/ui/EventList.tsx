import type { EventDanger } from "../../../../../shared/src/calculation/danger.js";
import { calendarDayDifference } from "../../../../../shared/src/calculation/dates.js";
import type { Project } from "../../../../../shared/src/domain/index.js";
import { groupEvents, type TargetFilter } from "../model/groupEvents.js";

type Props = {
  projects: readonly Project[];
  today: string;
  target: TargetFilter;
  danger?: Record<string, EventDanger>;
  onSelect?: (eventId: string) => void;
};

/** REQ-019: 期限順のEventを4グループで示す。 */
export function EventList({
  projects,
  today,
  target,
  danger = {},
  onSelect,
}: Props) {
  const groups = groupEvents(projects, today, target);
  const labels = {
    overdue: "期限切れ・未完了",
    week: "今週",
    future: "今後",
    completed: "完了済み",
  } as const;
  return (
    <div className="event-list">
      {(Object.keys(labels) as (keyof typeof labels)[]).map(
        (key) =>
          groups[key].length > 0 && (
            <section key={key} className={`event-group event-group-${key}`}>
              <h2>
                {labels[key]}{" "}
                <span>
                  {groups[key].length}
                  <span className="visually-hidden">件</span>
                </span>
              </h2>
              {groups[key].map(({ project, event }) => {
                const days = calendarDayDifference(today, event.due);
                const isDanger =
                  danger[event.id]?.approaching ||
                  danger[event.id]?.overdue ||
                  danger[event.id]?.overflow;
                return (
                  <button
                    type="button"
                    key={event.id}
                    className={`event-row${isDanger ? " danger-text" : ""}`}
                    onClick={() => onSelect?.(event.id)}
                  >
                    <span
                      className="event-project-marker"
                      style={{ borderColor: project.color }}
                      aria-hidden="true"
                    >
                      <i style={{ backgroundColor: project.color }} />
                    </span>
                    <span className="event-row-content">
                      <span className="event-row-name">{event.name}</span>
                      <small>
                        {project.name}・
                        {days < 0 ? `${-days}日超過` : `残り${days}日`}
                      </small>
                    </span>
                    <time dateTime={event.due}>
                      {event.due.slice(5).replace("-", "/")}
                    </time>
                  </button>
                );
              })}
            </section>
          ),
      )}
    </div>
  );
}
