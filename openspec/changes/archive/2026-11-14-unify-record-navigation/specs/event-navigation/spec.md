# 差分仕様

## MODIFIED Requirements

### Requirement: REQ-021 - Eventへの移動

WHEN EVENT一覧の行を選んだとき、GlitchBoardは SHALL ボードを開いて同じEventを選択し、該当Eventの詳細エリアを表示する。\
各行には共通の詳細ボタンを設け、詳細操作では対象の詳細も開かなければならない。

#### Scenario: REQ-021-S01 - サイドバーから移動

- **GIVEN** ボードが閉じており一覧にEventがある。
- **WHEN** そのEvent行を選ぶ。
- **THEN** ボードのタブが開き対象Eventが選択される。

#### Scenario: REQ-021-S02 - サイドバーの詳細

- **GIVEN** EVENT 一覧に Event がある。
- **WHEN** 行の詳細ボタンを押す。
- **THEN** 対象の Event をメインパネルで選択し、その詳細を開く。\
  選択要求を重複して送らず、編集中の場合は未保存確認を通す。
