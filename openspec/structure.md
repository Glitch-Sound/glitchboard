# GlitchBoard - Structure

## 配置方針

ルートはpnpmワークスペースとし、実行境界に合わせて3パッケージを置く。\
以下は初期の配置方針であり、実装時の細部は各OpenSpec変更の設計で確定する。

```text
glitchboard/
  openspec/
    config.yaml
    product.md
    tech.md
    structure.md
    traceability.md
    specs/
    changes/
    schemas/
      ears-bdd/
        schema.yaml
        templates/
  packages/
    shared/          # スキーマ、型、日付・負荷計算
    extension/       # VS Codeの入口、YAML、監視、メッセージ
    webview/         # ボードとEVENT一覧のReact画面
  package.json
  pnpm-workspace.yaml
  pnpm-lock.yaml
  biome.json
  steiger.config.ts
  lefthook.yml
```

`packages/webview`の内部はFSD v2.1に従い、`app`、`pages`、`widgets`、`features`、`entities`、`shared`から必要な層だけを使う。\
ボードとEVENT一覧は`pages`または入口に対応させ、再利用する表示・操作は責務に応じて下位層へ置く。\
`packages/shared`とWebview内の`shared`は別物である。\
FSDのルールはWebview内に適用し、Extensionとワークスペース共通の計算パッケージには適用しない。

## 依存方向

```text
packages/extension ──> packages/shared <── packages/webview
        │                                  ▲
        └──── 検証済みメッセージ通信 ────────┘
```

ExtensionとWebviewは互いの実装を直接importしない。\
両者の通信型と検証スキーマは`packages/shared`に置く。\
計算ロジックは共有パッケージに集め、画面とExtensionで別々の式を持たない。\
WebviewはYAMLやVS Code APIへ直接依存しない。\
ExtensionはReactとDOMへ依存しない。

## 管理データの構造

ソースコードのリポジトリとは別に指定できる、管理専用Gitリポジトリを使う。

```text
glitchboard-data/
  manage.yaml
  projects/
    0001_<name>.yaml
    0002_<name>.yaml
```

`manage.yaml`からProjectファイルへの参照は相対パスとする。\
ファイル名の4桁番号は自動採番し、名前部分はProject名に由来する。\
ファイル名に使えない文字や名称変更時の扱いは、永続化機能の仕様で決める。

## 命名と成果物

- OpenSpecの変更名と仕様ディレクトリは短い英語のkebab-caseとする。
- 要件IDとシナリオIDは[config.yaml](config.yaml)の形式を使う。
- 製品の決定は[product.md](product.md)、技術的な共通方針は[tech.md](tech.md)、実装と検証の実績は[traceability.md](traceability.md)へ記録する。
- 個別機能の要件本文は`openspec/specs/<capability>/spec.md`、進行中の差分は`openspec/changes/<change>/specs/<capability>/spec.md`へ置く。
- 正式仕様の役割と読み順は[specs/README.md](specs/README.md)にまとめる。

## 開発成果物

指定テンプレートの共通ファイルと ears-bdd を使用する。\
旧リポジトリのアーカイブと schema は引き継がない。\
今回の変更記録は changes/、現行要件は specs/、現在の結果は docs/replacement-report.md へ置く。

## 利用者向け文書と配布

ルートの README.md は利用者向けの正本とし、開発手順はルートの DEVELOPMENT.md に分ける。\
配布用の packages/extension/README.md は docs:prepare で開発案内を除いた利用者向け部分から生成し、画像と原寸リンクを manifest の版の公開タグの HTTPS URL へ変換する。\
変更履歴の正本はルートの CHANGELOG.md とし、配布用へ同期する。\
サンプルの正本は examples/readme-guide、実画面の画像は packages/extension/media/readme に置く。\
配布用にもサンプルを同期し、過去の検証用 artifacts は VSIX に含めない。\
撮影条件と公開説明の調査、文書とパッケージの検証結果は artifacts/readme と docs/readme-report.md に記録する。
