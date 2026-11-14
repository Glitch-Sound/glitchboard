# 差分仕様

## ADDED Requirements

### Requirement: REQ-037 - ボード内の Event 追加と空状態

WHERE 読み込み済みの Project がある場合、GlitchBoard はボードから Event を追加できなければならない(SHALL)。\
選択中 Event の Project を追加先の初期値とし、選択がなければ最初の Project とする。\
保存後は作成した Event を選択する。\
WHEN データが空のとき、GlitchBoard は Project と Event のどちらを追加すればよいかを案内しなければならない(SHALL)。

#### Scenario: REQ-037-S01 - ボードから追加

- **GIVEN** 2番目の Project の Event を選んでいる。
- **WHEN** ボードの Event 追加を開く。
- **THEN** 2番目の Project が初期選択され、名前と有効な期限の保存によりその Project に追加し、作成した Event を選択する。

#### Scenario: REQ-037-S02 - 空状態

- **GIVEN** ボードに表示する Event がない。
- **WHEN** ボードを表示する。
- **THEN** Project がなければ Project 追加を、Project があれば Event 追加を案内する。

## MODIFIED Requirements

### Requirement: REQ-018 - Event詳細エリア

WHEN Eventを選択したとき、GlitchBoardは SHALL Event要約、Story一覧、Task一覧を3列で表示し、未完了Taskを持つ最初のStoryを初期選択する。\
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
- **THEN** 先頭Storyを選び、Story がなければ「EventのTask」を選び、Task の追加を案内する。

#### Scenario: REQ-018-S04 - 初期選択

- **GIVEN** 期限切れの未完了Eventと、より後の期限を持つEventがある。
- **WHEN** ボードを開く。
- **THEN** 期限切れのEventを選択して詳細を表示する。

#### Scenario: REQ-018-S03 - 危険なEventの要約

- **GIVEN** Eventの完了予測日が期限より後である。
- **WHEN** Event詳細を表示する。
- **THEN** 残り日数と期限超過の完了予測を赤で示し、タイトルと他の数値は通常色に保つ。

### Requirement: REQ-031 - ボードの上下高さ調整

WHEN タイムラインと詳細エリアの境界をドラッグしたとき、GlitchBoardは SHALL 上下の高さを連続して変更する。\
初期比率は境界を除いた上部と下部で3対2とする。\
各領域は原則80px以上とし、領域全体が小さい場合は境界を除いた高さの40%を下限とする。\
上下キーでも比率を変更でき、境界のダブルクリックまたはHomeキーで初期比率に戻す。\
件数が多い場合は領域内をスクロール可能にし、画面サイズ変更時は、下限に抵触しない範囲で選択した比率を維持する。

#### Scenario: REQ-031-S01 - 初期比率

- **GIVEN** ボードを新規表示し、境界を除いた領域の高さが780pxである。
- **WHEN** タイムラインと詳細エリアを描画する。
- **THEN** 上部は468px、下部は312pxになる。

#### Scenario: REQ-031-S02 - ドラッグによる高さ変更

- **GIVEN** 上部468px、下部312pxで選択Eventの詳細が表示されている。
- **WHEN** 境界を120px下へドラッグして離す。
- **THEN** 上部は588px、下部は192pxになり、Eventの選択を維持する。
- **AND** ポインターを離した後の移動では高さが変化しない。

#### Scenario: REQ-031-S03 - 領域の最小高さ

- **GIVEN** 境界12pxを含む領域の高さが532pxである。
- **WHEN** 境界を上端または下端を超える位置へドラッグする。
- **THEN** 上部と下部の高さはそれぞれ80px以上を維持する。

#### Scenario: REQ-031-S04 - キーボード操作と初期化

- **GIVEN** 上下の比率を変更し、境界にフォーカスがある。
- **WHEN** 上キー、下キー、Homeキーを順に押す。
- **THEN** 上部の比率が5ポイントずつ減少、増加し、最後に60%へ戻る。
- **AND** 境界のダブルクリックでも3対2へ戻せる。

#### Scenario: REQ-031-S05 - 多数Projectと画面サイズ変更

- **GIVEN** 23件のProjectがあり、上下の比率が3対2である。
- **WHEN** 画面を1440px×900pxから1100px×640pxへ縮小する。
- **THEN** 上下の比率を維持し、一覧をタイムライン領域内でスクロールできる。
- **AND** 詳細エリアの3列の独立スクロールを維持する。

#### Scenario: REQ-031-S06 - 下限調整後の画面縮小

- **GIVEN** 上下の片方を最小高さまで調整した。
- **WHEN** 境界を除いた高さが520pxになるまで画面を縮小する。
- **THEN** 両領域は80px以上を維持する。
