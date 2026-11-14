# Tasks

## 1. 不具合の再現と共通DatePicker

設計：[D-01](design.md#d-01---webview内で共通datepickerを描画する)、[D-03](design.md#d-03---カレンダーの操作と取消を親へ伝播させない)、[D-04](design.md#d-04---狭い表示面と実webviewを検証対象にする)。

- [x] 1.1 [REQ-022／REQ-022-S05] 現行ビルドを隔離したVS Code安定版で開き、EVENT一覧の「期限を選ぶ」からカレンダーが表示されない状態と、取得できる場合は例外を記録する。
  `artifacts/event-date-picker/`と台帳へ再現手順、画像、環境を残し、ソースからの推論と実機で確認した事実を区別する。
- [x] 1.2 [REQ-022／REQ-022-S05、REQ-022-S06、REQ-022-S08] `tests/shared-ui/date-picker.test.tsx`へカレンダーの表示、実際の日付ボタンによる選択、月移動、年境界、うるう日、直接入力、キーボード操作を追加する。
  API未定義と`SecurityError`の条件を含め、`corepack pnpm test tests/shared-ui/date-picker.test.tsx`で未実装の振る舞いによる失敗を確認する。
- [x] 1.3 [REQ-022／REQ-022-S05、REQ-022-S06、REQ-022-S08] `shared/ui/date-picker/`に共通部品、公開入口、日付配列の処理を実装する。
  既存の日付検証と日本時間の今日を使い、Portal、位置調整、フォーカスとキー操作、選択時の変更通知を実装して対象テストの成功を確認する。
- [x] 1.4 [REQ-022／REQ-022-S05、REQ-022-S06、REQ-022-S08] 共通部品の責務から要件IDを参照し、台帳へ実装、テスト、再現と成功確認の結果を記録する。
  日付だけの操作が保存要求を発生させないことと、FSDの依存方向を確認する。

## 2. Event追加の両レイアウトへ適用

設計：[D-01](design.md#d-01---webview内で共通datepickerを描画する)、[D-02](design.md#d-02---直接入力と親フォームの検証を維持する)、[D-03](design.md#d-03---カレンダーの操作と取消を親へ伝播させない)。

- [x] 2.1 [REQ-022／REQ-022-S01、REQ-022-S03、REQ-022-S05、REQ-022-S06、REQ-022-S07、REQ-022-S08] `tests/hierarchy-operations/event-date-picker.test.tsx`を追加し、`tests/event-list-filtering/ui-refinement.test.ts`の日付テストを実際のカレンダー操作へ変更する。
  両レイアウトの選択・追加、期限未入力時のEnter、不正な直接入力、Escと枠外クリック、日付選択だけの送信禁止、保存失敗後の入力保持を検証し、対象テストの未実装による失敗を確認する。
- [x] 2.2 [REQ-022／REQ-022-S01、REQ-022-S03、REQ-022-S05、REQ-022-S06、REQ-022-S07、REQ-022-S08] `InlineAdd.tsx`の両期限欄と未入力時の処理を共通DatePickerへ置き換え、非表示date入力と`showPicker()`への依存を除去する。
  `corepack pnpm test tests/shared-ui/date-picker.test.tsx tests/hierarchy-operations/event-date-picker.test.tsx tests/event-list-filtering/ui-refinement.test.ts`で、期限の選択から追加要求まで成功することを確認する。
- [x] 2.3 [REQ-022／REQ-022-S01、REQ-022-S02、REQ-022-S03、REQ-022-S04、REQ-022-S05、REQ-022-S06、REQ-022-S07、REQ-022-S08] 既存の`req-022-s01.test.ts`、`req-022-s02.test.ts`、`req-022-s04.test.ts`、`regression-inline-add.test.ts`も実行して、保存、Storyの取消、Project色、保存失敗の回帰を確認する。
  両READMEのEvent追加手順を更新し、台帳に両レイアウトの実装と検証の対応を記録する。

## 3. 詳細パネルの期限編集へ横展開

設計：[D-01](design.md#d-01---webview内で共通datepickerを描画する)、[D-02](design.md#d-02---直接入力と親フォームの検証を維持する)、[D-03](design.md#d-03---カレンダーの操作と取消を親へ伝播させない)。

- [x] 3.1 [REQ-027／REQ-027-S01、REQ-027-S03、REQ-027-S04] `tests/detail-panel/event-date-picker.test.tsx`へ既存期限の選択表示、APIなし・例外条件、日付選択と明示的な保存、未入力と不正日付、カレンダー取消後の編集内容保持を追加する。
  `corepack pnpm test tests/detail-panel/event-date-picker.test.tsx`で未実装の振る舞いによる失敗を確認する。
- [x] 3.2 [REQ-027／REQ-027-S01、REQ-027-S03、REQ-027-S04] `DetailPanel.tsx`の期限編集を共通DatePickerへ置き換え、保存前の検証とEscの伝播制御を実装する。
  同じテストを実行し、日付選択だけで保存せず、カレンダーだけの取消でパネルや編集中の名前と期限が失われないことを確認する。
- [x] 3.3 [REQ-027／REQ-027-S01、REQ-027-S02、REQ-027-S03、REQ-027-S04] `tests/detail-panel/req-027-s01.test.ts`と`req-027-s02.test.ts`を実行し、期限変更後の保存・危険判定とProject色編集の回帰を確認する。
  両READMEの編集手順を更新し、台帳へ横展開した実装、テスト、検証結果を記録する。

## 4. 画面、実Webview、成果物全体の検証

設計：[D-04](design.md#d-04---狭い表示面と実webviewを検証対象にする)、[Verification Plan](design.md#verification-plan)。

- [x] 4.1 [REQ-022／REQ-022-S01、REQ-022-S03、REQ-022-S05、REQ-022-S06、REQ-022-S07、REQ-022-S08、REQ-022-S09、REQ-027／REQ-027-S01、REQ-027-S03、REQ-027-S04] `scripts/verify-event-date-picker.mjs`を用意し、実ビルドの両追加レイアウトと詳細編集でカレンダーの表示から選択・確定まで操作する。
  両テーマ、幅240pxのEVENT一覧、画面端、スクロール、フォーカス、Asia/TokyoとAmerica/Los_Angelesを検証する。
  さらにVS Code安定版の隔離データで、EVENT一覧からの追加と詳細編集、YAMLと両画面の反映、取消と入力保持を確認する。
  `artifacts/event-date-picker/`に画像と結果を保存し、両READMEの画面例と台帳を更新する。
  通常レイアウトは専用の描画入口で確認し、製品に存在しない追加導線を作らない。
- [x] 4.2 [REQ-022／REQ-022-S01、REQ-022-S02、REQ-022-S03、REQ-022-S04、REQ-022-S05、REQ-022-S06、REQ-022-S07、REQ-022-S08、REQ-022-S09、REQ-027／REQ-027-S01、REQ-027-S02、REQ-027-S03、REQ-027-S04] `corepack pnpm test`、`corepack pnpm typecheck`、`corepack pnpm check`、`corepack pnpm check:fsd`、`corepack pnpm build`、`git diff --check`を実行する。
  既存の保存経路を含めて成功し、実行日と環境を台帳へ記録したことを完了条件とする。
- [x] 4.3 [REQ-022／REQ-022-S01、REQ-022-S02、REQ-022-S03、REQ-022-S04、REQ-022-S05、REQ-022-S06、REQ-022-S07、REQ-022-S08、REQ-022-S09、REQ-027／REQ-027-S01、REQ-027-S02、REQ-027-S03、REQ-027-S04] `openspec validate fix-event-date-picker --strict`とOpenSpec verifyを実施する。
  提案、全13シナリオ、設計、タスク、実装、テスト、画像、README、台帳の対応とリンクを照合し、未実装と未検証が残っていないことを確認する。

## Workflow follow-up

- 実装と検証の完了後、アーカイブ時に差分仕様を正式仕様へ同期し、台帳と移動後の参照を更新する。
