# GlitchBoard

GlitchBoardは、1人で複数のProjectを管理するためのVS Code拡張機能である。\
Project、Event、Story、Taskの4階層で作業を整理し、期限、残りポイント、負荷、危険をボードとサイドバーで確認できる。\
管理データは指定した`manage.yaml`とProjectごとのYAMLファイルに保存する。

## 主な機能

- エディタのボードで、3日・1週間・月のタイムラインとProjectごとのEvent期限を表示する。
- 3日・1週間では全Event名、月表示では選択中のEvent名を期限の◆に表示する。
- ヘッダーで実績ペース、必要ペース、期間負荷、危険件数を確認する。
- サイドバーのEVENT一覧で期限順のEventを見て、表示対象とProjectを切り替える。
- 期限が危険なEventは一覧と詳細で赤く示し、Task未登録のEventも期限切れ判定に含める。
- ボードからProject、Event、Story、Taskを追加し、Taskのポイントと完了状態を変更する。
- 詳細パネルで名前、期限、色、補足、リンクを編集し、子孫件数を確認して削除する。
- VS Codeのライトテーマとダークテーマに追従する。
- 保存や削除に失敗した場合は画面上部に理由を表示し、追加の入力欄は保存成功後に閉じる。

## 利用を始める

このリポジトリから拡張機能を試すには、VS Code 1.105以降とNode.js 24を用意する。\
このリポジトリのルートで依存関係を取得し、拡張機能をビルドする。

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm build
```

VS Codeの`code`コマンドが使える環境では、リポジトリのルートから拡張機能開発ホストを開く。

```sh
code --new-window --extensionDevelopmentPath="$PWD/packages/extension" .
```

管理データ用のディレクトリを作り、次の内容で`manage.yaml`を置く。\
最初はProjectがなくてもよい。

```yaml
settings:
  workdays_off: [sat, sun]
  public_holidays: true
projects: []
```

VS Codeの設定`glitchboard.manageFile`に、その`manage.yaml`の絶対パスを指定する。\
未設定の場合はGlitchBoardの画面から既存の`manage.yaml`を選ぶか、新しく作ることもできる。\
設定先を変更するとVS Codeの再起動なしで新しい管理データに切り替わる。\
Projectを追加すると、`projects/0001_名前.yaml`の形式でProjectファイルが作られ、`manage.yaml`に相対パスが記録される。

## 基本操作

アクティビティバーの「GlitchBoard」でEVENT一覧を開く。\
コマンドパレットの「GlitchBoardを開く」でエディタにボードを開く。\
ボードの「Projectを追加」ボタンからProjectを追加し、Project内にEvent、Story、Taskを追加する。\
Eventには期限日を設定し、Taskには必要に応じてポイントを設定する。\
Taskのチェックを切り替えると完了状態と負荷の計算が更新される。\
月表示の期間負荷は今日以降の稼働日数で計算し、休日の今日に残る期限切れ作業は次の稼働日に割り当てる。\
画面を開いたまま日付が変わった場合も、今日に基づく表示と計算を更新する。\
EVENT一覧でEventを選ぶと、ボードでそのEventの詳細を開く。\
`manage.yaml`とProjectファイルは、VS Codeで開いている作業フォルダとは別の場所に置ける。\
管理データをGitで履歴管理する場合は、そのディレクトリを別のリポジトリにできる。

## 開発と仕様

```sh
corepack pnpm test
corepack pnpm typecheck
corepack pnpm check
corepack pnpm check:fsd
```

製品の目的は[product.md](openspec/product.md)、正式仕様の関係と読み順は[仕様の案内](openspec/specs/README.md)、要件と実装・テストの対応は[traceability.md](openspec/traceability.md)を参照する。
