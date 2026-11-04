# GlitchBoard

GlitchBoardは、Project・Event・Story・Taskを整理するVS Code拡張機能です。

## 使い始める

1. 拡張機能をインストールし、アクティビティバーの「GlitchBoard」を開きます。
2. 表示された画面で「新しく作る」を押して管理データ用の`manage.yaml`を作成するか、「manage.yamlを選ぶ」で既存のファイルを選びます。
3. コマンドパレットから「GlitchBoardを開く」を実行すると、エディタにボードが開きます。

既存の`manage.yaml`を用意する場合、最初は次の内容で始められます。Projectは空でも構いません。「新しく作る」を選んだ場合は、この内容で自動作成されます。

```yaml
settings:
  workdays_off: [sat, sun]
  public_holidays: true
projects: []
```

管理データの保存先は、VS Codeの設定`glitchboard.manageFile`で後から変更できます。
