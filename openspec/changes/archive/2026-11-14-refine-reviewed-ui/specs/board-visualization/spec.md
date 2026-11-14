# 差分仕様

## ADDED Requirements

### Requirement: REQ-043 - 空状態の操作案内

WHILE 設定済みの画面が空である間、GlitchBoard は SHALL 管理データと読み込み、抽出の状態に応じて次の操作を案内する。\
Project 未登録ではメインの Project 追加、全 Project 非読込では左の抽出条件からの読み込み、読込済みで Event がない場合は左の Event 追加を案内する。\
抽出条件によって Event が見えない場合は抽出条件の確認を案内し、データがない状態と混同しない。\
未設定と管理ファイル不在の設定案内は既存の左だけの操作を維持する。

#### Scenario: REQ-043-S01 - Project 未登録

- **GIVEN** 有効な管理ファイルに Project が登録されていない。
- **WHEN** 左右の画面を開く。
- **THEN** 両方に Project 追加の案内を表示し、メインの Project ＋ が追加の入口であることを示す。

#### Scenario: REQ-043-S02 - 全 Project 非読込

- **GIVEN** Project が登録されているが、すべて load=false である。
- **WHEN** 左右の画面を開く。
- **THEN** 両方に読み込み設定の案内を表示し、左の抽出条件から Project を読み込むよう示す。
- **AND** Project が未登録であるという案内は表示しない。

#### Scenario: REQ-043-S03 - Event なし

- **GIVEN** 読込済みの Project に Event がない。
- **WHEN** 左右の画面を開く。
- **THEN** メインでは Event 追加、左では表示対象の Event がないことと追加の入口を案内する。

#### Scenario: REQ-043-S04 - 抽出結果なし

- **GIVEN** 読込済みの Project に完了済みの Event だけがあり、抽出条件は未完了 + 今後である。
- **WHEN** EVENT 一覧を開く。
- **THEN** 表示対象の Event がないことと抽出条件の確認を案内し、Project の追加や読み込みが必要だという案内を表示しない。

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

#### Scenario: REQ-016-S06 - 月の補助詳細操作

- **GIVEN** 月表示で、期限の1日ごとの列が狭い。
- **WHEN** 期限のマーカーへポインターまたはキーボードフォーカスを移す。
- **THEN** 補助詳細ボタンをマーカーに重ねず上に表示し、1クリックまたは Tab と Enter で対象の詳細を開ける。
- **AND** 通常時は補助ボタンを隠して ◆ と選択中の名前を読め、フォーカスとポインターが離れれば元へ戻す。
- **AND** 行高と他の表示期間の操作を維持する。
