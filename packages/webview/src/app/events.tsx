import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { todayInTokyo } from "../../../shared/src/calculation/dates.js";
import {
  EventFilters,
  EventList,
  type TargetFilter,
} from "../pages/event-list/index.js";
import { localBridge } from "./bridge.js";
import { type Snapshot, subscribeSnapshots } from "./snapshot.js";
import "./style.css";

/** REQ-012: EVENT一覧の入口。 */
function EventsApp() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [target, setTarget] = useState<TargetFilter>("pending");
  useEffect(() => subscribeSnapshots(setSnapshot), []);
  return (
    <main>
      <h1>EVENT一覧</h1>
      {snapshot?.error && <p role="alert">{snapshot.error}</p>}
      {snapshot ? (
        <>
          <EventFilters
            target={target}
            projects={snapshot.projects}
            projectEntries={snapshot.projectEntries}
            today={todayInTokyo()}
            onTargetChange={setTarget}
            onProjectChange={(file, load) =>
              localBridge()?.postMessage({
                type: "setProjectLoaded",
                file,
                load,
              })
            }
          />
          <EventList
            projects={snapshot.projects}
            today={todayInTokyo()}
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
