# 0.2.2 の配信

## 対象と公開前の確認

今回の追加依頼に基づき、Project アーカイブを既存の Glitch-Sound.glitchboard の更新として配布する。\
公式 Marketplace API と Chrome の管理画面で公開版が0.2.1であることを確認した。\
拡張の識別子は1f5f7ff2-b364-4729-b6a8-53f56bf480e8で、publisher、name と repository を維持する。\
Chrome で既存 publisher の Owner 権限も確認した。

開始時のリモート main は18a3494eeadcd77ab62b8da0bdb0b5ebf00b979eと一致し、v0.2.2タグは存在しない。\
既存のブランチとタグを上書きせず、通常の fast-forward と新しいタグを使う。\
gh CLI に認証はないが、既存の Git 接続を使い、別の認証情報を取得または作成しない。

## 変更内容

Project 詳細の編集でアーカイブを保存すると、PROJECT 一覧の行と期限マーカーだけを非表示にする。\
任意属性 archived に状態を保存し、既存の属性省略ファイルは変更せず読める。\
関連データ、EVENT 一覧と集計は維持し、再表示と復元の UI は置かない。\
実装と検証の詳細は [アーカイブの報告](project-archive-report.md)を参照する。

manifest、README、変更履歴と配布用文書を0.2.2へ同期した。\
0.1.xからの移行非対応の案内、旧ファイルの保全、既存のアイコンとライセンス情報は維持する。\
README の既存5画像は今回の編集欄を写しておらず説明と一致するため変更しない。\
配布用の画像と原寸リンクは v0.2.2 の公開タグを使う。

## 検査と配信結果

npm run check は119ファイル348テスト、lint、型検査、FSD、ビルド、7仕様の strict 検査、トレースと文書同期を含めて成功した。\
今回の最終実装で既存 UI 検査11本と実 VS Code の両テーマのアーカイブ検査にも成功した。\
通常の Git push の dry-run は成功した。

VSIX は21ファイルで、ID と0.2.2、README、変更履歴、5画像、4サンプル、実行ファイルのすべてが元ファイルと完全一致した。\
開発ソース、OpenSpec と artifacts を含めず、既存のライセンス不在の警告は隠していない。\
配布物は artifacts/release-v0.2.2/glitchboard-0.2.2.vsix に置く。\
SHA-256 は378b4e21ab552fa1d87b6b81c53ac6b99e266bfc180c8ed4bb7a07596475116fである。

改修と配信準備を c418632a2800313c53f7872e65b4f54e509d7292 へコミットし、main と新しい v0.2.2 タグを atomic push で反映した。\
タグは同じコミットを指し、既存の履歴とタグは変更していない。\
公開タグの5画像、README、変更履歴とサンプルの8 URL はすべて HTTP 200 で、ローカルと完全一致した。

Chrome で既存 GlitchBoard の Update から検証済みの VSIX を選択し、Upload を実行した。\
管理画面が Verifying 0.2.2 へ遷移し、アップロードの完了を確認した。\
2026-11-16 11:42:55 UTC に Marketplace の検証が完了し、公式公開 API が validated、public の0.2.2を返すことを確認した。\
Chrome の公開ページでも Version 0.2.2、アーカイブの説明、新しい repository と公開タグの全体画像を確認した。\
公開版の VSIX、README、変更履歴、manifest とアイコンを取得し、検証済みのローカル配布物と一致することを確認した。\
VSIX の SHA-256 も上記と一致した。

README の実ブラウザー描画は、5画像の読込、共通倍率、本文と表の横はみ出しなしを確認した。\
事後の照合結果は artifacts/release-v0.2.2/postflight.json、公開 URL は public-urls.json、描画結果は readme-preview-results.json に置く。\
配信記録の後続コミットでは公開タグと VSIX を変更しない。

## 確認範囲

開発ホストは隔離した実 VS Code 1.146.0 の両テーマを使い、通常の利用者データを変更していない。\
通常プロファイルでの利用者の最終確認、最低対応版、Windows、Linux と全カスタムテーマでの実操作は未確認である。
