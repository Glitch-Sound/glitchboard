# Verification Report: fix-event-date-picker

2026-11-11に`openspec-verify-change`のCompleteness、Correctness、Coherenceを照合した。
対象は`glitchboard`スキーマの[提案](proposal.md)、[追加仕様](specs/hierarchy-editing/spec.md)、[編集仕様](specs/item-details/spec.md)、[設計](design.md)、[タスク](tasks.md)である。

## 判定

| 観点 | 結果 |
| --- | --- |
| Completeness | 適用タスク13/13完了をCLIで再確認、要件2/2の実装あり |
| Correctness | 要件の実装対応2/2、全13シナリオの証跡あり |
| Coherence | D-01〜D-04準拠、既存の配置・保存・日付処理と整合 |

CRITICAL、WARNING、SUGGESTIONはいずれも0件である。
未検証として省略した確認はない。
通常レイアウトは製品の追加導線に存在しないため、専用入口のブラウザと部品テストで確認した。
実VS Codeの追加は製品で使用中のEVENT一覧から確認した。

## 実装対応

REQ-022は[InlineAdd.tsx](../../../packages/webview/src/features/inline-add/ui/InlineAdd.tsx)の両レイアウト、137行目の保存前検証、[DatePicker.tsx](../../../packages/webview/src/shared/ui/date-picker/DatePicker.tsx)の制御された入力とPortalに対応する。
REQ-027は[DetailPanel.tsx](../../../packages/webview/src/widgets/detail-panel/ui/DetailPanel.tsx)の139行目の検証、171行目の共通部品の利用、Escの処理済み判定に対応する。
日付・月の移動は[date-grid.ts](../../../packages/webview/src/shared/ui/date-picker/date-grid.ts)と既存のUTC暦日処理を利用する。
日付の選択時は`onChange`だけを通知し、親の追加・保存操作だけが既存の通信を行う。

| シナリオ | 確認した条件 | 証跡 |
| --- | --- | --- |
| REQ-022-S01 | 選択日・名前・Projectで追加、YAML保存 | [既存保存](../../../tests/hierarchy-operations/req-022-s01.test.ts)、[追加UI](../../../tests/hierarchy-operations/event-date-picker.test.tsx)、[実機](../../../artifacts/event-date-picker/vscode-results.json) |
| REQ-022-S02 | カレンダーが閉じている場合のStory取消 | [既存取消](../../../tests/hierarchy-operations/req-022-s02.test.ts) |
| REQ-022-S03 | 失敗時に入力保持、上部エラー、再操作で成功 | [保存失敗回帰](../../../tests/hierarchy-operations/regression-inline-add.test.ts)、[追加UI](../../../tests/hierarchy-operations/event-date-picker.test.tsx)、[実EACCES画面](../../../artifacts/event-date-picker/vscode-save-error.png) |
| REQ-022-S04 | 未使用のProject色を初期選択 | [既存色](../../../tests/hierarchy-operations/req-022-s04.test.ts) |
| REQ-022-S05 | APIなし・例外でも両レイアウトで日付選択、確定前は送信0件 | [共通部品](../../../tests/shared-ui/date-picker.test.tsx)、[追加UI](../../../tests/hierarchy-operations/event-date-picker.test.tsx)、[実機](../../../artifacts/event-date-picker/vscode-results.json) |
| REQ-022-S06 | Esc・枠外はカレンダーだけ取消、Tab・矢印・Enter・Space、フォーカス復帰 | [追加UI](../../../tests/hierarchy-operations/event-date-picker.test.tsx)、[ブラウザ](../../../artifacts/event-date-picker/browser-results.json)、[最終実機](../../../artifacts/event-date-picker/vscode-final-smoke.json) |
| REQ-022-S07 | 空・2026-02-30で送信せず保持、空はカレンダー、不正値は理由表示 | [追加UI](../../../tests/hierarchy-operations/event-date-picker.test.tsx)、[ブラウザ](../../../artifacts/event-date-picker/browser-results.json) |
| REQ-022-S08 | 選択済み月・東京の当月、年境界、うるう日、祝日・過去日・直接入力、2タイムゾーン | [共通部品](../../../tests/shared-ui/date-picker.test.tsx)、[ブラウザ](../../../artifacts/event-date-picker/browser-results.json)、[土曜の実機選択](../../../artifacts/event-date-picker/vscode-final-smoke.json) |
| REQ-022-S09 | 両テーマ、240px、通常レイアウト、上下左右端、スクロール、選択・フォーカス表示 | [検証スクリプト](../../../scripts/verify-event-date-picker.mjs)、[狭い一覧](../../../artifacts/event-date-picker/events-dark-calendar.png)、[通常レイアウト](../../../artifacts/event-date-picker/fixture-light-calendar.png)、[実機ライト](../../../artifacts/event-date-picker/vscode-light-add-calendar.png) |
| REQ-027-S01 | 期限変更でYAML・タイムライン列・危険判定更新 | [既存編集保存と危険判定](../../../tests/detail-panel/req-027-s01.test.ts)、[実機の列移動](../../../artifacts/event-date-picker/vscode-results.json) |
| REQ-027-S02 | Project色の保存と表示 | [既存色編集](../../../tests/detail-panel/req-027-s02.test.ts) |
| REQ-027-S03 | APIなし・例外、既存選択日、選択だけでは保存しない、空・不正値、直接入力、テーマ | [編集UI](../../../tests/detail-panel/event-date-picker.test.tsx)、[ブラウザ](../../../artifacts/event-date-picker/browser-results.json)、[実機](../../../artifacts/event-date-picker/vscode-results.json) |
| REQ-027-S04 | Esc・枠外でパネルと名前・期限を保持、Tabで親へ移動後もカレンダーだけ取消 | [編集UI](../../../tests/detail-panel/event-date-picker.test.tsx)、[最終実機](../../../artifacts/event-date-picker/vscode-final-smoke.json) |

