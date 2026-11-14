import type { Project } from "./index.js";

export type ProjectSource = Project & { sourceFile?: string };
export type ItemReference = { id: string; projectFile?: string };

/** 保存されたUUIDは変えず、画面と計算のキーへ登録ファイル参照を含める。 */
export function scopedId(projectFile: string | undefined, id: string): string {
  return projectFile ? JSON.stringify([id, projectFile]) : id;
}

export function itemReference(key: string): ItemReference {
  if (!key.startsWith("[")) return { id: key };
  const value: unknown = JSON.parse(key);
  if (
    !Array.isArray(value) ||
    value.length !== 2 ||
    value.some((part) => typeof part !== "string" || !part)
  )
    throw new Error("項目の参照が無効");
  return { id: value[0], projectFile: value[1] };
}

export function scopeProjects(projects: readonly ProjectSource[]): Project[] {
  return projects.map(({ sourceFile, ...project }) =>
    sourceFile
      ? {
          ...project,
          id: scopedId(sourceFile, project.id),
          events: project.events.map((event) => ({
            ...event,
            id: scopedId(sourceFile, event.id),
            tasks: event.tasks?.map((task) => ({
              ...task,
              id: scopedId(sourceFile, task.id),
            })),
            stories: event.stories.map((story) => ({
              ...story,
              id: scopedId(sourceFile, story.id),
              tasks: story.tasks.map((task) => ({
                ...task,
                id: scopedId(sourceFile, task.id),
              })),
            })),
          })),
        }
      : project,
  );
}

export function scopedEventSelection(
  projects: readonly ProjectSource[],
  id: string | null | undefined,
  file?: string | null,
): string | null {
  if (!id) return null;
  const matches = projects.filter(
    (project) =>
      (!file || project.sourceFile === file) &&
      project.events.some((event) => event.id === id),
  );
  return matches.length === 1 ? scopedId(matches[0].sourceFile, id) : null;
}
