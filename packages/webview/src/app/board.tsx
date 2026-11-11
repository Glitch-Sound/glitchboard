import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { calculateDanger } from "../../../shared/src/calculation/danger.js";
import { calculatePeriodLoad } from "../../../shared/src/calculation/load.js";
import { calculateActualPace } from "../../../shared/src/calculation/pace.js";
import { predictCompletionDates } from "../../../shared/src/calculation/prediction.js";
import { calculateRequiredPace } from "../../../shared/src/calculation/required.js";
import {
  type DescendantCounts,
  descendantCounts,
  type ItemKind,
} from "../../../shared/src/domain/deletion.js";
import type { Project } from "../../../shared/src/domain/index.js";
import { BoardSplit, displayDays, type Period } from "../pages/board/index.js";
import {
  DetailPanel,
  type DetailSelection,
} from "../widgets/detail-panel/index.js";
import { EventDetails } from "../widgets/event-details/index.js";
import { Timeline } from "../widgets/timeline/index.js";
import { WorkloadHeader } from "../widgets/workload/index.js";
import { localBridge } from "./bridge.js";
import { ManageSetup } from "./ManageSetup.js";
import {
  postTaskPoints,
  sendOperation,
  subscribeOperationResults,
} from "./operations.js";
import { type Snapshot, subscribeSnapshots } from "./snapshot.js";
import { useToday } from "./useToday.js";
import "./style.css";

const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

function displayToday(today: string): string {
  const weekday = weekdays[new Date(`${today}T00:00:00Z`).getUTCDay()];
  return `${today.replaceAll("-", "/")}(${weekday})`;
}

function detailFor(
  projects: readonly Project[],
  kind: ItemKind,
  id: string,
): DetailSelection | null {
  for (const project of projects) {
    if (kind === "project" && project.id === id)
      return { kind, item: project, hierarchy: [project.name] };
    for (const event of project.events) {
      if (kind === "event" && event.id === id)
        return { kind, item: event, hierarchy: [project.name, event.name] };
      for (const story of event.stories) {
        if (kind === "story" && story.id === id)
          return {
            kind,
            item: story,
            hierarchy: [project.name, event.name, story.name],
            parentDue: event.due,
          };
        if (kind === "task")
          for (const task of story.tasks)
            if (task.id === id)
              return {
                kind,
                item: task,
                hierarchy: [project.name, event.name, story.name, task.name],
                parentDue: event.due,
              };
      }
    }
  }
  return null;
}

