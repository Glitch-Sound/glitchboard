# GlitchBoard - Technology

## 基本方針

TypeScriptとReactでVS Code拡張を作り、pnpmワークスペースの`shared`、`extension`、`webview`に分ける。\
製品データは管理専用GitリポジトリのYAMLファイルに保存し、DBと外部通信を使わない。\
対象はVS Code安定版と横長の画面である。\
数千Taskでも、操作から画面更新までおおむね0.5秒以内を目標とする。\
合格判定に使う環境、データ規模、測定区間、統計値は性能要件の変更で定義する。

## 技術スタック

| 技術 | 役割 |
| --- | --- |
| React + TypeScript | ボードとEVENT一覧のUI、拡張本体の実装 |
| Tailwind CSS | VS Codeの`--vscode-*`変数に沿ったスタイル |
| shadcn/ui、Radix UI、Lucide Icons | Popover、Slider、Sheet、Toggle Group、Context Menu、Alert Dialog、Tooltipなど |
| Zustand | 選択中のEvent、期間、抽出条件などの画面状態 |
| Zod | YAMLデータとExtension・Webview間メッセージの検証、型の共有 |
| React Hook Form | 詳細パネルの編集フォーム |
| date-fns | 日付表示と稼働日の計算 |
| `@holiday-jp/holiday_jp` | 日本の祝日判定 |
| `yaml` | コメントを保持するYAMLの読み書き |
| Vite | WebviewとExtensionのビルド |
| Vitest、React Testing Library | 計算ロジックと画面部品のテスト |
| Playwright | VS Codeとの通信を差し替えた画面単体の自動テスト |
| VS Code Extension API、`@types/vscode` | エディタのWebview、サイドバーのWebview View、ファイル監視、コマンド、ステータスバー |
| Biome、TypeScript Compiler | 静的解析・整形・インポート整理、型検査 |
| Steiger、FSDプラグイン | WebviewのFSD v2.1ルールの検査 |
| Lefthook | `pre-commit`の実行 |
| `@vscode/vsce` | 拡張のパッケージ化 |

必要ペースグラフはSVGで直接描き、グラフライブラリを追加しない。\
VS Code上でExtension本体を動かす統合テストが必要になった場合は`@vscode/test-electron`を用いる。\
依存バージョンは`pnpm-lock.yaml`で固定する。

## 実行境界

- `shared`はZodスキーマ、共有型、実績ペース・完了予測・必要ペースなどの純粋な計算を持つ。\
  VS Code API、DOM、ファイルシステムに依存しない。
- `extension`は設定された`manage.yaml`の解決、YAMLの読み書き、ファイル監視、VS CodeのビューとWebviewの生成、メッセージの仲介を担う。
- `webview`はボードとEVENT一覧のReact画面を持つ。\
  ファイルを直接読み書きせず、Extensionとの検証済みメッセージで操作する。
- メッセージと永続化対象は境界でZod検証する。\
  ファイル変更後は読み直しと再計算を行い、画面の状態に反映する。
- WebviewはVS Codeのテーマ変数に追従する。\
  ローカル資産は許可されたURIを使い、Content Security Policyを設定する。

## データ保存

拡張設定で`manage.yaml`の位置を指定する。\
`manage.yaml`には`settings.workdays_off`、`settings.public_holidays`、およびProjectごとの相対`file`と`load`を記録する。\
`load: false`のProjectは表示・集計・危険判定・実績ペースから除外する。\
Projectのファイル名は`4桁の番号_名前.yaml`とし、番号は追加時に自動採番する。\
Projectファイルは単独で内容が分かるように、Projectとその配下のEvent、Story、Taskを保持する。

| 階層 | 必須 | 任意 |
| --- | --- | --- |
| Project | `id`, `name`, `color` | `note` |
| Event | `id`, `name`, `due` | `note` |
| Story | `id`, `name` | `note` |
| Task | `id`, `name` | `points`, `doneAt`, `note` |

`points`は指定された7値だけを許可し、省略は未見積とする。\
`doneAt`の省略は未完了を表す。\
全階層の`note`は任意の文字列である。\
IDの採番範囲、YAML内の配列構造、無効なファイルの扱いは、該当するOpenSpec変更で決める。\
保存時は変更に関係しないコメントを維持し、物理削除した項目はファイルから取り除く。

## UI実装