## 設計と配置

- D-01：`shared/ui/date-picker/`の公開入口をfeaturesとwidgetsが利用する。
  React、React DOMと既存の日付処理だけで構成し、依存追加はない。
- D-02：見えるテキスト入力を`eventSchema.shape.due`で検証し、不正値を保持する。
  保存形式と既存のExtension通信・YAML保存経路は変更していない。
- D-03：カレンダーが開いている間のEscはcapture段階で消費する。
  Portalの矢印・Enter・Spaceは親へ伝播させず、選択後とEsc後にトリガーへフォーカスを戻す。
- D-04：bodyへのPortal、画面内の座標調整、スクロール・resizeへの追従、VS Codeテーマ変数を使用する。
  [装飾](../../../packages/webview/src/app/style.css)から非表示date入力専用の処理を除去した。

FSDチェック、Biome、型検査が成功した。
製品コードには`showPicker()`呼び出しと`type="date"`が残っていない。
通常レイアウトは[専用入口](../../../scripts/fixtures/event-date-picker.tsx)で検証し、製品に新しい導線を追加していない。

## 実行証跡と文書

[検証結果](../../../artifacts/event-date-picker/check-results.json)に未実装時の失敗と成功後の結果を記録した。
`corepack pnpm test`は80ファイル、144テスト成功した。
`corepack pnpm typecheck`、`corepack pnpm check`、`corepack pnpm check:fsd`、`corepack pnpm build`、`git diff --check`、`openspec validate fix-event-date-picker --strict`も成功した。
環境はmacOS arm64、Node 24.18.0、pnpm 12.16.1、VS Code 1.145.2安定版である。
ブラウザは2タイムゾーン・両テーマ・3表示面の12条件が成功した。
既存Zod依存のビルド注釈警告は出るが、ビルドは正常終了した。

[再現記録](../../../artifacts/event-date-picker/reproduction.json)では、旧ビルドの別オリジンiframeで`SecurityError`を確認した。
[実機記録](../../../artifacts/event-date-picker/vscode-results.json)では実YAMLの追加・編集とEACCES後の再操作を確認した。
[最終実機確認](../../../artifacts/event-date-picker/vscode-final-smoke.json)では最終ビルドでのTab移動後のEscと両テーマを確認した。
検証は隔離したYAMLとVS Codeプロファイルで実施した。

[ルートREADME](../../../README.md)、[配布用README](../../../packages/extension/README.md)、[台帳](../../traceability.md#event期限選択の改修計画)と新しい画像の対応を確認した。
計画文書30個のファイル参照と、両READMEの今回の画像参照が解決できた。
正式仕様への同期とアーカイブは後続のワークフローである。

全確認が成功し、未実装・未検証は残っていない。
アーカイブへ進める状態である。
