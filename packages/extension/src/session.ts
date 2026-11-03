import { dirname, resolve } from "node:path";
import { calculateDanger } from "../../shared/src/calculation/danger.js";
import type { WorkdaySettings } from "../../shared/src/calculation/dates.js";
import { todayInTokyo } from "../../shared/src/calculation/dates.js";
import { calculateActualPace } from "../../shared/src/calculation/pace.js";
import { pendingWork } from "../../shared/src/calculation/prediction.js";
import { descendantCounts } from "../../shared/src/domain/deletion.js";
import type { Project } from "../../shared/src/domain/index.js";
import { operationSchema } from "../../shared/src/domain/messages.js";
import { deleteProjectFile, deleteProjectItem } from "./storage/delete.js";
import { editProjectItem } from "./storage/edit.js";
import { addEvent, addStory, addTask } from "./storage/hierarchy.js";
import {
  createProject,
  loadManageFile,
  readProjectName,
  setProjectLoaded,
} from "./storage/manage.js";
import { updateTask } from "./storage/project.js";

export type BoardSnapshot = {
  version: number;
  projects: Project[];
  selectedEventId: string | null;
  error: string | null;
  settings: WorkdaySettings;
  projectEntries: { file: string; load: boolean; name: string }[];
};

type Surface = "board" | "events";
type Listener = (snapshot: BoardSnapshot) => void;

/** REQ-013: 検証済みデータの単一版を二つの表示面へ配信する。 */
export class BoardSession {
  private state: BoardSnapshot = {
    version: 0,
    projects: [],
    selectedEventId: null,
    error: null,
    settings: { workdays_off: ["sat", "sun"], public_holidays: true },
    projectEntries: [],
  };
  private listeners = new Map<Surface, Set<Listener>>();

  constructor(readonly managePath: string) {}

  snapshot(): BoardSnapshot {
    return this.state;
  }

  subscribe(surface: Surface, listener: Listener): () => void {
    const listeners = this.listeners.get(surface) ?? new Set<Listener>();
    listeners.add(listener);
    this.listeners.set(surface, listeners);
    listener(this.state);
    return () => listeners.delete(listener);
  }

  selectEvent(eventId: string | null): void {
    this.publish({ ...this.state, selectedEventId: eventId });
  }

  /** REQ-020: Projectの読込条件をmanage.yamlへ保存して再配信する。 */
  async setProjectLoaded(file: string, load: boolean): Promise<void> {
    await setProjectLoaded(this.managePath, file, load);
    await this.reload();
  }