WebviewはFSD v2.1に従い、ボードとEVENT一覧の2つの入口を持つ。\
Popoverはポイント選択、抽出条件、同日Event一覧に、Sliderは7段階のポイントに、Sheetは詳細パネルに使う。\
Toggle Groupは表示期間、Context Menuは削除、Alert Dialogは削除確認、Tooltipはボタン説明に使う。\
タイムラインの◆と必要ペースは、VS CodeのテーマとProject色、危険色の視認性を両立させる。

## 検証と開発基準

計算とYAMLの境界はVitestで、画面部品はReact Testing Libraryで、画面の主要な操作と表示はPlaywrightで確認する。\
PlaywrightではExtensionとのメッセージを差し替え、Extension固有の動作は必要に応じてVS Code統合テストで確認する。\
ダーク・ライト両テーマ、学習中、期限切れ、未見積、複数Projectの負荷配分を受け入れ条件に含める。\
Git コミット時は元版から継続する `lefthook.yml` の全体検証を実行する。\
テストの実行範囲は変更の性質に応じて決める。\
Biomeは型検査の代わりにしない。

## 保存モデル

Event.tasks は直接 Task、Event.stories は任意グループを保持する。\
isDefault と自動 Story は使用しない。\
全 Task の走査は共有関数へ集め、表示、残作業、実績ペースと削除の対象を一致させる。\
読込ではデータを移行または変更しない。\
旧ファイルの互換性を保証せず、現行スキーマを正とする。\
入力の取消、保存結果を待つ UI と同一 Event 更新時の下書き維持を共通方針とする。

## テスト方針

テスト名か直前コメントにシナリオ ID を記す。\
純粋計算と永続化は Vitest、操作の流れは React Testing Library、実ビルドは Playwright で確認する。\
`npm run check` は `check:product` の lint、型検査、FSD 検査、全テスト、ビルドの後に、仕様とトレースを検査して台帳を生成する。\
フックの実行内容も `npm run check` に統一する。


## 参照と接続

UUID の一意性は同一 Project ファイル内とする。\
操作対象は管理ファイルに登録された Project のファイル参照と項目 ID で特定し、曖昧な省略要求は拒否する。\
画面と計算の ID はその参照を含む表示用のキーへ投影し、保存された UUID は変更しない。\
管理ファイルはユーザー設定に保存し、yaml と yml を同じ監視対象とする。\
非読込 Project の概要が取れない場合はファイル名と利用不可の表示を使い、他の正常な Project は配信する。

## レコード操作

レコードの選択と詳細ボタンを区別し、開いている詳細だけを選択先へ追従させる。\
未保存の編集は移動の前に保存、破棄、キャンセルを確認し、失敗と検証エラーでは入力と元の対象を保持する。\
サイドバーは選択を先に確定せず、検証済みのナビゲーションをボードへ配送する。\
ボードの準備前は最新の要求を保留し、ready の応答後に配送する。\
Project ファイルと UUID の組を維持し、一覧、詳細、計算と保存の対象を一致させる。\
操作ボタンは全面選択ボタンの兄弟にし、ボタンの入れ子と二重発火を防ぐ。\
タイムライン寸法は YAML と分離した Webview 状態へ保存し、調整値は widgets/timeline/model/dimensions.ts の timelineDimensions を正とする。\
Task のポイント選択は shared の共通部品を使い、一覧と詳細の CSS 配色も一致させる。

追加の下書きにも入力開始時の Event と任意 Story を記録し、送信時の選択から追加先を求め直さない。\
行、名前、詳細と左右の移動は、詳細の編集確認、追加先が変わる下書きの確認、選択確定の順に通す。\
同じ追加先の選択では下書きを保ち、追加先が変わる場合は元の追加先へ追加、明示的な破棄、キャンセルを選ぶ。\
確認を取り消した時点で追加欄を消す処理を先行させず、複数の欄がある場合は成功した欄だけを閉じて再送の重複を防ぐ。

## 起動と設定案内

メニューとコマンドからの起動は最新の設定読込が完了するまで待ち、起動直前にも再読込して監視通知前の削除と復元を判定する。\
BoardSession の ready は正常と構文、権限、Project のエラーを含み、管理ファイルの不在だけを missing として区別する。\
未設定、missing、判定中は新しいメインを作らず、設定の操作ボタンは EVENT 一覧だけに置く。\
既存メインでは新しい接続の初期状態と不在通知で直前の表示を消さず、設定解除でも下書きを保持する。\
接続状態と最新のエラーだけを示し、設定解除後に古い欠落パスと読込エラーを表示し続けない。\
選択と作成の成功後は接続を確定して両画面を開く。\
外部の復元は既存表示へ反映し、閉じているメインへ自動でフォーカスを移さない。
