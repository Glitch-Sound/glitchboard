import { z } from "zod";

/** REQ-042: 保存形式は従来どおり # と16進数6桁である。 */
export const projectColorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export function normalizeProjectColor(input: string): string | null {
  const parsed = projectColorSchema.safeParse(input.trim());
  return parsed.success ? parsed.data.toLowerCase() : null;
}
