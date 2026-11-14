/** REQ-014-S03: 失敗理由を変えず、狭い画面でも読める共通の通知。 */
export function OperationError({ message }: { message: string }) {
  return (
    <p role="alert" className="operation-error">
      <svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true">
        <path
          d="M10 2.5 18 17H2zM10 7v4m0 2.5v.1"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span>{message}</span>
    </p>
  );
}
