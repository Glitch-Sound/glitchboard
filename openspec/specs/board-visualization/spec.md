# board-visualization Specification

## Purpose

ボードとタイムラインは、個人が複数Projectの作業をVS Codeで管理する際に、Project横断の期限、負荷、進捗を一画面で把握できるようにする。
この機能は管理対象の状態と画面の振る舞いを一貫して扱う。

## Requirements

### Requirement: REQ-015 - 表示期間

WHEN 表示期間を切り替えたとき、GlitchBoardは SHALL 3日を今日から3暦日、1週間を今日から7暦日、月を当月1日から末日として表示する。

#### Scenario: REQ-015-S01 - 月末

- **GIVEN** 2026-11-03を今日とする。
- **WHEN** 月を選ぶ。
- **THEN** 11月1日から30日までの列を表示する。

### Requirement: REQ-016 - Project別の期限タイムライン

WHILE ボードを表示するとき、GlitchBoardは SHALL Projectごとの行と日付列を示し、期限日のEventをProject色の◆で示す。
今日と休日の列は異なる背景で示し、同じProject・同じ日付のEventは件数バッジ付きでまとめる。
月表示では選択中Eventだけにマーカーのラベルを出す。
期限接近、期限切れ、溢れのEventの◆には赤い光を付け、期限まで4～7暦日の注意は黄色で示す。

#### Scenario: REQ-016-S01 - 同日の複数Event

- **GIVEN** 同じProjectの同じ日に3件のEventがある。
- **WHEN** まとめた◆を選ぶ。
- **THEN** 3件の一覧が開き選んだEventが選択される。

#### Scenario: REQ-016-S02 - 月表示

- **GIVEN** 月表示で3件のEventがあり1件が選択中である。
- **WHEN** タイムラインを描く。
- **THEN** 選択中のEventだけにラベルが付く。

### Requirement: REQ-017 - ヘッダーと必要ペースグラフ

WHILE ボードを表示するとき、GlitchBoardは SHALL 実績ペース、直近10稼働日の完了ポイントの棒、期間負荷、危険件数と、日別必要ペースの階段状SVGを表示する。
グラフの数値ラベルは最大値の日だけに置き、実績ペースを黄色の破線、超過部分を赤い面で示す。
学習中は実績値、負荷値、実績線、赤塗りを隠す。

#### Scenario: REQ-017-S01 - 学習中の表示

- **GIVEN** 最初の完了から5稼働日目である。
- **WHEN** ボードを開く。
- **THEN** 学習中と必要ペースを示し実績値と負荷値と赤塗りは示さない。

#### Scenario: REQ-017-S02 - 負荷の超過

- **GIVEN** 実績ペース2pt/日で必要ペースが3ptの日がある。
- **WHEN** グラフを描く。
- **THEN** 2ptを超える部分だけ赤く塗り、その日の列も薄い赤になる。

### Requirement: REQ-018 - Event詳細エリア

WHEN Eventを選択したとき、GlitchBoardは SHALL Event要約、Story一覧、Task一覧を3列で表示し、未完了Taskを持つ最初のStoryを初期選択する。
Event要約には残り暦日または超過日数、算出可能な完了予測日、残りptと未見積件数、済pt/全ptを示す。
Storyには完了Task数とpt進捗バー、Taskには完了チェックとポイントバッジを示す。
残り日数が負なら「n日超過」とし、学習中または実績0pt/日の完了予測日は表示しない。

#### Scenario: REQ-018-S01 - 未完了Taskを選ぶ

- **GIVEN** 最初のStoryは完了済み、次のStoryに未完了Taskがある。
- **WHEN** Eventを選ぶ。
- **THEN** 次のStoryが選択され要約とTask一覧が表示される。

#### Scenario: REQ-018-S02 - 未完了Taskがない

- **GIVEN** Eventの全Taskが完了している。
- **WHEN** Eventを選ぶ。
- **THEN** 先頭Storyを選び、StoryがなければTask一覧を空にする。

### Requirement: NREQ-003 - テーマ追従

WHILE VS Codeのテーマが変わるとき、GlitchBoardは SHALL ダーク・ライトの両方で文字、Project色、ポイント色、危険色を判読可能に表示する。

#### Scenario: NREQ-003-S01 - ライトテーマ

- **GIVEN** VS Codeのライトテーマを使用している。
- **WHEN** ボードを開く。
- **THEN** VS Codeテーマ変数を使った背景と文字になり危険の赤と21ptの赤紫を区別できる。

