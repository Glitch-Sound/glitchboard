import { localBridge } from "./bridge.js";

export function ManageSetup() {
  return (
    <section aria-label="manage.yamlの設定">
      <p>manage.yamlを選ぶか、新しく作成してください。</p>
      <button
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
    </section>
  );
}