  /** REQ-014/REQ-022/REQ-023/REQ-024: 操作を検証し、保存後のスナップショットを配信する。 */
  async handleOperation(
    raw: unknown,
  ): Promise<{ ok: boolean; error?: string }> {
    const parsed = operationSchema.safeParse(raw);
    if (!parsed.success) return { ok: false, error: parsed.error.message };
    const operation = parsed.data;
    try {
      if (operation.type === "setProjectLoaded") {
        await this.setProjectLoaded(operation.file, operation.load);
        return { ok: true };
      }
      if (operation.type === "selectEvent") {
        const exists = this.state.projects.some((project) =>
          project.events.some((event) => event.id === operation.eventId),
        );
        if (!exists)
          throw new Error(`Eventが見つからない: ${operation.eventId}`);
        this.selectEvent(operation.eventId);
        return { ok: true };
      }
      if (operation.type === "createProject") {
        await createProject(this.managePath, operation.name, operation.color);
        await this.reload();
        return { ok: true };
      }
      const { manage, loadedProjects } = await loadManageFile(this.managePath);
      const loadedFiles = manage.projects.filter((entry) => entry.load);
      if (operation.type === "editItem") {
        const index = loadedProjects.findIndex((project) =>
          operation.kind === "project"
            ? project.id === operation.id
            : project.events.some((event) =>
                operation.kind === "event"
                  ? event.id === operation.id
                  : event.stories.some((story) =>
                      operation.kind === "story"
                        ? story.id === operation.id
                        : story.tasks.some((task) => task.id === operation.id),
                    ),
              ),
        );
        const file = loadedFiles[index]?.file;
        if (!file) throw new Error(`編集対象が見つからない: ${operation.id}`);
        await editProjectItem(
          resolve(dirname(this.managePath), file),
          operation.kind,
          operation.id,
          operation.patch,
        );
        await this.reload();
        return { ok: true };
      }
      if (operation.type === "deleteItem") {
        if (operation.version !== this.state.version)
          throw new Error("表示内容が更新されたため、削除をやり直す");
        if (
          JSON.stringify(loadedProjects) !== JSON.stringify(this.state.projects)
        )
          throw new Error("保存内容が更新されたため、削除をやり直す");
        const current = descendantCounts(
          loadedProjects,
          operation.kind,
          operation.id,
        );
        if (
          !current ||
          current.events !== operation.expected.events ||
          current.stories !== operation.expected.stories ||
          current.tasks !== operation.expected.tasks
        )
          throw new Error("削除対象の内容が変わったため、削除をやり直す");
        const index = loadedProjects.findIndex((project) =>
          operation.kind === "project"
            ? project.id === operation.id
            : descendantCounts([project], operation.kind, operation.id) !==
              null,
        );
        const file = loadedFiles[index]?.file;
        if (!file) throw new Error(`削除対象が見つからない: ${operation.id}`);
        const path = resolve(dirname(this.managePath), file);
        if (operation.kind === "project")
          await deleteProjectFile(this.managePath, file, path);
        else await deleteProjectItem(path, operation.kind, operation.id);
        await this.reload();
        return { ok: true };
      }
      if (
        operation.type === "addEvent" ||
        operation.type === "addStory" ||
        operation.type === "addTask"
      ) {
        const index = loadedProjects.findIndex((project) =>
          operation.type === "addEvent"
            ? project.id === operation.projectId
            : operation.type === "addStory"
              ? project.events.some((event) => event.id === operation.eventId)
              : project.events.some((event) =>
                  event.stories.some((story) => story.id === operation.storyId),
                ),
        );
        const file = loadedFiles[index]?.file;
        if (!file) throw new Error("追加先が見つからない");
        const path = resolve(dirname(this.managePath), file);
        if (operation.type === "addEvent")
          await addEvent(path, operation.name, operation.due);
        else if (operation.type === "addStory")
          await addStory(path, operation.eventId, operation.name);
        else await addTask(path, operation.storyId, operation.name);
        await this.reload();
        return { ok: true };
      }
      const index = loadedProjects.findIndex((project) =>
        project.events.some((event) =>
          event.stories.some((story) =>
            story.tasks.some((task) => task.id === operation.taskId),
          ),
        ),
      );
      const file = loadedFiles[index]?.file;
      if (!file) throw new Error(`Taskが見つからない: ${operation.taskId}`);
      const path = resolve(dirname(this.managePath), file);
      if (operation.type === "setTaskDone") {
        await updateTask(path, operation.taskId, {
          doneAt: operation.done ? todayInTokyo() : undefined,
        });
      } else {
        await updateTask(path, operation.taskId, {
          points: operation.points ?? undefined,
        });
      }
      await this.reload();
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async reload(): Promise<void> {
    try {
      const { manage, loadedProjects } = await loadManageFile(this.managePath);
      const selected = loadedProjects.some((project) =>
        project.events.some((event) => event.id === this.state.selectedEventId),
      )
        ? this.state.selectedEventId
        : null;
      const today = todayInTokyo();
      const actual = calculateActualPace(
        loadedProjects,
        today,
        manage.settings,
      );
      const danger = calculateDanger(
        loadedProjects,
        today,
        today,
        today,
        manage.settings,
        actual.pace,
        actual.learning,
      ).events;
      const work = pendingWork(loadedProjects);
      const firstDanger = work.find((item) => {
        const flag = danger[item.eventId];
        return flag?.approaching || flag?.overdue || flag?.overflow;
      });
      const firstEvent = loadedProjects
        .flatMap((project) =>
          project.events.map((event) => ({
            projectId: project.id,
            eventId: event.id,
            due: event.due,
          })),
        )
        .sort(
          (a, b) =>
            a.due.localeCompare(b.due) ||
            a.projectId.localeCompare(b.projectId) ||
            a.eventId.localeCompare(b.eventId),
        )[0];
      this.publish({
        version: this.state.version + 1,
        projects: loadedProjects,
        selectedEventId:
          selected ??
          firstDanger?.eventId ??
          work[0]?.eventId ??
          firstEvent?.eventId ??
          null,
        error: null,
        settings: manage.settings,
        projectEntries: await Promise.all(
          manage.projects.map(async (entry) => ({
            ...entry,
            name: entry.load
              ? (loadedProjects[
                  manage.projects
                    .filter((item) => item.load)
                    .findIndex((item) => item.file === entry.file)
                ]?.name ?? entry.file)
              : await readProjectName(this.managePath, entry.file),
          })),
        ),
      });
    } catch (error) {
      this.publish({
        ...this.state,
        version: this.state.version + 1,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private publish(snapshot: BoardSnapshot): void {
    this.state = snapshot;
    for (const listeners of this.listeners.values())
      for (const listener of listeners) listener(snapshot);
  }
}
