import { z } from "zod";

export const manageSchema = z.object({
  settings: z.object({
    workdays_off: z.array(
      z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
    ),
    public_holidays: z.boolean(),
  }),
  projects: z.array(
    z.object({
      file: z.string().min(1),
      load: z.boolean(),
    }),
  ),
});

export type Manage = z.infer<typeof manageSchema>;
