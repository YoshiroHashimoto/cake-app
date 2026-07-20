# Restaurant App - Expo モバイルアプリ

## セットアップ手順

### 必要なもの
- Node.js 18以上
- npm または yarn
- Expo Go アプリ（スマートフォンにインストール）

### インストール方法

```bash
# 1. このフォルダに移動
cd restaurant-app

# 2. 依存パッケージをインストール
npm install

# 3. アプリを起動
npx expo start
```

### スマートフォンで動作確認
1. `npx expo start` を実行するとQRコードが表示されます
2. iPhoneの場合：カメラアプリでQRコードをスキャン
3. Androidの場合：Expo GoアプリでQRコードをスキャン

## ファイル構成

```
restaurant-app/
├── App.tsx          ← メインアプリ（スプラッシュ・料理一覧・詳細）
├── src/
│   └── api.ts       ← APIクライアント設定
├── assets/          ← アイコン・スプラッシュ画像
├── app.json         ← Expo設定
├── babel.config.js  ← Babel設定
└── package.json     ← 依存パッケージ
```

## API接続先の変更

`src/api.ts` の `BASE_URL` を変更することで、
接続先のWeb管理画面を切り替えられます。

現在の設定: `https://restadmin-srdbatub.manus.space`

## 機能

- スプラッシュ画面（レストラン画像 → 自動遷移）
- 料理一覧（ランチ / ディナー タブ切り替え）
- 料理詳細表示（タップで詳細モーダル表示）
- ダークゴールドのエレガントなデザイン
