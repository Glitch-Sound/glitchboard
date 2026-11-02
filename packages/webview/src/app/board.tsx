import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { calculateDanger } from "../../../shared/src/calculation/danger.js";
import { todayInTokyo } from "../../../shared/src/calculation/dates.js";
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
import { InlineAdd } from "../features/inline-add/index.js";
import { displayDays, type Period } from "../pages/board/index.js";
import {
  DetailPanel,
  type DetailSelection,
} from "../widgets/detail-panel/index.js";
import { EventDetails } from "../widgets/event-details/index.js";
import { Timeline } from "../widgets/timeline/index.js";
import { WorkloadHeader } from "../widgets/workload/index.js";
import { localBridge } from "./bridge.js";
import { postTaskPoints } from "./operations.js";
import { type Snapshot, subscribeSnapshots } from "./snapshot.js";
import "./style.css";

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
function BoardApp() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [period, setPeriod] = useState<Period>("week");
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [detailTarget, setDetailTarget] = useState<{
    kind: ItemKind;
    id: string;
  } | null>(null);
  useEffect(() => subscribeSnapshots(setSnapshot), []);

  const today = todayInTokyo();
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
  const selectedProjectId =
    projects.find((project) =>
      project.events.some((event) => event.id === selection),
    )?.id ?? projects[0]?.id;
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

  return (
    <main>
      <h1>
        GlitchBoard{" "}
        <InlineAdd
          kind="project"
          onSubmit={({ name, color }) =>
            localBridge()?.postMessage({ type: "createProject", name, color })
          }
        />
      </h1>
      <WorkloadHeader
        days={days}
        requiredByDay={required}
        completedByDay={completedByDay}
        pace={actual.pace}
        learning={actual.learning}
        periodLoad={load}
        dangerCount={danger.count}
      />
      <nav aria-label="表示期間">
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
      {snapshot?.error && <p role="alert">{snapshot.error}</p>}
      <h2>
        Event{" "}
        <InlineAdd
          key={selectedProjectId}
          kind="event"
          projectId={selectedProjectId}
          projects={projects.map((project) => ({
            id: project.id,
            name: project.name,
          }))}
          onSubmit={({ name, due, projectId }) =>
            localBridge()?.postMessage({
              type: "addEvent",
              name,
              due,
              projectId,
            })
          }
        />
      </h2>
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
        onDelete={requestDelete}
        onOpenDetail={(kind, id) => setDetailTarget({ kind, id })}
      />
      {selectedEvent && (
        <EventDetails
          key={selectedEvent.id}
          event={selectedEvent}
          today={today}
          prediction={predictions[selectedEvent.id] ?? null}
          onPointsChange={(taskId, points) => {
            const bridge = localBridge();
            if (bridge) postTaskPoints(bridge, taskId, points);
          }}
          onDoneChange={(taskId, done) =>
            localBridge()?.postMessage({ type: "setTaskDone", taskId, done })
          }
          onAddStory={(eventId, name) =>
            localBridge()?.postMessage({ type: "addStory", eventId, name })
          }
          onAddTask={(storyId, name) =>
            localBridge()?.postMessage({ type: "addTask", storyId, name })
          }
          onDelete={requestDelete}
          onOpenDetail={(kind, id) => setDetailTarget({ kind, id })}
        />
      )}
      {detailSelection && (
        <DetailPanel
          key={detailSelection.item.id}
          selection={detailSelection}
          onClose={() => setDetailTarget(null)}
          onSave={(kind, id, patch) =>
            localBridge()?.postMessage({ type: "editItem", kind, id, patch })
          }
          onOpenLink={(target) =>
            localBridge()?.postMessage({ type: "openLink", target })
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
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<BoardApp />);
