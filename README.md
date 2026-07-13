# kensankai-slide 使い方メモ

## 開き方
- 通常：index.html をブラウザで直接開く
- S21を静止画にしたい場合：index.html?s21=photo をブラウザで開く

## スライド操作
- 進む：クリッカー（Kokuyo ELA-FP1）の進むボタン、または右矢印キー
- 戻る：クリッカーの戻るボタン、または左矢印キー
- 台本モード（誤入力防止）：L キーで ON/OFF

## GitHub との同期
- 変更後は VS Code からコミット＆プッシュ
- チームへの共有は GitHub Pages の URL を渡す

## ファイル構成
主なファイルだけ記載する（node_modules などは省略）

```
kensankai-slide/
├── index.html            # スライド本体（全21スライド）
├── css/
│   └── slide.css         # スライドの配色・レイアウト用CSS
├── deck-stage.js          # スライド表示・操作用のWebコンポーネント
├── tweaks-panel.jsx       # 編集用調整パネル
├── assets/
│   ├── images/            # スライド内で使用する画像
│   ├── icons/              # アイコン素材
│   ├── videos/             # 動画素材
│   └── references/         # 参考資料
├── scripts/
│   └── export-slides.js   # スライドを画像として書き出すスクリプト
├── exports/
│   └── slides/             # 書き出し画像の出力先
├── package.json
└── README.md
```
