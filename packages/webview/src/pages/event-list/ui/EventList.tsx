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
            <section key={key}>
              <h2>{labels[key]}</h2>
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
                    className={isDanger ? "danger-text" : ""}
                    onClick={() => onSelect?.(event.id)}
                  >
                    <span>{event.name}</span>
                    <small>
                      {project.name}・
                      {days < 0 ? `${-days}日超過` : `残り${days}日`}・
                      {event.due}
                    </small>
                  </button>
                );
              })}
            </section>
          ),
      )}
    </div>
  );
}
