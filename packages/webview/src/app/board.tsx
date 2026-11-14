import { useEffect, useRef, useState } from "react";
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
import {
  scopedEventSelection,
  scopedId,
  scopeProjects,
} from "../../../shared/src/domain/identity.js";
import type { Project } from "../../../shared/src/domain/index.js";
import {
  connectionChangeRequestSchema,
  connectionChangeSettledSchema,
  navigationMessageSchema,
} from "../../../shared/src/domain/messages.js";
import { BoardSplit, displayDays, type Period } from "../pages/board/index.js";
import { EmptyState } from "../shared/ui/empty-state/index.js";
import { OperationError } from "../shared/ui/operation-error/index.js";
import {
  DetailPanel,
  type DetailPanelHandle,
  type DetailSelection,
} from "../widgets/detail-panel/index.js";
import {
  EventDetails,
  type EventDetailsHandle,
} from "../widgets/event-details/index.js";
import { Timeline, type TimelineHandle } from "../widgets/timeline/index.js";
import { WorkloadHeader } from "../widgets/workload/index.js";
import { localBridge } from "./bridge.js";
import {
  connectionBridge,
  postOperation,
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
      return {
        kind,
        item: project,
        projectColor: project.color,
        hierarchy: [project.name],
      };
    for (const event of project.events) {
      if (kind === "event" && event.id === id)
        return {
          kind,
          item: event,
          projectColor: project.color,
          hierarchy: [project.name, event.name],
        };
      if (kind === "task") {
        const task = event.tasks?.find((task) => task.id === id);
        if (task)
          return {
            kind,
            item: task,
            projectColor: project.color,
            hierarchy: [project.name, event.name, task.name],
            parentDue: event.due,
          };
      }
      for (const story of event.stories) {
        if (kind === "story" && story.id === id)
          return {
            kind,
            item: story,
            projectColor: project.color,
            hierarchy: [project.name, event.name, story.name],
            parentDue: event.due,
          };
        if (kind === "task")
          for (const task of story.tasks)
            if (task.id === id)
              return {
                kind,
                item: task,
                projectColor: project.color,
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
  const [staleDisplay, setStaleDisplay] = useState(false);
  const [connectionPending, setConnectionPending] = useState(false);
  const connectionPendingId = useRef<number | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("week");
  const [selectedEventId, setSelectedEventId] = useState<
    string | null | undefined
  >(undefined);
  const [detailTarget, setDetailTarget] = useState<{
    kind: ItemKind;
    id: string;
  } | null>(null);
  const detailPanel = useRef<DetailPanelHandle>(null);
  const eventDetails = useRef<EventDetailsHandle>(null);
  const timeline = useRef<TimelineHandle>(null);
  const snapshotSelection = useRef<string | null>(null);
  const visibleSnapshot = useRef<Snapshot | null>(null);
  const [record, setRecord] = useState<{
    kind: ItemKind;
    id: string;
    groupId?: null;
  } | null>(null);
  useEffect(
    () =>
      subscribeSnapshots((incoming) => {
        const previous = visibleSnapshot.current;
        if (incoming.version === 0 && previous) {
          if (
            incoming.connectionId &&
            previous.connectionId &&
            incoming.connectionId !== previous.connectionId
          )
            setStaleDisplay(true);
          return;
        }
        setStaleDisplay(
          Boolean(
            incoming.manageAvailability?.status === "missing" &&
              previous &&
              incoming.connectionId &&
              previous.connectionId &&
              incoming.connectionId !== previous.connectionId,
          ),
        );
        const next =
          incoming.manageAvailability?.status === "missing" && previous
            ? {
                ...previous,
                version: incoming.version,
                error: incoming.error,
                manageAvailability: incoming.manageAvailability,
              }
            : incoming;
        if (next.connectionId !== previous?.connectionId) {
          setRecord(null);
          setSelectedEventId(undefined);
          setDetailTarget(null);
          lastDetail.current = null;
        }
        visibleSnapshot.current = next;
        setSnapshot(next);
        const nextSelection = scopedEventSelection(
          next.projects,
          next.selectedEventId,
          next.selectedProjectFile,
        );
        if (nextSelection !== snapshotSelection.current) {
          snapshotSelection.current = nextSelection;
          setSelectedEventId(undefined);
          setRecord(null);
        }
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
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
  useEffect(() => subscribeOperationResults(setOperationError), []);

  const today = useToday();
  const days = displayDays(period, today);
  const operationsBridge = connectionBridge(
    localBridge(),
    snapshot?.connectionId,
  );
  const projects = scopeProjects(snapshot?.projects ?? []);
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
  const selection =
    selectedEventId !== undefined
      ? selectedEventId
      : scopedEventSelection(
          snapshot?.projects ?? [],
          snapshot?.selectedEventId,
          snapshot?.selectedProjectFile,
        );
  const selectedEvent = projects
    .flatMap((project) => project.events)
    .find((event) => event.id === selection);
  const predictions = predictCompletionDates(
    projects,
    today,
    settings,
    actual.pace,
  );
  const lastDetail = useRef<DetailSelection | null>(null);
  const resolvedDetail = detailTarget
    ? detailFor(projects, detailTarget.kind, detailTarget.id)
    : null;
  if (resolvedDetail) lastDetail.current = resolvedDetail;
  const detailSelection =
    resolvedDetail ??
    (detailTarget?.id === lastDetail.current?.item.id
      ? lastDetail.current
      : null);
  const chooseRecord = (
    kind: ItemKind,
    id: string,
    openDetail = false,
    groupId?: null,
  ) => {
    const target = detailFor(projects, kind, id);
    if (!target) return;
    const project = projects.find(
      (p) =>
        p.id === id ||
        p.events.some(
          (e) =>
            e.id === id ||
            e.tasks?.some((t) => t.id === id) ||
            e.stories.some(
              (st) => st.id === id || st.tasks.some((t) => t.id === id),
            ),
        ),
    );
    const event =
      kind === "project"
        ? project?.events[0]
        : project?.events.find(
            (e) =>
              e.id === id ||
              e.tasks?.some((t) => t.id === id) ||
              e.stories.some(
                (st) => st.id === id || st.tasks.some((t) => t.id === id),
              ),
          );
    const commit = () => {
      setRecord({ kind, id, groupId });
      setSelectedEventId(event?.id ?? null);
      // REQ-035-S05: 自分の選択確定の応答で空Projectの選択を消さない。
      snapshotSelection.current = event?.id ?? null;
      postOperation(operationsBridge, {
        type: "selectEvent",
        eventId: event?.id ?? null,
      });
      if (openDetail || detailTarget) setDetailTarget({ kind, id });
    };
    const destinationStory =
      groupId === null
        ? null
        : kind === "story"
          ? id
          : kind === "task"
            ? (event?.stories.find((story) =>
                story.tasks.some((task) => task.id === id),
              )?.id ?? null)
            : undefined;
    const leaveInline = () => {
      if (eventDetails.current)
        eventDetails.current.requestLeave(commit, {
          eventId: event?.id ?? null,
          storyId: destinationStory,
        });
      else commit();
    };
    if (
      detailTarget &&
      (detailTarget.kind !== kind || detailTarget.id !== id) &&
      detailPanel.current
    )
      detailPanel.current.requestLeave(leaveInline);
    else leaveInline();
  };
  const navigate = useRef(chooseRecord);
  navigate.current = chooseRecord;
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = navigationMessageSchema.safeParse(event.data);
      if (message.success) {
        const { kind, id, projectFile, openDetail, connectionId } =
          message.data.payload;
        if (
          connectionId &&
          connectionId !== visibleSnapshot.current?.connectionId
        )
          return;
        navigate.current(kind, scopedId(projectFile, id), openDetail);
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const settled = connectionChangeSettledSchema.safeParse(event.data);
      if (settled.success) {
        if (connectionPendingId.current === settled.data.requestId) {
          connectionPendingId.current = null;
          setConnectionPending(false);
        }
        return;
      }
      const request = connectionChangeRequestSchema.safeParse(event.data);
      if (!request.success) return;
      const respond = (ok: boolean) => {
        if (ok) {
          connectionPendingId.current = request.data.requestId;
          setConnectionPending(true);
        }
        localBridge()?.postMessage({
          type: "connectionChangeResult",
          requestId: request.data.requestId,
          ok,
        });
      };
      const cancel = () => respond(false);
      const leaveProject = () => {
        if (timeline.current)
          timeline.current.requestLeave(() => respond(true), cancel);
        else respond(true);
      };
      const leaveInline = () => {
        if (eventDetails.current)
          eventDetails.current.requestLeave(
            leaveProject,
            { eventId: null },
            cancel,
          );
        else leaveProject();
      };
      if (detailPanel.current)
        detailPanel.current.requestLeave(leaveInline, cancel);
      else leaveInline();
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
  const selectedStoryId =
    record?.groupId === null
      ? null
      : record?.kind === "story" &&
          selectedEvent?.stories.some((story) => story.id === record.id)
        ? record.id
        : record?.kind === "task"
          ? (selectedEvent?.stories.find((story) =>
              story.tasks.some((task) => task.id === record.id),
            )?.id ?? null)
          : undefined;
  const requestDelete = (
    kind: ItemKind,
    id: string,
    expected: DescendantCounts,
  ) =>
    postOperation(operationsBridge, {
      type: "deleteItem",
      kind,
      id,
      expected,
      version: snapshot?.version ?? 0,
    });

  const missingPath =
    !unconfigured && snapshot?.manageAvailability?.status === "missing"
      ? snapshot.manageAvailability.path
      : undefined;
  const unavailable = unconfigured || Boolean(missingPath);
  const setupOnly = unavailable && projects.length === 0;
  return (
    <main className="board-page">
      {(operationError ?? (!unconfigured && snapshot?.error)) && (
        <OperationError message={operationError ?? snapshot?.error ?? ""} />
      )}
      {unavailable && (
        <p
          role="status"
          aria-label="管理ファイルの接続状態"
          className="manage-connection-state"
        >
          管理ファイルは左の EVENT 一覧で設定できます。
          {missingPath && <span>{missingPath}</span>}
          {staleDisplay && <span>前の接続の表示は読み取り専用です。</span>}
        </p>
      )}
      {setupOnly ? (
        <h1>GlitchBoard</h1>
      ) : (
        <div
          className="board-interaction"
          inert={connectionPending || staleDisplay}
        >
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
                key={snapshot?.connectionId ?? "initial"}
                ref={timeline}
                projects={projects}
                initialLayout={localBridge()?.getState?.()?.timelineLayout}
                onLayoutChange={(timelineLayout) => {
                  const bridge = localBridge();
                  bridge?.setState?.({
                    ...bridge.getState?.(),
                    timelineLayout,
                  });
                }}
                days={days}
                today={today}
                period={period}
                selectedEventId={selection ?? null}
                onSelect={(eventId) => chooseRecord("event", eventId)}
                onSelectProject={(id) => chooseRecord("project", id)}
                selectedProjectId={
                  record?.kind === "project" ? record.id : undefined
                }
                settings={settings}
                danger={danger.events}
                onOpenDetail={(kind, id) => chooseRecord(kind, id, true)}
                requiredByDay={required}
                pace={actual.pace}
                learning={actual.learning}
                onAddProject={(name, color) =>
                  sendOperation(operationsBridge, {
                    type: "createProject",
                    name,
                    color,
                  })
                }
                onMoveProject={(projectId, targetProjectId, placement) =>
                  sendOperation(operationsBridge, {
                    type: "moveProject",
                    projectId,
                    targetProjectId,
                    placement,
                  })
                }
              />
            </div>
            <div className="board-details-panel">
              {selectedEvent ? (
                <EventDetails
                  key={`${snapshot?.connectionId ?? ""}:${selectedEvent.id}`}
                  ref={eventDetails}
                  event={selectedEvent}
                  selectedStoryId={selectedStoryId}
                  selectedTaskId={
                    record?.kind === "task" ? record.id : undefined
                  }
                  onSelectRecord={(kind, id, groupId) =>
                    chooseRecord(kind, id, false, groupId)
                  }
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
                    if (operationsBridge)
                      postTaskPoints(operationsBridge, taskId, points);
                  }}
                  onDoneChange={(taskId, done) =>
                    postOperation(operationsBridge, {
                      type: "setTaskDone",
                      taskId,
                      done,
                    })
                  }
                  onAddStory={(eventId, name) =>
                    sendOperation(operationsBridge, {
                      type: "addStory",
                      eventId,
                      name,
                    })
                  }
                  onAddTask={(storyId, name) =>
                    sendOperation(operationsBridge, {
                      type: "addTask",
                      storyId,
                      name,
                    })
                  }
                  onAddEventTask={(eventId, name) =>
                    sendOperation(operationsBridge, {
                      type: "addEventTask",
                      eventId,
                      name,
                    })
                  }
                  onDelete={requestDelete}
                  onOpenDetail={(kind, id) => chooseRecord(kind, id, true)}
                />
              ) : (
                <EmptyState
                  kind={
                    projects.length
                      ? "event"
                      : snapshot?.projectEntries.length
                        ? "load"
                        : "project"
                  }
                />
              )}
            </div>
          </BoardSplit>
          {detailSelection && (
            <DetailPanel
              key={`${snapshot?.connectionId ?? ""}:${detailSelection.item.id}`}
              ref={detailPanel}
              selection={detailSelection}
              onClose={() => setDetailTarget(null)}
              onSave={(kind, id, patch) =>
                sendOperation(operationsBridge, {
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
        </div>
      )}
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<BoardApp />);
