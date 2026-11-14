# 差分仕様

## RENAMED Requirements

- FROM: `REQ-037 - ボード内の Event 追加と空状態`
- TO: `REQ-037 - Event 追加の入口と空状態`

## MODIFIED Requirements

### Requirement: REQ-016 - Project別の期限タイムライン

WHILE ボードを表示するとき、GlitchBoard は Project 行と日付列を設け、期限の Event を Project 色の◆で表示しなければならない(SHALL)。\
期限切れの列とマーカーは表示せず、期限切れ Event は EVENT 一覧から操作する。\
同一 Project の同日は◆の角に件数バッジを置く。\
3日と1週間は全 Event 名、月は選択 Event 名だけを表示する。\
今日と休日は別背景とし、今日は内容を隠さない薄い強調とする。\
期限接近、溢れは◆に赤い光、期限まで4〜7暦日は黄色で示す。\
見出しは曜日と日付の2段、月は日だけを表示し当月全列を横スクロールなしで収める。\
Project 名の前に色の丸、右端に操作ボタンを置く。\
通常行は全 Project 共通の調整可能な高さで名前、詳細、移動ハンドル、マーカーとラベルを収め、追加フォーム、日付見出し、グラフの行は除外する。

#### Scenario: REQ-016-S01 - 同日の複数Event

- **GIVEN** 同じProjectの同じ日に3件のEventがある。
- **WHEN** まとめた◆を選ぶ。
- **THEN** 3件の一覧が開き選んだEventが選択される。

#### Scenario: REQ-016-S02 - 月表示

- **GIVEN** 月表示で3件のEventがあり1件が選択中である。
- **WHEN** タイムラインを描く。
- **THEN** 選択中のEventだけにラベルが付く。

#### Scenario: REQ-016-S03 - 短期表示

- **GIVEN** 3日または1週間の表示に、未選択のEventがある。
- **WHEN** タイムラインを描く。
- **THEN** 未選択のEventを含む◆にも名前が表示される。

#### Scenario: REQ-016-S04 - 期限切れのEvent

- **GIVEN** 今日より前に期限を過ぎたEventが同じProjectに2件ある。
- **WHEN** ボードを表示する。
- **THEN** 「期限切れ」列と期限切れの◆を表示せず、EVENT 一覧で2件から選択できる。

#### Scenario: REQ-016-S05 - Project行の高さ

- **GIVEN** 幅1440px、高さ900pxの画面に通常の文字サイズで3件のProjectがあり、うち2件にEventマーカーと名前がある。
- **WHEN** ボードを表示する。
- **THEN** 各通常行の描画高さは共通の初期値で、Projectの詳細ボタン、移動ハンドルとEventマーカーが操作できる。
- **AND** 調整した高さをすべての通常行へ適用する。

### Requirement: REQ-037 - Event 追加の入口と空状態

WHERE 読み込み済みの Project がある場合、GlitchBoard はEVENT 一覧から Event を追加できなければならない(SHALL)。\
ボード上部には Event 追加を表示せず、選択中 Event の Project を追加先の初期値とし、選択がなければ最初の Project とする。\
保存後は作成した Event を選択する。\
WHEN データが空のとき、GlitchBoard は Project と Event のどちらを追加すればよいかを案内しなければならない(SHALL)。

#### Scenario: REQ-037-S01 - ボードから追加

- **GIVEN** 2番目の Project の Event を選んでいる。
- **WHEN** EVENT 一覧の Event 追加を開く。
- **THEN** 2番目の Project が初期選択され、名前と有効な期限の保存によりその Project に追加し、作成した Event を選択する。

#### Scenario: REQ-037-S02 - 空状態

- **GIVEN** ボードに表示する Event がない。
- **WHEN** ボードを表示する。
- **THEN** Project がなければ Project 追加を、Project があれば左の EVENT 一覧からの Event 追加を案内する。

## ADDED Requirements

### Requirement: REQ-040 - タイムライン寸法の調整

WHEN Project 列幅または行高を調整したとき、GlitchBoard は全 Project に共通の寸法を適用し、設定した最小値と最大値および表示面の幅に収めなければならない(SHALL)。\
ポインターとキーボードで調整、初期化でき、操作取消では元の値へ戻し、再表示でも確定値を維持しなければならない。

#### Scenario: REQ-040-S01 - 寸法の変更と再表示

- **GIVEN** Project が複数ある。
- **WHEN** 列幅と行高を変更して画面を再表示する。
- **THEN** 全行で確定値が維持され、上部の Event 追加は存在しない。

#### Scenario: REQ-040-S02 - 境界と取消

- **GIVEN** 寸法の調整操作が使える。
- **WHEN** 上限外へ調整し、次の操作を取り消す。
- **THEN** 最小最大を超えず、取消では操作前へ戻り、画面縮小後も日付と Project の操作に到達できる。
