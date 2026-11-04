type Props = {
  name: string;
  note?: string;
  icon?: "info" | "document";
  onOpen(): void;
};

/** REQ-026: 補足の有無に応じた詳細ボタン。 */
export function DetailButton({ name, note, icon = "info", onOpen }: Props) {
  return (
    <button
      type="button"
      className={`detail-button ${note ? "has-note" : "no-note"} ${icon === "document" ? "detail-button-document" : ""}`}
      aria-label={`${name}の詳細`}
      onClick={onOpen}
    >
      {icon === "document" ? (
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path
            d="M5 2.5h7l3 3V17H5zM12 2.5V6h3M8 9h4M8 12h4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        "ⓘ"
      )}
    </button>
  );
}
