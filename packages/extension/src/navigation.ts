type Navigator = {
  selectEvent(
    eventId: string,
  ):
    | undefined
    | Promise<undefined | { ok: boolean; error?: string }>
    | { ok: boolean; error?: string };
  openBoard(): void | Promise<void>;
};

/** REQ-021: サイドバーのEvent選択をボードの表示へつなぐ。 */
export async function navigateToEvent(
  eventId: string,
  navigator: Navigator,
): Promise<void> {
  const result = await navigator.selectEvent(eventId);
  if (result && !result.ok)
    throw new Error(result.error ?? "Eventを選択できない");
  await navigator.openBoard();
}
