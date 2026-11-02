import type { Event, Project, Story } from "./index.js";

export type ItemKind = "project" | "event" | "story" | "task";
export type DescendantCounts = {
  events: number;
  stories: number;
  tasks: number;
};

function storyCounts(story: Story): DescendantCounts {
  return { events: 0, stories: 0, tasks: story.tasks.length };
}

export function eventCounts(event: Event): DescendantCounts {
  return {
    events: 0,
    stories: event.stories.length,
    tasks: event.stories.reduce((n, story) => n + story.tasks.length, 0),
  };
}

export function projectCounts(project: Project): DescendantCounts {
  return {
    events: project.events.length,
    stories: project.events.reduce((n, event) => n + event.stories.length, 0),
    tasks: project.events.reduce((n, event) => n + eventCounts(event).tasks, 0),
  };
}

/** REQ-025: 削除対象の子孫を種類別に数える。 */
export function descendantCounts(
  projects: readonly Project[],
  kind: ItemKind,
  id: string,
): DescendantCounts | null {
  const empty = { events: 0, stories: 0, tasks: 0 };
  for (const project of projects) {
    if (kind === "project" && project.id === id) return projectCounts(project);
    for (const event of project.events) {
      if (kind === "event" && event.id === id) return eventCounts(event);
      for (const story of event.stories) {
        if (kind === "story" && story.id === id) return storyCounts(story);
        if (kind === "task" && story.tasks.some((task) => task.id === id))
          return empty;
      }
    }
  }
  return null;
}
