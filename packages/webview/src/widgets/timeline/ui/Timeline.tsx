import { type DragEvent, useEffect, useRef, useState } from "react";
import type { EventDanger } from "../../../../../shared/src/calculation/danger.js";
import {
  isWorkday,
  type WorkdaySettings,
} from "../../../../../shared/src/calculation/dates.js";
import type { Project } from "../../../../../shared/src/domain/index.js";
import { DetailButton } from "../../../features/detail-button/index.js";
import { nextProjectColor } from "../../../features/inline-add/index.js";

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
  onOpenDetail?: (kind: "project", id: string) => void;
  requiredByDay?: Readonly<Record<string, number>>;
  pace?: number | null;
  learning?: boolean;
  onAddProject?: (name: string, color: string) => boolean | Promise<boolean>;
  onMoveProject?: (
    projectId: string,
    targetProjectId: string,
    placement: "before" | "after",
  ) => boolean | Promise<boolean>;
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
  const y = (value: number) => 52 - (value / scale) * 34;
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
        viewBox={`0 0 ${width} 58`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {values.map((value, index) => {
          const top = showPace ? Math.max(y(value), y(pace)) : y(value);
          return (
            <rect
              key={days[index]}
              className="required-area"
              x={index * 100}
              y={top}
              width="100"
              height={y(0) - top}
            />
          );
        })}
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
        {values.map(
          (value, index) =>
            showPace &&
            value > pace && (
              <line
                key={days[index]}
                className="overload-step"
                x1={index * 100}
                x2={(index + 1) * 100}
                y1={y(value)}
                y2={y(value)}
                vectorEffect="non-scaling-stroke"
              />
            ),
        )}
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
          className={`chart-max ${showPace && maxValue > pace ? "chart-max-overload" : ""}`}
          style={{
            left: `${((maxIndex + 0.5) / days.length) * 100}%`,
            bottom: `${((58 - y(maxValue)) / 58) * 100}%`,
          }}
        >
          {maxValue.toFixed(1)}pt
        </span>
      )}
    </div>
  );
}

