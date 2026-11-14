import { z } from "zod";
import { projectColorSchema } from "./color.js";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "日付は実在するYYYY-MM-DDにする");

const id = z.uuid();
const name = z.string().trim().min(1);
const common = { id, name, note: z.string().optional() };

export const taskSchema = z.object({
  ...common,
  points: z
    .union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(5),
      z.literal(8),
      z.literal(13),
      z.literal(21),
    ])
    .optional(),
  doneAt: isoDate.optional(),
});

export const storySchema = z.object({
  ...common,
  tasks: z.array(taskSchema),
});

export const eventTaskGroupName = "Taks";

export const eventSchema = z.object({
  ...common,
  due: isoDate,
  tasks: z.array(taskSchema).optional(),
  stories: z.array(storySchema).default([]),
});

export const projectSchema = z.object({
  ...common,
  color: projectColorSchema,
  events: z.array(eventSchema),
});

export type Task = z.infer<typeof taskSchema>;
export type Story = z.infer<typeof storySchema>;
export type Event = z.infer<typeof eventSchema>;
export type Project = z.infer<typeof projectSchema>;

/** Event直下と任意グループのTaskを、すべての表示と計算で同じ対象にする。 */
export function eventTasks(event: Event): Task[] {
  return [
    ...(event.tasks ?? []),
    ...event.stories.flatMap((story) => story.tasks),
  ];
}

/** REQ-001: 未見積Taskの計算上のポイント。 */
export function effectiveTaskPoints(task: Pick<Task, "points">): number {
  return task.points ?? 3;
}

export function storyPoints(story: Story): { done: number; total: number } {
  return taskPoints(story.tasks);
}

function taskPoints(tasks: readonly Task[]): { done: number; total: number } {
  return tasks.reduce(
    (acc, task) => {
      const points = effectiveTaskPoints(task);
      acc.total += points;
      if (task.doneAt) acc.done += points;
      return acc;
    },
    { done: 0, total: 0 },
  );
}

export function eventPoints(event: Event): { done: number; total: number } {
  return taskPoints(eventTasks(event));
}
