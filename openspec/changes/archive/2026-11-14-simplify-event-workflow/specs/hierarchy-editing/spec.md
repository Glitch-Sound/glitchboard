# 差分仕様

## ADDED Requirements

### Requirement: REQ-033 - Story 作成なしの Task 追加

WHEN Event の Task 追加を保存したとき、GlitchBoard は Story の事前作成を要求せず、未見積の Task を Event の専用グループへ保存しなければならない(SHALL)。\
既存の Story と Task の ID、名前、補足、ポイント、完了日を保持し、専用グループは Event ごとに最大1つとする。\
既存 Story と同じ名前でも専用グループへ転用してはならない。\
空白の名前、不正な追加先、保存失敗では保存済みデータを変えてはならない。

#### Scenario: REQ-033-S01 - 最初の Task

- **GIVEN** Story がない Event がある。
- **WHEN** Event の Task に「調査」を追加する。
- **THEN** 未見積の「調査」1件が保存され、再読込後も Task として表示される。

#### Scenario: REQ-033-S02 - 繰り返し追加と旧データ

- **GIVEN** 同名の通常 Story にポイントと完了日、補足のある Task がある。
- **WHEN** Event の Task に2件を続けて追加する。
- **THEN** 通常 Story と既存 Task はそのままで、専用グループ1件に新しい Task 2件だけが保存される。

#### Scenario: REQ-033-S03 - 不正な追加と失敗

- **GIVEN** 保存済みの Event がある。
- **WHEN** 下表の追加を試みる。
- **THEN** 保存済みデータは変わらず、理由を返す。

| 条件 |
| --- |
| 空白だけの名前 |
| 存在しない Event |
| 保存先が書き込めない |

#### Scenario: REQ-033-S04 - 未入力と取消

- **GIVEN** 空の Event で Task 追加欄を開いている。
- **WHEN** 空白だけで保存するか Esc で取り消す。
- **THEN** 追加要求は送らず、取消後に再び開くと入力欄は空である。

### Requirement: REQ-034 - 更新中の選択と入力維持

WHILE 同じ Event を表示している間、GlitchBoard はデータ更新後も存在する Story 選択と未保存の追加入力を維持しなければならない(SHALL)。\
IF 選択中の Story が消えた場合、THEN 追加入力を取り消し、有効な選択へ戻さなければならない(SHALL)。\
保存失敗では入力を残して再送でき、保存中の重複送信を防がなければならない(SHALL)。

#### Scenario: REQ-034-S01 - 更新で選択と入力を保持

- **GIVEN** 2番目の Story を選び、Task 追加欄に「下書き」を入力した。
- **WHEN** 同じ Event の Task 完了状態が更新される。
- **THEN** 2番目の Story が選択されたままで「下書き」も残る。

#### Scenario: REQ-034-S02 - 選択先消失と Event 切替

- **GIVEN** 追加欄に未保存の名前を入力している。
- **WHEN** 選択 Story が削除されるか別の Event に切り替わる。
- **THEN** 古い追加欄は閉じ、別の追加先へ入力を引き継がない。

#### Scenario: REQ-034-S03 - 失敗後に再送

- **GIVEN** Task を入力し、保存が失敗した。
- **WHEN** 同じ入力を再度保存する。
- **THEN** 同じ追加先と名前を送信し、成功した後だけ欄を閉じる。

#### Scenario: REQ-034-S04 - 二重送信と取消後の応答

- **GIVEN** Task の保存要求を送って応答を待っている。
- **WHEN** 再度保存を試すか、取消後に再び追加欄を開いてから前の応答を受ける。
- **THEN** 保存要求は1件で、前の応答が新しい入力欄を消さない。
