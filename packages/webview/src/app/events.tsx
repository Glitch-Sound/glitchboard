import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { calculateDanger } from "../../../shared/src/calculation/danger.js";
import { calculateActualPace } from "../../../shared/src/calculation/pace.js";
import {
  scopedEventSelection,
  scopeProjects,
} from "../../../shared/src/domain/identity.js";
import { InlineAdd } from "../features/inline-add/index.js";
import {
  EventFilters,
  EventList,
  type TargetFilter,
} from "../pages/event-list/index.js";
import { EmptyState } from "../shared/ui/empty-state/index.js";
import { OperationError } from "../shared/ui/operation-error/index.js";
import { localBridge } from "./bridge.js";
import { ManageSetup } from "./ManageSetup.js";
import {
  connectionBridge,
  postOperation,
  sendOperation,
  subscribeOperationResults,
} from "./operations.js";
import { type Snapshot, subscribeSnapshots } from "./snapshot.js";
import { useToday } from "./useToday.js";
import "./style.css";

/** REQ-012: EVENT一覧の入口。 */
export function EventsApp() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [unconfigured, setUnconfigured] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [target, setTarget] = useState<TargetFilter>("pending");
  const today = useToday();
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
  const operationsBridge = connectionBridge(
    localBridge(),
    snapshot?.connectionId,
  );
  const projects = scopeProjects(snapshot?.projects ?? []);
  const selection = scopedEventSelection(
    snapshot?.projects ?? [],
    snapshot?.selectedEventId,
    snapshot?.selectedProjectFile,
  );
  const settings = snapshot?.settings ?? {
    workdays_off: ["sat", "sun"],
    public_holidays: true,
  };
  const actual = calculateActualPace(projects, today, settings);
  const danger = calculateDanger(
    projects,
    today,
    today,
    today,
    settings,
    actual.pace,
    actual.learning,
  );
  const missingPath =
    snapshot?.manageAvailability?.status === "missing"
      ? snapshot.manageAvailability.path
      : undefined;
  const setupOnly = unconfigured || (!!missingPath && projects.length === 0);
  return (
    <main className="events-page">
      {(operationError ?? snapshot?.error) && (
        <OperationError message={operationError ?? snapshot?.error ?? ""} />
      )}
      {!setupOnly && missingPath && <ManageSetup missingPath={missingPath} />}
      {setupOnly ? (
        <ManageSetup missingPath={missingPath} />
      ) : snapshot ? (
        <>
          <div className="event-list-toolbar">
            <h2>EVENT</h2>
            {projects.length > 0 && (
              <InlineAdd
                kind="event"
                layout="embedded"
                projects={projects.map((project) => ({
                  id: project.id,
                  name: project.name,
                  color: project.color,
                }))}
                projectId={
                  projects.find((project) =>
                    project.events.some((event) => event.id === selection),
                  )?.id ?? projects[0]?.id
                }
                onSubmit={({ name, due, projectId }) =>
                  sendOperation(operationsBridge, {
                    type: "addEvent",
                    name,
                    due,
                    projectId,
                  })
                }
              />
            )}
            <EventFilters
              target={target}
              projects={projects}
              projectEntries={snapshot.projectEntries}
              today={today}
              onTargetChange={setTarget}
              onProjectChange={(file, load) =>
                postOperation(operationsBridge, {
                  type: "setProjectLoaded",
                  file,
                  load,
                })
              }
            />
          </div>
          {projects.length === 0 ? (
            <EmptyState
              kind={snapshot.projectEntries.length ? "load" : "project"}
            />
          ) : (
            <EventList
              projects={projects}
              today={today}
              danger={danger.events}
              target={target}
              onOpenDetail={(eventId) =>
                postOperation(operationsBridge, {
                  type: "selectEvent",
                  eventId,
                  openDetail: true,
                })
              }
              onSelect={(eventId) =>
                postOperation(operationsBridge, {
                  type: "selectEvent",
                  eventId,
                })
              }
            />
          )}
        </>
      ) : (
        "読み込み中"
      )}
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<EventsApp />);
