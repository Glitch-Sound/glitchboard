# Spec Delta

## Purpose

稼働日・負荷・危険判定は、個人が複数Projectの作業をVS Codeで管理する際に、期限と実績を基に、稼働日単位で予測・必要ペース・危険を一貫して計算できるようにする。\
この機能は管理対象の状態と画面の振る舞いを一貫して扱う。

## ADDED Requirements

### Requirement: REQ-006 - 稼働日と日付基準

WHILE 負荷を計算するとき、GlitchBoardは SHALL `manage.yaml`の`workdays_off`と`public_holidays`を用い、Asia/Tokyoの暦日を基準として稼働日を判定する。\
`due`と`doneAt`は`YYYY-MM-DD`の文字列で保存し、残り日数は稼働日でなく暦日で数える。

#### Scenario: REQ-006-S01 - 休日設定

- **GIVEN** 土日と日本の祝日を休日とする設定である。
- **WHEN** 2026-11-03を判定する。
- **THEN** 祝日のため非稼働日になる。

#### Scenario: REQ-006-S02 - 祝日を稼働日とする

- **GIVEN** public_holidaysがfalseで火曜日は休日設定にない。
- **WHEN** 2026-11-03を判定する。
- **THEN** 稼働日になる。

### Requirement: REQ-007 - 実績ペースと学習中

WHEN 完了履歴を集計するとき、GlitchBoardは SHALL 読込中Projectの直近10稼働日の完了ポイント合計を10で割る。\
最初の完了日を第1稼働日として10日目に達するまで学習中とする。

#### Scenario: REQ-007-S01 - 未見積の完了

- **GIVEN** 直近10稼働日に3ptと未見積のTaskが各1件完了した。
- **WHEN** 実績を計算する。
- **THEN** 合計6pt、実績ペース0.6pt/日になる。

#### Scenario: REQ-007-S02 - 学習中の境界

- **GIVEN** 最初の完了日から9稼働日目である。
- **WHEN** 実績を計算する。
- **THEN** 学習中になり実績ペースを表示しない。

#### Scenario: REQ-007-S03 - 0ptの実績

- **GIVEN** 10稼働日を経過し直近10稼働日に完了Taskがない。
- **WHEN** 実績を計算する。
- **THEN** 実績ペースは0pt/日で、完了予測を算出不能とする。

### Requirement: REQ-008 - 完了予測

WHEN 未完了Eventの予測を求めるとき、GlitchBoardは SHALL 期限、Project ID、Event IDの順に並べ、日本時間の今日以降の稼働日に実績ペースを順に配分し、残りが0になった稼働日を完了予測日とする。

#### Scenario: REQ-008-S01 - 複数Projectの競合

- **GIVEN** 期限順に2つのEventがあり実績ペースが2pt/日、各残りが2ptである。
- **WHEN** 予測を計算する。
- **THEN** 先のEventは第1稼働日、後のEventは第2稼働日に完了する。

#### Scenario: REQ-008-S02 - 算出不能

- **GIVEN** 学習中または実績ペース0pt/日で未完了Eventがある。
- **WHEN** 予測を計算する。
- **THEN** 完了予測日は表示しない。

### Requirement: REQ-009 - 必要ペース

WHEN 表示期間の必要ペースを求めるとき、GlitchBoardは SHALL 読込中Projectの全未完了Eventを対象に、残りポイントを今日から期限日までの稼働日に均等配分する。\
期限切れまたは配分可能日が0日の残りは今日の列へ載せる。\
非稼働日はこの例外を除き0とし、表示期間外に期限を持つEventも期間内の割当分だけを集計する。

#### Scenario: REQ-009-S01 - 期限が休日

- **GIVEN** 今日が稼働日で、期限が休日のEventの残りが4pt、期限までに2稼働日ある。
- **WHEN** 必要ペースを計算する。
- **THEN** 各稼働日に2ptを割り当て休日列は0になる。

#### Scenario: REQ-009-S02 - 期限切れ

- **GIVEN** 今日が休日で期限切れEventの残りが5ptである。
- **WHEN** 必要ペースを計算する。
- **THEN** 例外として今日の列に5ptを載せる。

### Requirement: REQ-010 - 期間負荷

WHEN 期間負荷を表示するとき、GlitchBoardは SHALL 表示期間内の必要ペース合計を同期間の稼働日数と実績ペースの積で割り100倍する。\
分母が0なら数値を表示しない。

#### Scenario: REQ-010-S01 - 100%超

- **GIVEN** 必要ペース合計が12ptで稼働日数4、実績ペース2pt/日である。
- **WHEN** 期間負荷を計算する。
- **THEN** 150%と表示し赤で示す。

#### Scenario: REQ-010-S02 - 分母0

- **GIVEN** 学習中または期間内稼働日が0である。
- **WHEN** 期間負荷を計算する。
- **THEN** 百分率を表示しない。

### Requirement: REQ-011 - 危険と件数

WHEN 危険を判定するとき、GlitchBoardは SHALL 未完了Eventの期限接近0～3暦日、期限切れ、完了予測日が期限後の溢れ、必要ペースが実績ペースを超える日の重なりを区別する。\
危険件数は期限接近、期限切れ、溢れのEventを重複除外して数え、表示期間内に重なりが1日以上あれば1を加える。\
期限まで4～7暦日は黄色の注意表示とし、危険には数えない。

#### Scenario: REQ-011-S01 - 期限接近と溢れ

- **GIVEN** 同じEventが期限まで2日で予測日が期限後である。
- **WHEN** 危険件数を計算する。
- **THEN** そのEventは1件と数える。

#### Scenario: REQ-011-S02 - 注意のみ

- **GIVEN** 期限まで5暦日で他の危険がない。
- **WHEN** 危険を判定する。
- **THEN** 黄色の注意扱いで危険件数には含めない。

#### Scenario: REQ-011-S03 - 学習中

- **GIVEN** 最初の完了から3稼働日目に期限切れEventがある。
- **WHEN** 危険を判定する。
- **THEN** 期限切れだけを判定し溢れと重なりは判定しない。
