# 差分仕様

## MODIFIED Requirements

### Requirement: REQ-018 - Event詳細エリア

WHEN Eventを選択したとき、GlitchBoardは SHALL Event要約、Story一覧、Task一覧を3列で表示し、未完了の直接 Task があれば直接 Task を、なければ未完了 Task を持つ最初の Story を初期選択する。\
ボードを開いたときは期限が近い順で最初の危険な未完了Eventを選び、なければ期限が最も近いEventを選ぶ。\
Story がない Event は「EventのTask」を選び、Story 作成なしで Task を追加できる案内を表示する。\
Event要約には残り暦日または超過日数、算出可能な完了予測日、残りptと未見積件数、済pt/全ptを示す。\
Storyには完了Task数とpt進捗バー、Taskには完了チェックとポイントバッジを示す。\
残り日数が負なら「n日超過」とし、学習中または実績0pt/日の完了予測日は表示しない。
期限接近、期限切れ、溢れのいずれかに当てはまるEventでは残り日数と期限超過の完了予測だけを赤で示す。

#### Scenario: REQ-018-S01 - 未完了Taskを選ぶ

- **GIVEN** 最初のStoryは完了済み、次のStoryに未完了Taskがある。
- **WHEN** Eventを選ぶ。
- **THEN** 次のStoryが選択され要約とTask一覧が表示される。

#### Scenario: REQ-018-S02 - 未完了Taskがない

- **GIVEN** Eventの全Taskが完了している。
- **WHEN** Eventを選ぶ。
- **THEN** 直接 Task があれば直接 Task を選び、なければ先頭 Story を選ぶ。
- **AND** 両方なければ直接 Task の追加を案内する。

#### Scenario: REQ-018-S04 - 初期選択

- **GIVEN** 期限切れの未完了Eventと、より後の期限を持つEventがある。
- **WHEN** ボードを開く。
- **THEN** 期限切れのEventを選択して詳細を表示する。

#### Scenario: REQ-018-S03 - 危険なEventの要約

- **GIVEN** Eventの完了予測日が期限より後である。
- **WHEN** Event詳細を表示する。
- **THEN** 残り日数と期限超過の完了予測を赤で示し、タイトルと他の数値は通常色に保つ。
