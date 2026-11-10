import { localBridge } from "./bridge.js";

/** REQ-029: 管理ファイル未設定・不在から作成または選択へ案内する。 */
export function ManageSetup({ missingPath }: { missingPath?: string }) {
  return (
    <section className="manage-setup" aria-label="manage.yamlの設定">
      <h2>
        {missingPath ? "manage.yamlが見つかりません" : "manage.yamlを設定"}
      </h2>
      {missingPath && <p className="manage-setup-path">{missingPath}</p>}
      <p>管理ファイルを新しく作るか、既存のファイルを選んでください。</p>
      <div className="manage-setup-actions">
        <button
          className="manage-setup-secondary"
          type="button"
          onClick={() => localBridge()?.postMessage({ type: "chooseManage" })}
        >
          manage.yamlを選ぶ
        </button>
        <button
          type="button"
          onClick={() => localBridge()?.postMessage({ type: "createManage" })}
        >
          新しく作る
        </button>
      </div>
    </section>
  );
}