/** REQ-016/REQ-032: 期限表示と、保存結果に従うProjectの並べ替えを扱う。 */
export function Timeline({
  projects,
  days,
  today,
  period,
  selectedEventId,
  onSelect,
  settings = defaultSettings,
  danger = {},
  onOpenDetail,
  requiredByDay,
  pace,
  learning,
  onAddProject,
  onMoveProject,
}: Props) {
  const [open, setOpen] = useState<string | null>(null);
  const [addingProject, setAddingProject] = useState(false);
  const [projectName, setProjectName] = useState("");
  const [projectColor, setProjectColor] = useState(() =>
    nextProjectColor(projects.map((project) => project.color)),
  );
  const [savingProject, setSavingProject] = useState(false);
  const projectNameInput = useRef<HTMLInputElement>(null);
  const draggedProject = useRef<string | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    placement: "before" | "after";
  } | null>(null);
  const [moving, setMoving] = useState(false);
  const clearDrag = () => {
    draggedProject.current = null;
    setDragging(null);
    setDropTarget(null);
  };
  const moveProject = async (
    id: string,
    targetId: string,
    placement: "before" | "after",
  ) => {
    if (!onMoveProject || moving || id === targetId) return;
    setMoving(true);
    try {
      await onMoveProject(id, targetId, placement);
    } finally {
      setMoving(false);
    }
  };
  const dropPlacement = (event: DragEvent<HTMLTableRowElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientY < rect.top + rect.height / 2 ? "before" : "after";
  };
  useEffect(() => {
    if (addingProject) projectNameInput.current?.focus();
  }, [addingProject]);
  const cancelProject = () => {
    setAddingProject(false);
    setProjectName("");
  };
  const hasOverdue = projects.some((project) =>
    project.events.some((event) => event.due < today),
  );
  const columns: (string | null)[] = hasOverdue ? [null, ...days] : [...days];
  return (
    <table
      className={`timeline timeline-${period}`}
      aria-label="期限タイムライン"
      aria-busy={moving}
    >
      <colgroup>
        <col className="project-col" />
        {hasOverdue && <col className="overdue-col" />}
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
                <button
                  className="inline-add-trigger"
                  type="button"
                  aria-label="Projectを追加"
                  aria-expanded={addingProject}
                  onClick={() => {
                    if (addingProject) {
                      cancelProject();
                      return;
                    }
                    setProjectColor(
                      nextProjectColor(
                        projects.map((project) => project.color),
                      ),
                    );
                    setAddingProject(true);
                  }}
                >
                  <span className="inline-add-plus" aria-hidden="true">
                    +
                  </span>
                </button>
              )}
            </span>
          </th>
          {hasOverdue && (
            <th scope="col" className="overdue-heading">
              期限切れ
            </th>
          )}
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
        {projects.map((project, index) => (
          <tr
            className="timeline-row project-row"
            key={project.id}
            data-project-id={project.id}
            data-dragging={dragging === project.id || undefined}
            data-drop={
              dropTarget?.id === project.id ? dropTarget.placement : undefined
            }
            onDragOver={(event) => {
              if (
                !draggedProject.current ||
                draggedProject.current === project.id ||
                moving
              )
                return;
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              setDropTarget({
                id: project.id,
                placement: dropPlacement(event),
              });
            }}
            onDragLeave={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node | null,
                )
              )
                setDropTarget(null);
            }}
            onDrop={(event) => {
              const id = draggedProject.current;
              if (!id) return;
              event.preventDefault();
              const placement = dropPlacement(event);
              clearDrag();
              void moveProject(id, project.id, placement);
            }}
          >
            <th
              scope="row"
              style={{
                borderInlineStartColor: project.events.some(
                  (event) => event.id === selectedEventId,
                )
                  ? project.color
                  : "transparent",
              }}
            >
              {onMoveProject && (
                <button
                  type="button"
                  className="project-drag-handle"
                  draggable={!moving}
                  disabled={moving}
                  aria-label={`${project.name}を並べ替え`}
                  title="ドラッグで並べ替え（上下キーでも移動）"
                  onDragStart={(event) => {
                    draggedProject.current = project.id;
                    setDragging(project.id);
                    event.dataTransfer.effectAllowed = "move";
                    event.dataTransfer.setData("text/plain", project.id);
                    const row = event.currentTarget.closest("tr");
                    if (row)
                      event.dataTransfer.setDragImage(
                        row,
                        20,
                        row.clientHeight / 2,
                      );
                  }}
                  onDragEnd={clearDrag}
                  onKeyDown={(event) => {
                    const targetIndex =
                      event.key === "ArrowUp"
                        ? index - 1
                        : event.key === "ArrowDown"
                          ? index + 1
                          : -1;
                    if (event.key !== "ArrowUp" && event.key !== "ArrowDown")
                      return;
                    event.preventDefault();
                    const target = projects[targetIndex];
                    if (target)
                      void moveProject(
                        project.id,
                        target.id,
                        event.key === "ArrowUp" ? "before" : "after",
                      );
                  }}
                >
                  <span aria-hidden="true">⠿</span>
                </button>
              )}
              <span className="project-name">
                <i style={{ backgroundColor: project.color }} />
                {project.name}
              </span>
              <span className="project-actions">
                {onOpenDetail && (
                  <DetailButton
                    name={project.name}
                    note={project.note}
                    icon="document"
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
        {addingProject && onAddProject && (
          <tr className="timeline-row timeline-project-add-row">
            <td>
              <form
                className="timeline-project-add-form"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    event.preventDefault();
                    cancelProject();
                  }
                }}
                onSubmit={async (event) => {
                  event.preventDefault();
                  if (savingProject || !projectName.trim()) return;
                  setSavingProject(true);
                  try {
                    const saved = await onAddProject(
                      projectName.trim(),
                      projectColor,
                    );
                    if (saved) cancelProject();
                  } finally {
                    setSavingProject(false);
                  }
                }}
              >
                <label className="timeline-project-color">
                  <span
                    className="timeline-project-color-dot"
                    style={{ backgroundColor: projectColor }}
                    aria-hidden="true"
                  />
                  <input
                    type="color"
                    aria-label="色"
                    value={projectColor}
                    onChange={(event) => setProjectColor(event.target.value)}
                  />
                </label>
                <input
                  ref={projectNameInput}
                  type="text"
                  aria-label="名前"
                  placeholder="プロジェクト名 — Enterで追加"
                  value={projectName}
                  onChange={(event) => setProjectName(event.target.value)}
                />
                {projectName.trim() && (
                  <button type="submit" disabled={savingProject}>
                    追加
                  </button>
                )}
              </form>
            </td>
            {hasOverdue && <td className="overdue-cell" />}
            {days.map((day) => (
              <td key={day} className={dayTone(day, today, settings)} />
            ))}
          </tr>
        )}
        <tr className="timeline-row timeline-spacer">
          <th />
          {hasOverdue && <td className="overdue-cell" />}
          {days.map((day) => (
            <td key={day} className={dayTone(day, today, settings)} />
          ))}
        </tr>
        <tr className="timeline-row pace-row">
          <th scope="row">
            <span>必要ペース</span>
            {!learning && <small>実績 ┄</small>}
          </th>
          {hasOverdue && <td className="overdue-cell" />}
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
