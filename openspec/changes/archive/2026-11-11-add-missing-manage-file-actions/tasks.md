# Tasks

## 1. 管理ファイル不在の分類と状態配信

設計：[D-01](design.md#d-01---管理ファイルの読込段階で不在を分類する)、[D-02](design.md#d-02---不在状態をスナップショットへ付加する)。

- [x] 1.1 [REQ-029／REQ-029-S02、REQ-029-S03、REQ-029-S08、REQ-029-S10] `tests/vscode-extension-shell/req-029-state.test.ts`に起動・設定切替時の不在、監視による削除・復元、その他の読込エラーとの区別、直前データの保持を追加し、`corepack pnpm test tests/vscode-extension-shell/req-029-state.test.ts`で不在状態が未実装であるため失敗することを確認する。
- [x] 1.2 [REQ-029／REQ-029-S02、REQ-029-S03、REQ-029-S08、REQ-029-S10] `storage/manage.ts`、`session.ts`、`shared/src/domain/messages.ts`へ管理ファイル自身の不在分類と検証可能な配信状態を追加し、同じテストの成功を確認する。
- [x] 1.3 [REQ-029／REQ-029-S02、REQ-029-S03、REQ-029-S08、REQ-029-S10] `extension.ts`の初回配信、`ready`応答、後から開く表示面、削除・作成監視を確認し、状態テストと既存の`req-013-s02.test.ts`、`req-013-s03.test.ts`、`req-013-s01-snapshot-validation.test.ts`を実行して両画面の同期と旧設定先からの通知抑止を確認する。
- [x] 1.4 [REQ-029／REQ-029-S02、REQ-029-S03、REQ-029-S08、REQ-029-S10] 公開責務のコメントへ要件IDを記載し、台帳へ実装とテストのパス、コマンド、結果を記録して差分仕様との対応を確認する。

## 2. 案内と明確なボタンの表示

設計：[D-02](design.md#d-02---不在状態をスナップショットへ付加する)、[D-03](design.md#d-03---案内に限定したボタンの外観と操作を定義する)。

- [x] 2.1 [REQ-029／REQ-029-S01、REQ-029-S02、REQ-029-S03、REQ-029-S09、REQ-029-S10] `tests/vscode-extension-shell/req-029-ui.test.tsx`へ両入口の未設定・不在・復帰、パスと理由、ボタンの役割と操作メッセージ、直前表示の保持を追加し、`corepack pnpm test tests/vscode-extension-shell/req-029-ui.test.tsx`で未実装の表示条件が失敗することを確認する。
- [x] 2.2 [REQ-029／REQ-029-S01、REQ-029-S02、REQ-029-S03、REQ-029-S09、REQ-029-S10] `ManageSetup.tsx`、`board.tsx`、`events.tsx`、`style.css`を変更し、状態別案内、背景と枠のある二つのボタン、余白、ホバー、フォーカス、折り返しを実装してUIテストの成功を確認する。
- [x] 2.3 [REQ-029／REQ-029-S01、REQ-029-S02、REQ-029-S09] 対象UIのPlaywright描画手順を整え、両テーマのボードと幅240pxのEVENT一覧で通常・ホバー・フォーカス、Tab・Enter・Space、長いパス、横はみ出しを確認する。
  `artifacts/manage-setup/`へ画面の証跡を保存し、仕様S09の各判定を満たすことを確認する。
- [x] 2.4 [REQ-029／REQ-029-S01、REQ-029-S02、REQ-029-S03、REQ-029-S09、REQ-029-S10] `README.md`と`packages/extension/README.md`へ不在時の案内を追記し、台帳へUIの実装、テスト、画像、検証結果を記録してラベルと手順の一致を確認する。

## 3. 選択・作成と取消・失敗からの復帰

設計：[D-04](design.md#d-04---既存の設定操作を復旧にも使う)。

- [x] 3.1 [REQ-029／REQ-029-S04、REQ-029-S05、REQ-029-S06、REQ-029-S07] `tests/vscode-extension-shell/req-029-setup.test.ts`とUIテストに、両画面からの選択・作成、同一パスと別パスへの作成、取消、既存ファイル指定、権限失敗、失敗後の再操作を追加する。
  `corepack pnpm test tests/vscode-extension-shell/req-029-setup.test.ts tests/vscode-extension-shell/req-029-ui.test.tsx`で未実装の復帰条件の失敗を確認し、現行動作で既に成功する項目は回帰検証として記録する。
- [x] 3.2 [REQ-029／REQ-029-S04、REQ-029-S05、REQ-029-S06、REQ-029-S07] 検証した設定操作とダイアログを再利用し、必要な再読込と操作エラーの解除を実装する。
  同じテストの成功により、初期YAML、設定保存、監視切替、案内解除、取消時の無変更、既存ファイルの保護と再操作を確認する。
- [x] 3.3 [REQ-029／REQ-029-S04、REQ-029-S05、REQ-029-S06、REQ-029-S07] 既存の`req-014-setup-schema.test.ts`と`regression-webview.test.ts`を再実行し、不正メッセージの拒否とエラー表示が維持されることを確認する。
  台帳へ実装、テスト、検証結果を記録し、READMEの手順と一致することを確認する。

## 4. 全体の整合性と検証

設計：[Verification Plan](design.md#verification-plan)。

- [x] 4.1 [REQ-029／REQ-029-S01、REQ-029-S02、REQ-029-S03、REQ-029-S04、REQ-029-S05、REQ-029-S06、REQ-029-S07、REQ-029-S08、REQ-029-S09、REQ-029-S10] `corepack pnpm test`、`corepack pnpm typecheck`、`corepack pnpm check`、`corepack pnpm check:fsd`、`corepack pnpm build`、`git diff --check`を実行し、関連回帰を含めて成功を確認して台帳へ記録する。
- [x] 4.2 [REQ-029／REQ-029-S01、REQ-029-S02、REQ-029-S03、REQ-029-S04、REQ-029-S05、REQ-029-S06、REQ-029-S07、REQ-029-S09、REQ-029-S10] VS Code安定版の実画面で、両テーマ、両表示面、二つの実ダイアログ、取消、失敗後の再操作、削除と復元を確認する。
  結果と画像を台帳へ記録し、未実施の項目を完了扱いにしない。
- [x] 4.3 [REQ-029／REQ-029-S01、REQ-029-S02、REQ-029-S03、REQ-029-S04、REQ-029-S05、REQ-029-S06、REQ-029-S07、REQ-029-S08、REQ-029-S09、REQ-029-S10] `openspec validate add-missing-manage-file-actions --strict`とOpenSpec verifyを行い、提案、全シナリオ、設計、タスク、実装、テスト、台帳、READMEの対応とリンクを照合する。
  問題が解消され、実績を追跡できることを完了条件とする。

## Workflow follow-up

- 実装と検証の完了後、config.yamlのarchive運用に従って差分仕様を正式仕様へ反映してアーカイブし、台帳と移動後の参照を更新する。
