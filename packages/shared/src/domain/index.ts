import { z } from "zod";

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
const links = z.array(z.object({ label: name, target: name })).optional();
const common = { id, name, note: z.string().optional(), links };

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

export const eventSchema = z.object({
  ...common,
  due: isoDate,
  stories: z.array(storySchema),
});

export const projectSchema = z.object({
  ...common,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  events: z.array(eventSchema),
});

export type Task = z.infer<typeof taskSchema>;
export type Story = z.infer<typeof storySchema>;
export type Event = z.infer<typeof eventSchema>;
export type Project = z.infer<typeof projectSchema>;

/** REQ-001: 未見積Taskの計算上のポイント。 */
export function effectiveTaskPoints(task: Pick<Task, "points">): number {
  return task.points ?? 3;
}

export function storyPoints(story: Story): { done: number; total: number } {
  return story.tasks.reduce(
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
  return event.stories.reduce(
    (acc, story) => {
      const points = storyPoints(story);
      acc.done += points.done;
      acc.total += points.total;
      return acc;
    },
    { done: 0, total: 0 },
  );
}
