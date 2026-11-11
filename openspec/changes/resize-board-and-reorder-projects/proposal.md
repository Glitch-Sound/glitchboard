# Proposal

## Why

複数Projectの期限を確認する際、タイムラインの表示領域と行の高さが固定されているため、一度に見えるProjectが少ない。
利用者が確認したいProjectを上へ移動できるようにし、限られた画面で一覧を使いやすくする。

## What Changes

- タイムラインと詳細エリアの高さを境界のドラッグで調整できるようにする。
- 初期の高さ比率を上部と下部で3対2にする。
- Project行を低くして表示件数を増やす。
- Projectをドラッグで並べ替え、表示順を保存する。

## Scope

**In scope:**

- ボードの上下の高さ調整、Project行の密度、Projectの表示順。
- 高さ調整と並べ替えのキーボード操作。
- 保存後の再読込、非表示Projectの位置とYAMLコメントの保持。

**Out of scope:**

- EVENT一覧そのものの行高と並べ替え。
  今回のProject一覧はボードのタイムライン左列を指す。
- Event、Story、Taskの並べ替えと詳細エリア内の列幅調整。
  利用者の3点の改修には含まれない。
- 高さ比率の永続化。
  新規表示時の初期比率は3対2とする。
- 負荷分析、稼働日、祝日、学習中、ポイントの計算式。
  表示領域と表示順だけを扱う。

## Requirements

| 要件ID | 要件名 | 操作 | 根拠となる方針文書の節 | 台帳 |
| --- | --- | --- | --- | --- |
| REQ-016 | Project別の期限タイムライン | 変更 | [画面と操作](../../product.md#画面と操作) | [台帳](../../traceability.md) |
| REQ-031 | ボードの上下高さ調整 | 追加 | [画面と操作](../../product.md#画面と操作) | [台帳](../../traceability.md) |
| REQ-032 | Projectの表示順変更 | 追加 | [画面と操作](../../product.md#画面と操作)、[データ保存](../../tech.md#データ保存) | [台帳](../../traceability.md) |

REQ-030は正式仕様に存在するため再利用せず、最大番号の次からREQ-031とREQ-032を予約する。

## Capabilities

### New Capabilities

なし。
既存のボード表示機能へ追加する。

### Modified Capabilities

- `board-visualization`: REQ-016の行高と、REQ-031の上下高さ調整、REQ-032のProject表示順変更を扱う。

## Examples

| 要件ID | 観点 | 状態と入力 | 契機 | 観測する結果 |
| --- | --- | --- | --- | --- |
| REQ-016 | 正常 | 3件のProject | ボード表示 | [S05](specs/board-visualization/spec.md#scenario-req-016-s05---project行の高さ) |
| REQ-031 | 正常 | 新規のボード | 初回表示 | [S01](specs/board-visualization/spec.md#scenario-req-031-s01---初期比率) |
| REQ-031 | 正常 | 選択Eventの詳細がある | 境界を下へ移動 | [S02](specs/board-visualization/spec.md#scenario-req-031-s02---ドラッグによる高さ変更) |
| REQ-031 | 境界 | ボード内の高さが532px | 境界を上端へ移動 | [S03](specs/board-visualization/spec.md#scenario-req-031-s03---領域の最小高さ) |
| REQ-031 | 正常 | 初期比率から変更済み | キー操作と初期化 | [S04](specs/board-visualization/spec.md#scenario-req-031-s04---キーボード操作と初期化) |
| REQ-031 | 境界 | 表示件数が領域を超える | 画面サイズを変更 | [S05](specs/board-visualization/spec.md#scenario-req-031-s05---多数projectと画面サイズ変更) |
| REQ-032 | 正常 | A、B、Cの順 | Cの上半分へAを移動 | [S01](specs/board-visualization/spec.md#scenario-req-032-s01---行の前へ移動) |
| REQ-032 | 正常 | A、B、Cの順 | Cの下半分へAを移動 | [S02](specs/board-visualization/spec.md#scenario-req-032-s02---行の後へ移動) |
| REQ-032 | 境界 | 非表示Projectとコメントがある | 並べ替え後に再読込 | [S03](specs/board-visualization/spec.md#scenario-req-032-s03---順序の保存とデータ保全) |
| REQ-032 | 異常 | 外部データまたは古い対象 | ドロップや取消 | [S04](specs/board-visualization/spec.md#scenario-req-032-s04---取消と無効な対象) |
| REQ-032 | 異常 | 保存に失敗する | 移動を要求 | [S05](specs/board-visualization/spec.md#scenario-req-032-s05---保存失敗後の再操作) |
| REQ-032 | 正常 | Bのハンドルにフォーカス | 上下キーを押す | [S06](specs/board-visualization/spec.md#scenario-req-032-s06---キーボードによる移動) |

## Impact

- 実装と配置: Webviewのボードページ、Timeline、CSS、共有操作スキーマ、Extensionのセッションと管理ファイル保存処理。
- 互換性とデータ: `manage.yaml`の既存`projects`配列の順序を使う。
  新規フィールドや移行処理は追加しない。
  Projectファイル名と配下のデータは維持する。
- 依存関係と文書: 依存パッケージは追加しない。
  差分仕様、設計、タスク、台帳と利用手順を整備する。
  既存仕様の役割や読み順の変更はなく、仕様案内の構成変更は不要である。

## Open Questions

実装を妨げる未決事項はなし。
行高44px、通常画面での各領域の最小高さ80px、境界の幅12px、順序の保存、補助キー操作は、利用者の目的を具体化した実装上の判断として記録する。
これらの詳細について事前の利用者レビューを実施した事実はない。

## Readiness

- 計画の状態: 合意済み。
- 合意の根拠: 2026-11-11の利用者の改修1から改修3の指示は、高さ調整、初期比率3対2、行高の縮小、ドラッグによるProject移動を明示している。
  同日の追加発言はOpenSpec経由での作業を期待していたことを示す。
  2026-11-11の「この変更をapplyして」という指示を受け、本計画の適用へ合意した。
- 実装を妨げる未決事項: なし。
  利用者が指定していない細部は上記の判断として区別する。

この変更は実装とテストを先行させた後に作成した。
事前の提案、シナリオ合意、受け入れテストの失敗確認を行った履歴としては扱わない。
先行実装の観測結果と、OpenSpecとして残る照合作業は[台帳](../../traceability.md#ボードの高さとproject表示順の改修計画)へ分けて記録する。
