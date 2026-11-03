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
import { InlineAdd } from "../../../features/inline-add/index.js";

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
  requiredByDay?: Readonly<Record<string, number>>;
  pace?: number | null;
  learning?: boolean;
  onAddProject?: (name: string, color: string) => boolean | Promise<boolean>;
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

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

function RequiredPace({
  days,
  requiredByDay,
  pace,
  learning,
}: Pick<Props, "days" | "requiredByDay" | "pace" | "learning">) {
  const values = days.map((day) => requiredByDay?.[day] ?? 0);
  const maxValue = Math.max(0, ...values);
  const scale = Math.max(1, maxValue, pace ?? 0);
  const y = (value: number) => 76 - (value / scale) * 55;
  const width = Math.max(1, days.length) * 100;
  const step = values
    .map(
      (value, index) =>
        `${index === 0 ? "M" : "L"}${index * 100},${y(value)} H${(index + 1) * 100}`,
    )
    .join(" ");
  const maxIndex = values.indexOf(maxValue);
  const showPace = !learning && pace !== null && pace !== undefined && pace > 0;
  return (
    <div className="required-chart" role="img" aria-label="日別必要ペース">
      <svg
        viewBox={`0 0 ${width} 84`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {values.map(
          (value, index) =>
            showPace &&
            value > pace && (
              <rect
                key={days[index]}
                className="overload-area"
                x={index * 100}
                y={y(value)}
                width="100"
                height={y(pace) - y(value)}
              />
            ),
        )}
        <path
          className="required-step"
          d={step}
          fill="none"
          vectorEffect="non-scaling-stroke"
        />
        {showPace && (
          <line
            className="pace-line"
            x1="0"
            x2={width}
            y1={y(pace)}
            y2={y(pace)}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
      {maxValue > 0 && (
        <span
          className="chart-max"
          style={{
            left: `${((maxIndex + 0.5) / days.length) * 100}%`,
            bottom: `${((84 - y(maxValue)) / 84) * 100}%`,
          }}
        >
          {maxValue.toFixed(1)}pt
        </span>
      )}
    </div>
  );
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
  requiredByDay,
  pace,
  learning,
  onAddProject,
}: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const columns: (string | null)[] = [null, ...days];
  return (
    <table
      className={`timeline timeline-${period}`}
      aria-label="期限タイムライン"
    >
      <colgroup>
        <col className="project-col" />
        <col className="overdue-col" />
        {days.map((day) => (
          <col key={day} />
        ))}
      </colgroup>
      <thead>
        <tr className="timeline-row timeline-heading">
          <th scope="col">
            <span className="section-heading">
              Project{" "}
              {onAddProject && (
                <InlineAdd
                  kind="project"
                  usedColors={projects.map((project) => project.color)}
                  onSubmit={({ name, color }) =>
                    onAddProject(name, color ?? "#4c8dff")
                  }
                />
              )}
            </span>
          </th>
          <th scope="col" className="overdue-heading">
            期限切れ
          </th>
          {days.map((day) => (
            <th
              scope="col"
              key={day}
              data-date={day}
              className={`${dayTone(day, today, settings)} ${!learning && pace !== null && pace !== undefined && (requiredByDay?.[day] ?? 0) > pace ? "overlap-day" : ""}`}
            >
              <time dateTime={day}>
                <span>{weekdays[new Date(`${day}T12:00:00`).getDay()]}</span>
                <strong>
                  {period === "month"
                    ? String(Number(day.slice(8)))
                    : day.slice(5).replace("-", "/")}
                </strong>
              </time>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {projects.map((project) => (
          <tr className="timeline-row" key={project.id}>
            <th scope="row" style={{ borderInlineStartColor: project.color }}>
              <span className="project-name">
                <i style={{ backgroundColor: project.color }} />
                {project.name}
              </span>
              <span className="project-actions">
                {onDelete && (
                  <DeleteControl
                    kind="project"
                    name={project.name}
                    iconOnly
                    counts={projectCounts(project)}
                    onConfirm={() =>
                      onDelete("project", project.id, projectCounts(project))
                    }
                  />
                )}
                {onOpenDetail && (
                  <DetailButton
                    name={project.name}
                    note={project.note}
                    onOpen={() => onOpenDetail("project", project.id)}
                  />
                )}
              </span>
            </th>
            {columns.map((day) => {
              const events = project.events.filter((event) =>
                day === null
                  ? event.due < today
                  : event.due === day && day >= today,
              );
              const key = `${project.id}:${day ?? "overdue"}`;
              const selected = events.find(
                (event) => event.id === selectedEventId,
              );
              const urgent = events.some((event) => {
                const flag = danger[event.id];
                return flag?.approaching || flag?.overdue || flag?.overflow;
              });
              const caution = events.some((event) => danger[event.id]?.caution);
              return (
                <td
                  key={day ?? "overdue"}
                  data-date={day ?? undefined}
                  className={
                    day === null
                      ? "overdue-cell"
                      : `${dayTone(day, today, settings)} ${!learning && pace !== null && pace !== undefined && (requiredByDay?.[day] ?? 0) > pace ? "overlap-day" : ""}`
                  }
                >
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
                        ◆{events.length > 1 && <sup>{events.length}</sup>}
                      </button>
                      {period === "month" ? (
                        selected && (
                          <span className="marker-label">{selected.name}</span>
                        )
                      ) : (
                        <span className="marker-label">
                          {events.map((event) => event.name).join("、")}
                        </span>
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
        <tr className="timeline-row pace-row">
          <th scope="row">
            <span>必要ペース</span>
            {!learning && <small>実績 ┄</small>}
          </th>
          <td className="overdue-cell" />
          <td colSpan={days.length}>
            <RequiredPace
              days={days}
              requiredByDay={requiredByDay}
              pace={pace}
              learning={learning}
            />
          </td>
        </tr>
      </tbody>
    </table>
  );
}
