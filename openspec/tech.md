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
Gitコミット時はルートの`lefthook.yml`の`pre-commit`でBiomeの`check`、`tsc`による型検査、Steigerと公式FSDプラグインによるWebview全体の検査を実行する。\
テストの実行範囲は変更の性質に応じて決める。\
Biomeは型検査の代わりにしない。
