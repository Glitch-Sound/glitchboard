# Proposal

## Why

Event追加時に「期限を選ぶ」を押してもDatePickerが開かず、必須の期限を指定できないという利用者の報告がある。
現行のEVENT一覧は非表示のdate入力へ`showPicker()`を呼び出すだけであり、APIの欠如や例外に対応していない。
既存の画面テストはAPIの呼び出しをモックで確認した後、日付の変更を直接発火しているため、カレンダーを表示して選択する操作が保証されていない。
関連する日付入力にも同じ修正と検証を適用し、追加と編集のどちらからも期限を指定できる必要がある。

## What Changes

- 「期限を選ぶ」からWebview内のカレンダーを表示し、選択した期限でEventを追加できるようにする。
- 共通追加部品の通常レイアウトと、ボードの詳細パネルにあるEvent期限編集へ同じDatePickerを適用する。
- 月の移動、選択済みの日付、キーボード操作、カレンダーだけの取消、日付の直接入力を共通化する。
- カレンダーの日付選択だけでは保存せず、追加または保存の確定時に既存の通信経路で反映する。
- 未入力・不正日付、保存失敗、狭いEVENT一覧、両テーマ、実際のVS Code Webviewを受け入れ条件に含める。

## Scope

**In scope:**

- EVENT一覧で使用中の`InlineAdd`の`embedded`レイアウト。
- `InlineAdd`が公開している通常の`popover`レイアウトにあるEvent期限欄。
  現在の製品コードでEvent追加の利用元はEVENT一覧だけであり、新しいボード用追加導線は作らない。
- `DetailPanel`にあるEventの期限編集と、内側のカレンダー操作が親の取消に伝わる問題の予防。
- DatePicker表示、選択、追加・編集の保存要求、保存結果と両画面への反映の検証。

**Out of scope:**

- Projectの色選択、Project選択のselect、Task完了日の自動記録。
  今回の期限選択と異なる入力であり、調査した`showPicker()`の呼び出しも期限だけにある。
- 新しい日付項目、期限の自動設定、稼働日だけに選択を制限する機能、日付・負荷計算の変更。
  期限の既存の意味を維持する。
- VS Codeのセキュリティ制限の緩和と、マーケットプレイスへの公開。
  この変更は期限選択の修正に限定する。

## Requirements

| 要件ID | 要件名 | 操作 | 根拠となる方針文書の節 | 台帳 |
| --- | --- | --- | --- | --- |
| REQ-022 | インライン追加 | 変更 | [画面と操作](../../product.md#画面と操作) | [計画](../../traceability.md#event期限選択の改修計画) |
| REQ-027 | 詳細編集 | 変更 | [画面と操作](../../product.md#画面と操作)、[実行境界](../../tech.md#実行境界) | [計画](../../traceability.md#event期限選択の改修計画) |

既存の要件IDを維持し、新しい要件IDは採番しない。
既存シナリオを保持し、追加のシナリオ番号はREQ-022-S05以降とREQ-027-S03以降を使う。

## Capabilities

### New Capabilities

なし。

### Modified Capabilities

- `hierarchy-editing`：REQ-022に、両レイアウトのEvent追加で期限を選択して保存できる条件を追加する。
- `item-details`：REQ-027に、共通DatePickerによるEvent期限編集とカレンダーの取消条件を追加する。

## Examples

| 要件ID | 観点 | 状態と入力 | 契機 | 観測する結果 |
| --- | --- | --- | --- | --- |
| REQ-022 | 正常・異常 | 追加欄、APIなし・例外 | 期限ボタン | [S05](specs/hierarchy-editing/spec.md#scenario-req-022-s05---datepickerからeventを追加) |
| REQ-022 | 境界 | 入力済みの追加欄 | キーボード・枠外操作 | [S06](specs/hierarchy-editing/spec.md#scenario-req-022-s06---カレンダーの操作と取消) |
| REQ-022 | 異常 | 期限なし・不正日付 | 追加の確定 | [S07](specs/hierarchy-editing/spec.md#scenario-req-022-s07---期限の未入力と不正日付) |
| REQ-022 | 境界 | 月境界・うるう日・日本時間 | 日付選択 | [S08](specs/hierarchy-editing/spec.md#scenario-req-022-s08---月移動と暦日の保持) |
| REQ-022 | 境界 | 両テーマ・狭い一覧 | カレンダーを開く | [S09](specs/hierarchy-editing/spec.md#scenario-req-022-s09---両テーマと狭い表示面) |
| REQ-027 | 正常 | 編集中のEvent | 期限の選択と保存 | [S03](specs/item-details/spec.md#scenario-req-027-s03---期限編集への横展開) |
| REQ-027 | 境界 | 詳細パネル内のカレンダー | Esc・枠外操作 | [S04](specs/item-details/spec.md#scenario-req-027-s04---期限編集のカレンダーだけを閉じる) |

既存の追加、保存失敗、Project色、期限変更、色変更の受け入れ例も差分仕様と設計で追跡する。

## Impact

- 実装と配置：Webviewの共通DatePicker、`InlineAdd`、`DetailPanel`、関連CSSと画面テストが対象である。
- 互換性とデータ：期限は従来の`YYYY-MM-DD`を維持する。
  `addEvent`と`editItem`、Project YAML、`manage.yaml`、稼働日、祝日、学習中、負荷配分の定義は変更しない。
- 依存関係と文書：Reactと既存の日付処理で実現し、新しい外部サービスは使わない。
  実装時に両READMEの日付選択手順と画面例を更新する。
  機能の分担と読み順は変わらないため、`specs/README.md`の構成変更は不要である。

## Open Questions

なし。
横展開は同じEvent期限の入力箇所へ適用する前提である。
実機で発生した例外名は未採取であるが、方式の選択を妨げない。
実装開始時に、現在の操作でカレンダーが表示されない証跡を取得する。

## Readiness

- 計画の状態：合意済み。
- 合意の根拠：2026-11-11の利用者の`openspec-apply-change`指定により、本計画の実装を開始した。
- 実装を妨げる未決事項：なし。
