import { useState } from "react";
import type { EventDanger } from "../../../../../shared/src/calculation/danger.js";
import {
  isWorkday,
  type WorkdaySettings,
} from "../../../../../shared/src/calculation/dates.js";
import {
  type DescendantCounts,
  projectCounts,
} from "../../../../../shared/src/domain/deletion.js";
import type { Project } from "../../../../../shared/src/domain/index.js";
import { DeleteControl } from "../../../features/delete-item/index.js";
import { DetailButton } from "../../../features/detail-button/index.js";

type Period = "three-days" | "week" | "month";
type Props = {
  projects: readonly Project[];
  days: readonly string[];
  today: string;
  period: Period;
  selectedEventId: string | null;
  onSelect(eventId: string): void;
  settings?: WorkdaySettings;
  danger?: Record<string, EventDanger>;
  onDelete?: (kind: "project", id: string, counts: DescendantCounts) => void;
  onOpenDetail?: (kind: "project", id: string) => void;
};

const defaultSettings: WorkdaySettings = {
  workdays_off: ["sat", "sun"],
  public_holidays: true,
};

function dayTone(
  day: string,
  today: string,
  settings: WorkdaySettings,
): string {
  const holiday = !isWorkday(day, settings);
  if (day === today) return holiday ? "today-holiday" : "today";
  return holiday ? "holiday" : "";
}

/** REQ-016: Project別の日付列にEvent期限をまとめて表示する。 */
export function Timeline({
  projects,
  days,
  today,
  period,
  selectedEventId,
  onSelect,
  settings = defaultSettings,
  danger = {},
  onDelete,
  onOpenDetail,
}: Props) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <table className="timeline" aria-label="期限タイムライン">
      <thead>
        <tr className="timeline-row timeline-heading">
          <th scope="col">Project</th>
          {days.map((day) => (
            <th scope="col" key={day} className={dayTone(day, today, settings)}>
              <time dateTime={day}>{day.slice(5)}</time>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => (
          <tr className="timeline-row" key={project.id}>
            <th scope="row" style={{ borderInlineStartColor: project.color }}>
              {onDelete ? (
                <DeleteControl
                  kind="project"
                  name={project.name}
                  counts={projectCounts(project)}
                  onConfirm={() =>
                    onDelete("project", project.id, projectCounts(project))
                  }
                />
              ) : (
                project.name
              )}
              {onOpenDetail && (
                <DetailButton
                  name={project.name}
                  note={project.note}
                  onOpen={() => onOpenDetail("project", project.id)}
                />
              )}
            </th>
            {days.map((day) => {
              const events = project.events.filter(
                (event) => event.due === day,
              );
              const key = `${project.id}:${day}`;
              const selected = events.find(
                (event) => event.id === selectedEventId,
              );
              const urgent = events.some((event) => {
                const flag = danger[event.id];
                return flag?.approaching || flag?.overdue || flag?.overflow;
              });
              const caution = events.some((event) => danger[event.id]?.caution);
              return (
                <td key={day} className={dayTone(day, today, settings)}>
                  {events.length > 0 && (
                    <div className="marker-wrap">
                      <button
                        type="button"
                        className={`event-marker ${urgent ? "danger" : caution ? "caution" : ""}`}
                        style={{ color: project.color }}
                        aria-label={
                          events.length > 1
                            ? `${events.length}件のEvent`
                            : events[0]?.name
                        }
                        onClick={() =>
                          events.length > 1
                            ? setOpen(open === key ? null : key)
                            : events[0] && onSelect(events[0].id)
                        }
                      >
                        ◆{events.length > 1 && <sup>{events.length}件</sup>}
                      </button>
                      {selected &&
                        (period === "month" || events.length === 1) && (
                          <span className="marker-label">{selected.name}</span>
                        )}
                      {open === key && (
                        <div role="listbox" className="marker-list">
                          {events.map((event) => (
                            <button
                              key={event.id}
                              role="option"
                              aria-selected={event.id === selectedEventId}
                              type="button"
                              onClick={() => {
                                onSelect(event.id);
                                setOpen(null);
                              }}
                            >
                              {event.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
