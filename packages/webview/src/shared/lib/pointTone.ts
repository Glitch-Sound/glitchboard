/** NREQ-003: ポイント色を危険色から分離する。 */
export function pointTone(points: number | undefined): string {
  if (points === undefined) return "points-unestimated";
  if (points <= 2) return "points-low";
  if (points <= 5) return "points-medium";
  if (points <= 13) return "points-high";
  return "points-21";
}
