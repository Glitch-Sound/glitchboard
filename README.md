# GlitchBoard

GlitchBoardは、複数のProjectをひとつの画面で見渡せるVS Code拡張機能である。\
作業を **Project → Event → Story → Task** の順に整理し、期限と進み具合を確認できる。\
データは`manage.yaml`とProjectごとのYAMLファイルに保存する。

## 使い始める

1. VS Codeのアクティビティバーで **GlitchBoard** を開く。\
   サイドバーに「EVENT一覧」が表示される。
2. 初回は **「manage.yamlを選ぶ」** で既存の管理ファイルを指定するか、**「新しく作る」** で作成する。\
   VS Codeの設定`glitchboard.manageFile`に`manage.yaml`の絶対パスを指定することもできる。
3. コマンドパレットで **「GlitchBoardを開く」** を実行すると、エディタにボードが開く。
4. ボードでProjectを追加し、その中にEvent、Story、Taskを作成する。

管理ファイルは、現在VS Codeで開いている作業フォルダとは別の場所に置ける。\
空の管理ファイルを手で作る場合は、次の内容から始められる。

```yaml
settings:
  workdays_off: [sat, sun]
  public_holidays: true
projects: []
```

Projectを追加すると`projects/0001_名前.yaml`のようなファイルが作られ、その相対パスが`manage.yaml`に記録される。

## ボードの見方

画面例にはダークテーマとサンプルデータを使用している。\
上段に期間の指標とタイムライン、下段に選択したEventの詳細、Story一覧、Task一覧が並ぶ。

![上段にタイムライン、下段にEvent詳細・Story一覧・Task一覧を表示するボード全体](artifacts/readme-board-full.png)

### 期間と指標

![ボード上部の期間切り替えと指標](artifacts/readme-header.png)

**3日・1週間・月** を切り替えて、見たい期間の予定を確認できる。\
実績ペース、期間負荷、危険件数などは、現在の作業量と期限を把握するための目安となる。\
完了した作業が少ない間は、実績ペースに「学習中」と表示される。

### Projectとタイムライン

![Project列とEvent期限を示すタイムライン](artifacts/readme-timeline.png)

左のPROJECT列にはProjectが並び、横方向にはEventの期限が◆で表示される。\
期限切れのEventは専用の列でも確認できる。\
Eventを選ぶと、下段にそのEventの内容が表示される。\
PROJECT列の **＋** からProjectを追加できる。

![PROJECT列に収まるProject追加フォーム](artifacts/project-add-dark-timeline.png)

### Event詳細

![選択したEventの期限と進捗を示す詳細ブロック](artifacts/readme-event-summary.png)

選択したEventの期限、残り日数または超過日数、残りポイント、進捗を確認できる。\
見積もりに必要な情報がそろうと、完了予測も表示される。

### Story一覧

![選択したEventに属するStory一覧](artifacts/readme-story-list.png)

StoryはEvent内の作業をまとめる単位である。\
Storyを選ぶと、右隣にそのStoryのTaskが表示される。\
見出しの **＋** でStoryを追加できる。\
入力後はEnterで保存、Escで取り消す。

![Storyの追加フォーム](artifacts/story-add-dark-panel.png)

### Task一覧

![選択したStoryに属するTask一覧](artifacts/readme-task-list.png)

Taskのチェックで完了状態を切り替えられる。\
ポイントを設定すると、残り作業量や期間負荷の計算に反映される。\
見出しの **＋** でTaskを追加できる。\
入力後はEnterで保存、Escで取り消す。

![Taskの追加フォーム](artifacts/task-add-dark-panel.png)

## サイドバーのEVENT一覧

![期限別に並ぶサイドバーのEVENT一覧](artifacts/readme-event-list.png)

Eventは期限切れ、今週、今後、完了済みなどに分かれて表示される。\
Eventを選ぶとボードが開き、そのEventに移動する。\
上部のフィルターでは、表示対象とProjectを切り替えられる。

![EVENT一覧の表示対象とProjectを選ぶフィルター](artifacts/readme-event-filters.png)

**＋** でEventを追加する。\
Projectを選んで名前を入力し、**「期限を選ぶ」** を押すとカレンダーから日付を選べる。

![EVENT追加フォーム](artifacts/event-add-dark-updated.png)

![EVENTの期限を選ぶカレンダー](artifacts/event-add-datepicker-dark-updated.png)

## 項目を編集する

Project、Event、Story、Taskの詳細パネルから、名前、色、期限、補足、リンクなど、その項目に対応する情報を編集できる。\
Taskではポイントも変更できる。\
削除時は対象に含まれる子項目の件数を確認できる。

![Eventの詳細パネル](artifacts/readme-detail-panel.png)

変更は管理ファイルに保存される。\
保存や削除に失敗した場合は画面上部に理由が表示される。\
VS Codeのライトテーマとダークテーマの両方に対応している。

## リポジトリから試す

開発用に動かす場合は、VS Code 1.105以降とNode.js 24を用意し、リポジトリのルートで次を実行する。

```sh
corepack pnpm install --frozen-lockfile
corepack pnpm build
code --new-window --extensionDevelopmentPath="$PWD/packages/extension" .
```

開発用の確認コマンドは次のとおりである。

```sh
corepack pnpm test
corepack pnpm typecheck
corepack pnpm check
corepack pnpm check:fsd
```

製品の目的は[product.md](openspec/product.md)、仕様の読み順は[仕様の案内](openspec/specs/README.md)、要件と実装・テストの対応は[traceability.md](openspec/traceability.md)を参照する。
