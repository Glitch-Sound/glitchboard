# Design

## Context

- 提案: [proposal.md](proposal.md)。
- 対象仕様: [board-visualizationの差分](specs/board-visualization/spec.md)。
- 前提と制約: [実行境界](../../tech.md#実行境界)、[データ保存](../../tech.md#データ保存)、[配置方針](../../structure.md#配置方針)。
- 影響する境界: Webview、共有メッセージ、Extensionと管理YAML。

改修前は`board-content`が上下均等のGridで、Project行は65pxだった。
現在の作業ツリーには3対2の高さ調整、44pxの行高と並べ替えが実装されている。
以下はその方式を記録し、仕様との対応と残る検証を明示する設計である。
事前に設計とテストを確定した履歴としては扱わない。

## Goals / Non-Goals

**Goals:**

- REQ-016の通常行を低くし、既存のマーカーと詳細操作を維持する。
- REQ-031の高さ調整を画面内の操作として完結させる。
- REQ-032の順序を既存の保存形式と検証済みメッセージで保存する。
- 要件、シナリオ、実装、テストの対応を追跡できる状態にする。

**Non-Goals:**

- 高さ比率の保存、詳細3列の横幅調整、Eventと子階層の並べ替え。
  いずれも今回の指示の対象外である。
- 依存パッケージの追加と計算ロジックの変更。
  既存のDOM操作、ReactとYAMLライブラリで扱える。

## Decisions

### D-01 - 上下の分割と操作

- 対象: REQ-031-S01〜S05。
- 選択: `BoardSplit`をボードページ内へ置き、上下の領域を比率で配分するGridと12pxの境界で構成する。
  初期値は0.6で、ドラッグ開始時の比率とポインター移動量から更新する。
  Pointer Captureで領域外への移動を追跡し、解放、取消とCapture喪失で終了する。
  上下キーは5ポイントずつ調整し、Homeとダブルクリックは初期化する。
  下限は`min(80px, 境界を除く高さ×0.4)`とする。
- 理由: 件数や画面サイズが変わっても比率を使い、両領域に表示余地を残せる。
- 代替案: ピクセル固定は画面サイズの変更時に配分が崩れる。
  外部の分割ライブラリは今回の操作に対して依存追加が大きい。
- 配置と依存: [BoardSplit](../../../packages/webview/src/pages/board/ui/BoardSplit.tsx)をページの公開入口から[BoardApp](../../../packages/webview/src/app/board.tsx)へ公開する。
  Widget同士を依存させない。
- データと日付: 比率はReactの画面状態だけで保持する。
  YAML、日付、休日、学習中の扱いには影響しない。

### D-02 - 通常行の密度と既存表示

- 対象: REQ-016-S01〜S05。
- 選択: 通常行に`project-row`を付け、行高44pxと上下4pxの余白を指定する。
  Eventボタンをブロック表示にし、マーカーと名前の行間で通常行が膨らむことを防ぐ。
  名前の最大幅は移動ハンドルと詳細ボタンの分だけ確保する。
- 理由: 既存の65pxより多くのProjectを表示し、操作対象の大きさを保てる。
- 代替案: 全タイムラインの文字や日付見出しを縮小すると、行数以外の可読性へ影響する。
- 配置と依存: [Timeline](../../../packages/webview/src/widgets/timeline/ui/Timeline.tsx)と[CSS](../../../packages/webview/src/app/style.css)。
- データと日付: 既存REQ-016-S01〜S04の受け入れ条件は維持し、行高だけをS05として追加する。
  学習中、必要ペース、休日と期限切れの算出は変更しない。

### D-03 - 表示順の保存とエラー

- 対象: REQ-032-S01〜S06。
- 選択: ハンドルはHTMLのドラッグ操作を使い、移動中のProject IDを画面内で保持する。
  行の中央を境に前後を判定し、挿入位置を線で示す。
  内部の移動元がない外部ドロップは受け付けない。
  共有操作`moveProject`へ移動元、移動先のUUIDと`before`または`after`を渡す。
  Extensionで最新の読込対象から相対ファイルを解決し、管理YAMLの読込対象の位置だけを並べ替える。
  保存中は移動操作を無効にし、保存後のスナップショットを表示へ反映する。
- 理由: ファイル名や専用の順序フィールドを変えず、再読込後の順序を維持できる。
  楽観的な順序変更を行わないため、失敗時は直前の表示に留まる。
- 代替案: Webview内だけの並べ替えは再表示で失われる。
  全Project配列を画面から送る方式は、古い画面から最新の一覧を上書きしやすい。
- 配置と依存: [Timeline](../../../packages/webview/src/widgets/timeline/ui/Timeline.tsx)から[BoardApp](../../../packages/webview/src/app/board.tsx)のコールバック、既存操作結果処理、[共有スキーマ](../../../packages/shared/src/domain/messages.ts)、[セッション](../../../packages/extension/src/session.ts)、[管理保存](../../../packages/extension/src/storage/manage.ts)の順に処理する。
- データと日付: `yaml`のノードを移動してコメントを保持し、一時ファイルとrenameで保存する。
  非表示Projectの配列位置と`load`値、Projectファイルの内容を維持する。
  稼働日、未見積、学習中とタイムゾーンの定義は変えない。

### D-04 - 先行実装と受け入れ証跡の区別

- 対象: REQ-016、REQ-031、REQ-032の全シナリオ。
- 選択: 先行実装の観測結果を台帳へ残し、未検証の条件はapplyのタスクにする。
  新規実装箇所とテスト名には要件IDとシナリオIDを対応付ける。
  一時ディレクトリのブラウザー結果を恒久証跡へ移す手順も記録する。
- 理由: 149件のテスト成功とブラウザー確認だけを、全シナリオの受け入れ完了と誤認しないためである。
- 代替案: 先行実装の全タスクを自動で完了扱いにすると、保存失敗時の画面表示や実機操作が未確認のまま残る。
- 配置と依存: [台帳](../../traceability.md#ボードの高さとproject表示順の改修計画)、各受け入れテスト、`artifacts/board-layout/`を予定する。
- データと日付: 実装前の失敗確認は未実施と記録する。
  必要な追加テストは、以降のapplyで期待どおりに失敗することを確認してから修正する。

## Traceability

以下のパスはリポジトリルートからの相対パスである。
既存ファイルを使う場合も、全条件の確認が済んだことは意味しない。

| 要件ID | シナリオID | 設計節 | 実装予定箇所 | 検証方法とテスト予定 |
| --- | --- | --- | --- | --- |
| REQ-016 | REQ-016-S01 | [D-02](#d-02---通常行の密度と既存表示) | `packages/webview/src/widgets/timeline` | `tests/board-timeline/req-016-s01.test.ts`の複数Event |
| REQ-016 | REQ-016-S02 | [D-02](#d-02---通常行の密度と既存表示) | `packages/webview/src/widgets/timeline` | `tests/board-timeline/req-016-s02.test.ts`の月表示 |
| REQ-016 | REQ-016-S03 | [D-02](#d-02---通常行の密度と既存表示) | `packages/webview/src/widgets/timeline` | `tests/board-timeline/regression-labels.test.ts`の短期ラベル |
| REQ-016 | REQ-016-S04 | [D-02](#d-02---通常行の密度と既存表示) | `packages/webview/src/widgets/timeline` | `tests/board-timeline/req-016-s04.test.ts`の期限切れ |
| REQ-016 | REQ-016-S05 | [D-02](#d-02---通常行の密度と既存表示) | `packages/webview/src/app/style.css` | `scripts/verify-board-layout.mjs`の行高を3表示期間で測定 |
| REQ-031 | REQ-031-S01 | [D-01](#d-01---上下の分割と操作) | `packages/webview/src/pages/board/ui/BoardSplit.tsx` | `scripts/verify-board-layout.mjs`の初期比率 |
| REQ-031 | REQ-031-S02 | [D-01](#d-01---上下の分割と操作) | `packages/webview/src/pages/board/ui/BoardSplit.tsx` | 同スクリプトの実ドラッグ、選択維持と解放後の移動 |
| REQ-031 | REQ-031-S03 | [D-01](#d-01---上下の分割と操作) | `packages/webview/src/pages/board/ui/BoardSplit.tsx` | 同スクリプトの両端と極小画面の下限 |
| REQ-031 | REQ-031-S04 | [D-01](#d-01---上下の分割と操作) | `packages/webview/src/pages/board/ui/BoardSplit.tsx` | 同スクリプトの上下キー、Homeとダブルクリック |
| REQ-031 | REQ-031-S05 | [D-01](#d-01---上下の分割と操作) | `packages/webview/src/app/board.tsx`、`packages/webview/src/app/style.css` | 同スクリプトの多数行、画面サイズ変更、3列スクロール |
| REQ-032 | REQ-032-S01 | [D-03](#d-03---表示順の保存とエラー) | `packages/webview/src/widgets/timeline`、`packages/extension/src/session.ts` | `tests/board-timeline/project-reorder.test.tsx`の前方ドロップとブラウザーの実ドラッグ |
| REQ-032 | REQ-032-S02 | [D-03](#d-03---表示順の保存とエラー) | 同上 | 同テストの後方ドロップとブラウザーの選択維持 |
| REQ-032 | REQ-032-S03 | [D-03](#d-03---表示順の保存とエラー) | `packages/extension/src/storage/manage.ts` | `tests/data-persistence/project-order.test.ts`の再読込と保全 |
| REQ-032 | REQ-032-S04 | [D-03](#d-03---表示順の保存とエラー) | `packages/webview/src/widgets/timeline`、`packages/shared/src/domain/messages.ts` | 上記UIと保存テストの取消、外部、不正対象に同一行の条件を補う |
| REQ-032 | REQ-032-S05 | [D-03](#d-03---表示順の保存とエラー) | `packages/webview/src/app/board.tsx`、操作結果、保存境界 | 予定`tests/board-timeline/project-reorder-error.test.tsx`とVS Codeの実書込失敗 |
| REQ-032 | REQ-032-S06 | [D-03](#d-03---表示順の保存とエラー) | `packages/webview/src/widgets/timeline` | `tests/board-timeline/project-reorder.test.tsx`とブラウザーでキーによる上下移動 |

## Verification Plan

- 正常、境界、異常: 上表の全シナリオを照合する。
  行高は`getBoundingClientRect()`で測定し、3対2の比率は境界の高さを除いて計算する。
  ブラウザーの端数誤差は0.1px以内、比率は0.002以内とする。
  保存は一時YAMLへ行い、読込対象の順序、非表示の位置、設定、コメント、Projectファイル内容を比較する。
- 非機能要件: 新規採番はしない。
  既存NREQ-003に従い、両テーマで境界、挿入位置と操作対象を確認する。
- 手動確認: 隔離したVS Code安定版の検証用データで高さとProject順序を変更する。
  保存後の再表示と実際の書込失敗・復帰を確認し、`artifacts/board-layout/`に画面と実行環境を残す。
  既存の利用者データは使わない。
- 全体検証: `npm test`、`npm run typecheck`、`npm run check`、`npm run check:fsd`、`npm run build`、ブラウザースクリプト、`git diff --check`、変更のOpenSpec厳格検証を実施する。
  結果は[台帳](../../traceability.md)へ記録する。

## Risks / Trade-offs

| 対象IDまたは設計節 | リスクや制約 | 対処と検証 |
| --- | --- | --- |
| REQ-016 | 行高縮小でマーカーや名前が切れる | 3表示期間、期限切れ、複数Eventをブラウザーで確認 |
| REQ-031 | 境界外でドラッグが終わらない | Pointer Captureの解放、取消と最小高さを確認 |
| REQ-032 | 非表示項目やコメントの意図しない移動 | YAMLノードと読込対象の位置だけを変更し、保存テストで比較 |
| REQ-032 | ブラウザーとVS Code Webviewの操作差 | 実機確認を独立したタスクとして残す |
| D-04 | テスト名に新規IDがなく追跡できない | applyでIDを対応付けてから全シナリオを照合 |

## Migration Plan

データ移行は不要である。
既存の`projects`配列の順序をそのまま初期順とし、新たな設定やファイルは追加しない。
順序保存に失敗した場合は保存済みスナップショットを維持する。
利用手順の更新はルートとExtensionのREADMEへ同じ変更として反映する。
正式仕様への同期とアーカイブは、後続のワークフローで実施する。

## Open Questions

なし。
仕様の数値と補助操作の選択理由は[提案のReadiness](proposal.md#readiness)に記録する。
