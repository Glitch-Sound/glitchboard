# event-navigation Specification

## Purpose

EVENT一覧と抽出は、個人が複数Projectの作業をVS Codeで管理する際に、期限と対象Projectをサイドバーで絞り込み、Eventへすぐ移動できるようにする。\
この機能は管理対象の状態と画面の振る舞いを一貫して扱う。

## Requirements

### Requirement: REQ-019 - 期限順とグループ

WHILE EVENT一覧を表示するとき、GlitchBoardは SHALL 未完了Eventを期限切れ、今日から日曜まで、以後に分けて期限順に表示し、すべて条件では完了済みも別グループへ表示する。\
Eventは配下に1件以上のTaskがあり全Taskが完了したとき完了済みとする。\
各行にEvent名、Project名、残り暦日または超過日数、期限日を示し、危険なEventの文字を赤くする。
危険判定にはボードと同じ稼働日設定、実績ペース、期限判定を用いる。

#### Scenario: REQ-019-S01 - 日曜の境界

- **GIVEN** 今日が火曜で日曜期限と翌月曜期限のEventがある。
- **WHEN** 一覧を開く。
- **THEN** 前者は今週、後者は今後に入る。

#### Scenario: REQ-019-S02 - 完了済み

- **GIVEN** 完了済みEventが1件ある。
- **WHEN** 対象をすべてへ変える。
- **THEN** 完了済みグループに表示される。

#### Scenario: REQ-019-S03 - 危険なEventの表示

- **GIVEN** 期限切れの未完了Eventがある。
- **WHEN** EVENT一覧を開く。
- **THEN** ボードと同じ危険判定により、そのEventの文字が赤くなる。

### Requirement: REQ-020 - 抽出条件とProject切り替え

WHEN 漏斗から抽出条件を変えたとき、GlitchBoardは SHALL 対象と読込Projectを反映し、条件と表示Event件数を見出しの下に示し、初期状態から変更した条件数を漏斗バッジに示す。\
対象「未完了 + 今後」は期限切れを含む全未完了Eventとし、初期値もこの条件とする。\
読込Projectの選択は`manage.yaml`に保存する。\
読込を外したProjectも、抽出条件にはProjectファイルの名前を表示する。\
危険のみの抽出は設けない。

#### Scenario: REQ-020-S01 - 期限切れの包含

- **GIVEN** 期限切れ未完了Eventが1件ある。
- **WHEN** 対象を未完了 + 今後にする。
- **THEN** 期限切れ未完了グループに表示される。

#### Scenario: REQ-020-S02 - 読込切り替え

- **GIVEN** Project AとBが読込中である。
- **WHEN** Bを外す。
- **THEN** BのEventが消えmanage.yamlのloadがfalseになる。

#### Scenario: REQ-020-S03 - 読込を外したProject名

- **GIVEN** loadがfalseのProjectファイルに名前「B」が保存されている。
- **WHEN** 抽出条件を開く。
- **THEN** ファイルの場所ではなく「B」を表示する。

### Requirement: REQ-021 - Eventへの移動

WHEN EVENT一覧の行を選んだとき、GlitchBoardは SHALL ボードを開いて同じEventを選択し、該当Eventの詳細エリアを表示する。

#### Scenario: REQ-021-S01 - サイドバーから移動

- **GIVEN** ボードが閉じており一覧にEventがある。
- **WHEN** そのEvent行を選ぶ。
- **THEN** ボードのタブが開き対象Eventが選択される。
