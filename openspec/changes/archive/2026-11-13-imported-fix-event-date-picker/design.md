# Design

## Context

- 提案：[proposal.md](proposal.md)。
- 対象仕様：[REQ-022](specs/hierarchy-editing/spec.md#requirement-req-022---インライン追加)、[REQ-027](specs/item-details/spec.md#requirement-req-027---詳細編集)。
- 前提：[実行境界](../../tech.md#実行境界)、[UI実装](../../tech.md#ui実装)、[配置方針](../../structure.md#配置方針)に従う。
- 影響する境界：Webviewの入力、共通UI、イベント処理、テストである。
  Extensionとsharedの既存の保存・検証・日付計算を利用する。

現行コードで観測した事実は次のとおりである。

| 箇所 | 現行の動作 | 今回の扱い |
| --- | --- | --- |
| `InlineAdd`、`embedded` | 非表示date入力へ`showPicker()` | 共通DatePickerへ置換 |
| `InlineAdd`、`popover` | 表示されたdate入力、期限未入力時のrefは未接続 | 共通DatePickerへ置換 |
| `DetailPanel`、Event編集 | `input type="date"` | 共通DatePickerへ置換 |
| 追加フォームのEsc | 追加欄全体を取り消す | カレンダー操作との伝播を調整 |
| 詳細パネルのEsc | windowのリスナーでパネルを閉じる | カレンダー操作との伝播を調整 |
| `ui-refinement.test.ts` | モックしたAPI呼び出しと直接の日付変更 | 表示と日付選択を確認するテストへ変更 |

現在の製品コードでEvent追加を呼び出すのは`app/events.tsx`の`embedded`だけである。
通常レイアウトは共通部品の提供機能として維持し、部品テストとブラウザ用の描画入口で検証する。
新しいボード用のEvent追加導線は増やさない。

利用者の不具合報告とソースの依存関係は確認したが、この計画段階ではVS Code上の例外を採取していない。
[HTML Standard](https://html.spec.whatwg.org/multipage/input.html#dom-input-showpicker)は、date入力の`showPicker()`を別オリジンのiframeで呼ぶ場合の`SecurityError`を定義している。
[Chrome公式資料](https://developer.chrome.com/blog/show-picker)にもAPIの失敗時には別のUIを使う例がある。
これは今回の設計で考慮する制約であり、報告された環境の直接原因を確定した証拠ではない。

## Goals / Non-Goals

**Goals:**

- REQ-022の期限ボタンから実際にカレンダーが表示され、選んだ日付でEventを追加できること。
- REQ-027へ同じ部品を適用し、追加と編集で別々の失敗経路を残さないこと。
- ブラウザーのpicker API、非表示入力へのクリック、例外の握りつぶしに依存しないこと。
- 親フォームの確定・取消と、カレンダー内の選択・取消を分けること。

**Non-Goals:**

- 日付の保存形式、日付計算、休日の扱い、既存の通信型を変えること。
  期限入力の修正が対象である。
- Project色やProject選択など、異なる入力を同時に刷新すること。
  `showPicker()`の呼び出しとdate入力を列挙した結果、共通化の対象はEvent期限である。

## Decisions

### D-01 - Webview内で共通DatePickerを描画する

- 対象：REQ-022-S01、REQ-022-S05、REQ-022-S08、REQ-027-S01、REQ-027-S03。
- 選択：`packages/webview/src/shared/ui/date-picker/`へ、公開入口、DatePicker本体、カレンダーの日付配列を作る処理を置く。
  値と変更通知を受け取る制御されたUIとし、日付の保存処理とProjectの概念は持たせない。
  `InlineAdd`の両レイアウトと`DetailPanel`のEvent期限欄から共通の入口を利用する。
- 理由：Webview自身がカレンダーを描画すれば、ネイティブpickerの表示制約から独立して操作できる。
  shared層に置くことで、featuresとwidgetsの双方から依存できる。
- 代替案：`showPicker()`へのtry/catchや`click()`の追加だけでは、表示可能なカレンダーが存在することを保証できない。
  呼出箇所ごとにカレンダーを作る方式は、横展開後の差異と再発を生むため採用しない。
- 配置と依存：React、React DOM、既存の純粋な日付処理で構成し、新しい依存パッケージは追加しない。
  日付ボタンはすべて`type="button"`とし、日付選択時には`onChange`だけを呼ぶ。
  選択後はカレンダーを閉じ、追加または保存の確定は呼出元に任せる。
- データと日付：値は`YYYY-MM-DD`で受け渡し、選択済みの月を初期表示する。
  未選択なら`todayInTokyo()`で求めた日本時間の当月を表示し、選択日を自動保存しない。
  月の移動と日付配列はUTCの暦日として計算し、端末のローカル時刻からの変換で日付をずらさない。
  過去日、休日、祝日は無効化しない。

### D-02 - 直接入力と親フォームの検証を維持する

- 対象：REQ-022-S01、REQ-022-S03、REQ-022-S05、REQ-022-S07、REQ-022-S08、REQ-027-S01、REQ-027-S03。
- 選択：日付の直接入力は、ラベル「期限」を持つ見えるテキスト入力で提供する。
  カレンダーの選択と直接入力を同じ編集中の値へ反映し、実在する日付かどうかを既存の`eventSchema.shape.due`で確認する。
  不正な値を送信せず、入力値を保持して理由を示す。
- 理由：ネイティブdate入力への依存をなくしながら、既存の直接入力と厳密な日付検証を維持できる。
- 代替案：非表示のdate入力を残すだけでは、pickerが使えない場合の入力経路にならない。
  空の期限を今日で補完する方式は、利用者の意図しない期限を保存するため採用しない。
- 配置と依存：`InlineAdd.tsx`の未入力時のsubmit処理は共通DatePickerを開き、既存の名前とProjectを保持する。
  DatePickerに開閉状態を渡せるようにし、切断されたdate入力のrefを使わない。
  `DetailPanel.tsx`でも保存前に同じ日付検証を行い、空や不正値を`onSave`へ渡さない。
  `addEvent`と`editItem`は既存のメッセージと保存経路を使う。
- データと日付：厳密な日付判定は既存スキーマを利用し、別の受理条件を作らない。
  YAMLのコメント保持、追加成功後のフォーム終了、追加失敗時の入力保持は維持する。

### D-03 - カレンダーの操作と取消を親へ伝播させない

- 対象：REQ-022-S02、REQ-022-S05、REQ-022-S06、REQ-027-S04。
- 選択：期限のトリガーはボタンとし、開閉状態とカレンダーの名前を支援技術へ伝える。
  カレンダー内では左右の矢印で前後の日、上下の矢印で前後の週へフォーカスを移す。
  EnterとSpaceは日付の選択、Escはカレンダーだけの終了として扱う。
  Escで閉じたら期限のトリガーへフォーカスを戻す。
  枠外クリックでもカレンダーを閉じるが、クリック先への通常のフォーカス移動を妨げない。
- 理由：現在の追加フォームと詳細パネルはEscで親全体を閉じるため、内側のカレンダーとの調整が必要である。
- 代替案：Escのwindowリスナーを単に追加する方式では、既存の取消も同時に発火するため採用しない。
- 配置と依存：カレンダーが処理したキーを`preventDefault`と伝播制御で消費し、親のフォームとパネルも処理済みのキーを尊重する。
  React Portal上のイベントも親コンポーネントへ伝播する前提で確認する。
  カレンダーが閉じているときのStory追加のEscと詳細パネルのEscは従来の動作を維持する。
- データと日付：開閉、月移動、フォーカス移動では保存要求を送らない。
  カレンダーの取消は編集中の値と保存済みデータを変更しない。

### D-04 - 狭い表示面と実Webviewを検証対象にする

- 対象：REQ-022-S05、REQ-022-S08、REQ-022-S09、REQ-027-S03、REQ-027-S04。
- 選択：既存の`PointSelector`や`DeleteDialog`と同様に、カレンダーを`document.body`のPortalへ描画する。
  期限トリガーの位置を基準に、上下の空きとWebviewの幅に応じて配置し、画面内に収める。
  色、枠、選択状態、フォーカスはVS Codeのテーマ変数を利用する。
- 理由：詳細パネルには`overflow: auto`があり、追加欄にも位置と幅の指定があるため、子要素の単純な絶対配置では切れる可能性がある。
- 代替案：固定幅と固定座標だけで表示する方式は、幅240pxの一覧や画面端を保証できない。
- 配置と依存：共通DatePickerの位置調整と`app/style.css`の専用クラスで制御する。
  非表示date入力の専用CSSは不要となるため整理する。
  既存の削除確認やポイント選択の装飾へ変更を波及させない。
- データと日付：外部サービス、CSPの緩和、ファイルへの直接アクセスを追加しない。
  祝日の強調や負荷計算などは今回のカレンダーへ追加しない。

## Traceability

以下は実装と検証の予定であり、実績は[台帳](../../traceability.md#event期限選択の改修計画)へ記録する。

| 要件ID | シナリオID | 設計節 | 実装予定箇所 | 検証方法とテスト予定 |
| --- | --- | --- | --- | --- |
| REQ-022 | REQ-022-S01 | [D-01](#d-01---webview内で共通datepickerを描画する)、[D-02](#d-02---直接入力と親フォームの検証を維持する) | InlineAdd、既存の保存経路 | `req-022-s01.test.ts`、カレンダー選択後の追加 |
| REQ-022 | REQ-022-S02 | [D-03](#d-03---カレンダーの操作と取消を親へ伝播させない) | InlineAddのEsc処理 | `req-022-s02.test.ts`の回帰 |
| REQ-022 | REQ-022-S03 | [D-02](#d-02---直接入力と親フォームの検証を維持する) | InlineAddの保存結果処理 | `regression-inline-add.test.ts`、Eventの入力保持 |
| REQ-022 | REQ-022-S04 | [D-01](#d-01---webview内で共通datepickerを描画する) | 既存Project追加 | `req-022-s04.test.ts`の回帰 |
| REQ-022 | REQ-022-S05 | [D-01](#d-01---webview内で共通datepickerを描画する)、[D-02](#d-02---直接入力と親フォームの検証を維持する) | DatePicker、両レイアウト | `tests/hierarchy-operations/event-date-picker.test.tsx`、APIなし・例外 |
| REQ-022 | REQ-022-S06 | [D-03](#d-03---カレンダーの操作と取消を親へ伝播させない) | DatePicker、フォーム | 同上、キー操作、親取消と誤送信の防止 |
| REQ-022 | REQ-022-S07 | [D-02](#d-02---直接入力と親フォームの検証を維持する) | InlineAdd、期限欄の検証 | 同上、未入力と不正日付 |
| REQ-022 | REQ-022-S08 | [D-01](#d-01---webview内で共通datepickerを描画する)、[D-02](#d-02---直接入力と親フォームの検証を維持する) | カレンダーの日付処理 | `tests/shared-ui/date-picker.test.tsx`、年境界、うるう日、端末TZ |
| REQ-022 | REQ-022-S09 | [D-04](#d-04---狭い表示面と実webviewを検証対象にする) | DatePicker、専用CSS | Playwright、両テーマと幅240pxの画像 |
| REQ-027 | REQ-027-S01 | [D-01](#d-01---webview内で共通datepickerを描画する)、[D-02](#d-02---直接入力と親フォームの検証を維持する) | DetailPanel、既存の編集保存 | `tests/detail-panel/req-027-s01.test.ts`の回帰 |
| REQ-027 | REQ-027-S02 | [D-01](#d-01---webview内で共通datepickerを描画する) | 既存Project色編集 | `tests/detail-panel/req-027-s02.test.ts`の回帰 |
| REQ-027 | REQ-027-S03 | [D-01](#d-01---webview内で共通datepickerを描画する)、[D-02](#d-02---直接入力と親フォームの検証を維持する)、[D-04](#d-04---狭い表示面と実webviewを検証対象にする) | DatePicker、DetailPanel | `tests/detail-panel/event-date-picker.test.tsx`、選択・保存と直接入力 |
| REQ-027 | REQ-027-S04 | [D-03](#d-03---カレンダーの操作と取消を親へ伝播させない) | DatePicker、パネルのEsc処理 | 同上、取消後の値とパネルの保持 |

## Verification Plan

- 不具合の再現：実装を変える前に、隔離したVS Code安定版のEVENT一覧で名前とProjectを指定し、「期限を選ぶ」を押す。
  カレンダーの有無、例外がある場合はその内容、追加できない状態を証跡へ記録する。
  通常ブラウザーで開くだけの確認を、実Webviewでの再現の代わりにしない。
- 部品とフォーム：`showPicker`を未定義にする場合と`SecurityError`を投げる場合の両方を用意する。
  API呼び出しのモック検証だけで終えず、表示されたカレンダーの日付ボタンを押し、追加・保存へ届く日付と送信回数を確認する。
  既存の`tests/event-list-filtering/ui-refinement.test.ts`を同じ観測内容へ改める。
- 境界：年をまたぐ月移動、`2028-02-29`、不正な`2026-02-30`、日本時間の日付境界、直接入力、休日・過去日の選択を確認する。
  ブラウザ検証ではAsia/TokyoとAmerica/Los_Angelesを使い、選択日が保存要求と一致することを確認する。
- 操作：両レイアウトと詳細編集で、ボタン、Tab、矢印、Enter、Space、Esc、枠外クリックを確認する。
  カレンダー操作だけの保存要求が0件であることと、親フォームやパネルが維持されることを確認する。
- 画面：`scripts/verify-event-date-picker.mjs`を用意し、通常レイアウト用の描画入口、EVENT一覧、詳細パネルで実ビルドのカレンダーを操作する。
  両テーマ、幅240pxの一覧、画面端、スクロール後の位置、フォーカス表示を確認し、`artifacts/event-date-picker/`へ画像と結果を保存する。
- VS Code実画面：隔離した検証用YAMLに対し、EVENT一覧からカレンダーで選んだ日付のEventを追加する。
  同じEventをボードの詳細編集で別の日付へ変更し、YAML、タイムライン、EVENT一覧の反映を確認する。
  取消と失敗後の入力保持も記録する。
  通常レイアウトは現行の製品導線にないため、部品とブラウザの検証結果を区別して残す。
- 非機能：新規の非機能要件は採番しない。
  既存のNREQ-003に沿ったテーマ追従と、NREQ-001に沿った外部通信なしの操作を維持する。
  性能計算の変更はないため、新しい性能測定は対象外である。
- 全体検証：`corepack pnpm test`、`corepack pnpm typecheck`、`corepack pnpm check`、`corepack pnpm check:fsd`、`corepack pnpm build`、`openspec validate fix-event-date-picker --strict`、`git diff --check`を実行する。
  日付の追加と編集の既存保存テストも含め、結果と環境を台帳へ記録する。

## Risks / Trade-offs

| 対象IDまたは設計節 | リスクや制約 | 対処と検証 |
| --- | --- | --- |
| D-01 | 実機の直接原因は未確定 | 実装前に再現証跡、API非依存の方式 |
| D-02 | date入力の変更による直接入力の退行 | 実在日付の検証、直接入力から保存まで確認 |
| D-03 | Portalのキー操作が親へ伝播 | 親の取消と保存要求の回数を確認 |
| D-04 | 狭い一覧、詳細パネルでの切れ | Portalと位置調整、実ビルドの画像確認 |
| D-01〜D-04 | 通常レイアウトが未使用 | 専用の描画入口で両レイアウトを検証 |

## Migration Plan

YAMLとVS Code設定の移行は不要である。
既存Eventの期限をそのままDatePickerの値へ渡す。
両READMEのカレンダーの手順と画面例を共通部品の表示へ更新する。
失敗時の入力保持とデータ保全を確認してから既存のpicker呼び出しと専用CSSを除去する。
問題があれば今回のUI変更を戻せるが、旧方式には報告された制約が残るため、その状態を解決済みとは扱わない。

## Open Questions

なし。
実機の例外の採取は具体的な再現作業であり、共通DatePickerの方式や横展開範囲を決めるための未決事項ではない。
