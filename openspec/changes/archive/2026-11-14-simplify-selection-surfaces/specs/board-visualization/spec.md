## MODIFIED Requirements

### Requirement: REQ-030 - Event詳細の視覚表現

WHILE Event詳細を表示するとき、GlitchBoardは SHALL 要約、Story、Taskを枠で分け、各列を独立してスクロール可能にする。\
要約の済pt/全ptの下にProject色の進捗バーを示し、完了予測を月日と曜日で示す。期限内なら予測を緑で示す。\
Story は選択によって行全体の背景を変えず、選択枠を表示せず、実 Story の詳細ボタンの強調とキーボードフォーカスの識別を維持し、進捗バーを名前と件数の下に置く。\
Taskはチェック、名前、色付きポイント、操作ボタンの順に1行で示す。

#### Scenario: REQ-030-S01 - 期限内予測と進捗

- **GIVEN** Eventの期限が11月20日で、予測が11月16日、済13pt/全34ptである。
- **WHEN** Event詳細を表示する。
- **THEN** 「11/16(月)」の緑の予測とProject色の進捗バーを示す。

#### Scenario: REQ-030-S02 - Storyの選択色

- **GIVEN** 直接 Task の Taks と通常の Story をダークまたはライトで表示している。
- **WHEN** Story を選択する。
- **THEN** 操作ボタンの位置まで行全体の背景を未選択と同じに保ち、選択枠を出さず、進捗バーを名前の下に置く。
- **AND** 通常の Story の詳細ボタンの選択強調と、キーボードフォーカスの枠は維持する。