/** REQ-012: エディタタブの入口。 */
export function BoardApp() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [unconfigured, setUnconfigured] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("week");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<{
    kind: ItemKind;
    id: string;
  } | null>(null);
  useEffect(
    () =>
      subscribeSnapshots((next) => {
        setSnapshot(next);
        setUnconfigured(false);
        if (!next.error && next.manageAvailability?.status !== "missing")
          setOperationError(null);
      }),
    [],
  );
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "unconfigured") {
        setUnconfigured(true);
        setSnapshot(null);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
  useEffect(() => subscribeOperationResults(setOperationError), []);

  const today = useToday();
  const days = displayDays(period, today);
  const projects = snapshot?.projects ?? [];
  const settings = snapshot?.settings ?? {
    workdays_off: ["sat", "sun"],
    public_holidays: true,
  };
  const actual = calculateActualPace(projects, today, settings);
  const required = calculateRequiredPace(
    projects,
    today,
    days.at(-1) ?? today,
    settings,
  );
  const load = calculatePeriodLoad(
    required,
    days[0] ?? today,
    days.at(-1) ?? today,
    settings,
    actual.pace,
  );
  const danger = calculateDanger(
    projects,
    today,
    days[0] ?? today,
    days.at(-1) ?? today,
    settings,
    actual.pace,
    actual.learning,
  );
  const completedByDay = Object.fromEntries(
    actual.daily.map((item) => [item.date, item.points]),
  );
  const selection = snapshot?.selectedEventId ?? selectedEventId;
  const selectedEvent = projects
    .flatMap((project) => project.events)
    .find((event) => event.id === selection);
  const predictions = predictCompletionDates(
    projects,
    today,
    settings,
    actual.pace,
  );
  const detailSelection = detailTarget
    ? detailFor(projects, detailTarget.kind, detailTarget.id)
    : null;
  const requestDelete = (
    kind: ItemKind,
    id: string,
    expected: DescendantCounts,
  ) =>
    localBridge()?.postMessage({
      type: "deleteItem",
      kind,
      id,
      expected,
      version: snapshot?.version ?? 0,
    });

  const missingPath =
    snapshot?.manageAvailability?.status === "missing"
      ? snapshot.manageAvailability.path
      : undefined;
  const setupOnly = unconfigured || (!!missingPath && projects.length === 0);
  return (
    <main className="board-page">
      {(operationError ?? snapshot?.error) && (
        <p role="alert">{operationError ?? snapshot?.error}</p>
      )}
      {!setupOnly && missingPath && <ManageSetup missingPath={missingPath} />}
      {setupOnly ? (
        <>
          <h1>GlitchBoard</h1>
          <ManageSetup missingPath={missingPath} />
        </>
      ) : (
        <>
          <header className="board-header">
            <div className="board-title">
              <h1>GlitchBoard</h1>
              <time dateTime={today}>{displayToday(today)}</time>
            </div>
            <nav aria-label="表示期間" className="period-switch">
              {(
                [
                  ["three-days", "3日"],
                  ["week", "1週間"],
                  ["month", "月"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={period === value}
                  onClick={() => setPeriod(value)}
                >
                  {label}
                </button>
              ))}
            </nav>
            <WorkloadHeader
              completedByDay={completedByDay}
              pace={actual.pace}
              learning={actual.learning}
              periodLoad={load}
              dangerCount={danger.count}
            />
          </header>
          <BoardSplit>
            <div className="timeline-panel">
              <Timeline
                projects={projects}
                days={days}
                today={today}
                period={period}
                selectedEventId={selection ?? null}
                onSelect={(eventId) => {
                  setSelectedEventId(eventId);
                  localBridge()?.postMessage({ type: "selectEvent", eventId });
                }}
                settings={settings}
                danger={danger.events}
                onOpenDetail={(kind, id) => setDetailTarget({ kind, id })}
                requiredByDay={required}
                pace={actual.pace}
                learning={actual.learning}
                onAddProject={(name, color) =>
                  sendOperation(localBridge(), {
                    type: "createProject",
                    name,
                    color,
                  })
                }
                onMoveProject={(projectId, targetProjectId, placement) =>
                  sendOperation(localBridge(), {
                    type: "moveProject",
                    projectId,
                    targetProjectId,
                    placement,
                  })
                }
              />
            </div>
            <div className="board-details-panel">
              {selectedEvent && (
                <EventDetails
                  key={selectedEvent.id}
                  event={selectedEvent}
                  today={today}
                  prediction={predictions[selectedEvent.id] ?? null}
                  danger={danger.events[selectedEvent.id]}
                  projectName={
                    projects.find((project) =>
                      project.events.some(
                        (event) => event.id === selectedEvent.id,
                      ),
                    )?.name
                  }
                  projectColor={
                    projects.find((project) =>
                      project.events.some(
                        (event) => event.id === selectedEvent.id,
                      ),
                    )?.color
                  }
                  onPointsChange={(taskId, points) => {
                    const bridge = localBridge();
                    if (bridge) postTaskPoints(bridge, taskId, points);
                  }}
                  onDoneChange={(taskId, done) =>
                    localBridge()?.postMessage({
                      type: "setTaskDone",
                      taskId,
                      done,
                    })
                  }
                  onAddStory={(eventId, name) =>
                    sendOperation(localBridge(), {
                      type: "addStory",
                      eventId,
                      name,
                    })
                  }
                  onAddTask={(storyId, name) =>
                    sendOperation(localBridge(), {
                      type: "addTask",
                      storyId,
                      name,
                    })
                  }
                  onDelete={requestDelete}
                  onOpenDetail={(kind, id) => setDetailTarget({ kind, id })}
                />
              )}
            </div>
          </BoardSplit>
          {detailSelection && (
            <DetailPanel
              key={detailSelection.item.id}
              selection={detailSelection}
              onClose={() => setDetailTarget(null)}
              onSave={(kind, id, patch) =>
                localBridge()?.postMessage({
                  type: "editItem",
                  kind,
                  id,
                  patch,
                })
              }
              deleteCounts={
                descendantCounts(
                  projects,
                  detailSelection.kind,
                  detailSelection.item.id,
                ) ?? undefined
              }
              onDelete={() => {
                const counts = descendantCounts(
                  projects,
                  detailSelection.kind,
                  detailSelection.item.id,
                );
                if (counts)
                  requestDelete(
                    detailSelection.kind,
                    detailSelection.item.id,
                    counts,
                  );
              }}
            />
          )}
        </>
      )}
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<BoardApp />);
