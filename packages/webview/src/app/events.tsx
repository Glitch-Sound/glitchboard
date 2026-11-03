import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { calculateDanger } from "../../../shared/src/calculation/danger.js";
import { calculateActualPace } from "../../../shared/src/calculation/pace.js";
import { InlineAdd } from "../features/inline-add/index.js";
import {
  EventFilters,
  EventList,
  type TargetFilter,
} from "../pages/event-list/index.js";
import { localBridge } from "./bridge.js";
import { ManageSetup } from "./ManageSetup.js";
import { sendOperation, subscribeOperationResults } from "./operations.js";
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
  useEffect(() => subscribeSnapshots(setSnapshot), []);
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "unconfigured") {
        setUnconfigured(true);
        setSnapshot(null);
      }
      if (event.data?.type === "snapshot") setUnconfigured(false);
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);
  useEffect(() => subscribeOperationResults(setOperationError), []);
  const projects = snapshot?.projects ?? [];
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
  return (
    <main className="events-page">
      {(operationError ?? snapshot?.error) && (
        <p role="alert">{operationError ?? snapshot?.error}</p>
      )}
      {unconfigured ? (
        <ManageSetup />
      ) : snapshot ? (
        <>
          <div className="event-list-toolbar">
            <h2>EVENT</h2>
            {projects.length > 0 && (
              <InlineAdd
                kind="event"
                projects={projects.map((project) => ({
                  id: project.id,
                  name: project.name,
                }))}
                projectId={projects[0]?.id}
                onSubmit={({ name, due, projectId }) =>
                  sendOperation(localBridge(), {
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
              projects={snapshot.projects}
              projectEntries={snapshot.projectEntries}
              today={today}
              onTargetChange={setTarget}
              onProjectChange={(file, load) =>
                localBridge()?.postMessage({
                  type: "setProjectLoaded",
                  file,
                  load,
                })
              }
            />
          </div>
          <EventList
            projects={snapshot.projects}
            today={today}
            danger={danger.events}
            target={target}
            onSelect={(eventId) =>
              localBridge()?.postMessage({ type: "selectEvent", eventId })
            }
          />
        </>
      ) : (
        "読み込み中"
      )}
    </main>
  );
}

const root = document.getElementById("root");
if (root) createRoot(root).render(<EventsApp />);
