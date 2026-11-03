# hierarchy-editing Specification

## Purpose

階層の追加・変更・削除は、個人が複数Projectの作業をVS Codeで管理する際に、管理項目を少ない操作で追加・更新・削除し、計算結果へ即時反映する。\
この機能は管理対象の状態と画面の振る舞いを一貫して扱う。

## Requirements

### Requirement: REQ-022 - インライン追加

WHEN 各階層の見出しで追加を選んだとき、GlitchBoardは SHALL その場に入力欄を開き、Enterで必要項目を検証して保存し、Escで取り消す。\
Projectは名前と色、Eventは名前、Project、期限、StoryとTaskは名前を入力する。\
EventのProjectは選択中EventのProjectを初期値とし、Taskは未見積で作る。
追加の入力欄は保存が成功してから閉じ、失敗時は入力値を残す。

#### Scenario: REQ-022-S01 - Event追加

- **GIVEN** Event見出しで選択中Projectがある。
- **WHEN** 名前と期限を入力してEnterを押す。
- **THEN** そのProjectにEventが追加される。

#### Scenario: REQ-022-S02 - 取消

- **GIVEN** Storyの入力欄が開いている。
- **WHEN** Escを押す。
- **THEN** Storyは追加されず入力欄が閉じる。

#### Scenario: REQ-022-S03 - 保存失敗

- **GIVEN** 追加の入力欄に名前を入力した。
- **WHEN** 保存に失敗する。
- **THEN** 入力欄を開いたまま入力値を残し、画面上部に失敗理由を表示する。

### Requirement: REQ-023 - ポイント変更

WHEN Taskのポイントバッジを選んだとき、GlitchBoardは SHALL 1、2、3、5、8、13、21の7値からスライダーまたは数値で選択させ、保存後に集計と危険を再計算する。\
1と2は青、3と5は緑、8と13はオレンジ、21は赤紫で表示する。

#### Scenario: REQ-023-S01 - 未見積を設定

- **GIVEN** 未見積Taskがある。
- **WHEN** ポイントバッジから8を選ぶ。
- **THEN** 8ptのオレンジ色になり残りポイントと予測が更新される。

### Requirement: REQ-024 - 完了の切り替え

WHEN Taskのチェックを切り替えたとき、GlitchBoardは SHALL 完了時に日本時間の当日をdoneAtへ記録し、解除時にdoneAtを削除し、全集計を更新する。

#### Scenario: REQ-024-S01 - 完了と解除

- **GIVEN** 2026-11-03に未完了Taskがある。
- **WHEN** Taskをチェックする。
- **THEN** doneAtが2026-11-03となり残りポイントから外れる。

#### Scenario: REQ-024-S02 - 完了解除

- **GIVEN** 完了済みTaskがある。
- **WHEN** チェックを外す。
- **THEN** doneAtが消え残りポイントへ戻る。

### Requirement: REQ-025 - 確認付き物理削除

WHEN Project、Event、Story、Taskの削除を選んだとき、GlitchBoardは SHALL 子孫の種類別件数を示して確認を求め、承認時だけ対象と全子孫をYAMLから物理削除する。
保存または削除に失敗した場合は、拡張側から返された理由を画面上部に表示する。

#### Scenario: REQ-025-S01 - 子孫の確認

- **GIVEN** StoryにTaskが12件ある。
- **WHEN** 右クリックから削除を選ぶ。
- **THEN** Task 12件も削除される確認が出る。

#### Scenario: REQ-025-S02 - 取消

- **GIVEN** 削除確認が表示されている。
- **WHEN** 取消を選ぶ。
- **THEN** YAMLが変更されない。

#### Scenario: REQ-025-S03 - 削除失敗

- **GIVEN** 表示後に保存内容が更新され、削除要求が拒否される。
- **WHEN** 削除を確定する。
- **THEN** 画面上部に失敗理由を表示する。
