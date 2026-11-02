import type { Project, Task } from "../../packages/shared/src/domain/index.js";

export const weekdays = {
  workdays_off: ["sat", "sun"],
  public_holidays: false,
};

export function projectWithTasks(
  tasks: Partial<Task>[],
  due = "2026-11-30",
  projectId = "project",
): Project {
  return {
    id: projectId,
    name: projectId,
    color: "#336699",
    events: [
      {
        id: `${projectId}-event`,
        name: "Event",
        due,
        stories: [
          {
            id: `${projectId}-story`,
            name: "Story",
            tasks: tasks.map((task, index) => ({
              id: `${projectId}-task-${index}`,
              name: `Task ${index}`,
              ...task,
            })),
          },
        ],
      },
    ],
  };
}
