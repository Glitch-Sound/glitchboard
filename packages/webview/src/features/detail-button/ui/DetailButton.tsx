type Props = { name: string; note?: string; onOpen(): void };

/** REQ-026: 補足の有無に応じた詳細ボタン。 */
export function DetailButton({ name, note, onOpen }: Props) {
  return (
    <button
      type="button"
      className={`detail-button ${note ? "has-note" : "no-note"}`}
      aria-label={`${name}の詳細`}
      onClick={onOpen}
    >
      ⓘ
    </button>
  );
}
