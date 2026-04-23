# サンワクレーン クレーン管理システム

サンワクレーン株式会社（奈良県天理市）向けのQRコードベースクレーン管理Webアプリです。  
各クレーンにQRコードを貼り付け、スマートフォンで読み込むとメンテナンス状況の確認・入力ができます。

---

## ファイル構成

```
crane-management-system/
├── index.html              案内ページ（管理者ログインへのリンク）
├── crane.html              現場用：クレーン詳細（QRコードからアクセス）
├── maintenance.html        現場用：メンテナンス入力
├── history.html            現場用：メンテナンス履歴
├── admin-login.html        管理者ログイン
├── admin-dashboard.html    管理者ダッシュボード
├── admin-crane.html        管理者用クレーン詳細・編集
├── admin-cranes.html       クレーン管理（追加・編集・削除）
├── qr-generator.html       QRコード生成・印刷
├── css/
│   └── style.css           共通スタイルシート
├── js/
│   ├── data.js             データ読み書き（Firebase移行ポイント）
│   ├── auth.js             ログイン・権限管理
│   ├── app.js              共通ユーティリティ
│   ├── crane.js            現場用クレーン詳細
│   ├── maintenance.js      メンテナンス入力
│   ├── history.js          履歴表示
│   ├── admin-dashboard.js  管理者ダッシュボード
│   ├── admin-crane.js      管理者クレーン詳細・編集
│   ├── admin-cranes.js     クレーン管理
│   └── qr.js              QRコード生成
└── README.md
```

---

## 使い方

### 現場作業員向け

1. クレーンに貼付されたQRコードをスマートフォンで読み込む
2. `crane.html?id=CRANE-001` が開き、そのクレーンの情報のみ表示される
3. **「メンテナンスを記録する」** ボタンからメンテナンス内容を入力
4. **「履歴を見る」** ボタンから過去の記録を確認

### 管理者向け（MacBookで使用）

1. `admin-login.html` を開く
2. 管理者パスワードを入力してログイン
3. ダッシュボードで全クレーンの状態を一覧確認
4. **クレーン管理**（`admin-cranes.html`）でクレーンの追加・編集・削除
5. **QRコード生成**（`qr-generator.html`）でQRコードを印刷・ダウンロード

---

## 管理者パスワード

```
sanwa2024
```

> **注意：** 本番運用前に `js/auth.js` の `ADMIN_PASSWORD` を変更してください。

---

## 初期サンプルデータ

| クレーンID | 車番 | 名称 |
|-----------|------|------|
| CRANE-001 | 奈良100 あ 1234 | ラフタークレーン 25t |
| CRANE-002 | 奈良100 い 5678 | ラフタークレーン 50t |
| CRANE-003 | 奈良100 う 9012 | トラッククレーン 16t |

---

## ブラウザで開く方法

外部サーバーは不要です。`index.html` をブラウザで直接開いてください。

```
# macOS の場合
open index.html
```

> QRコードのリンク先はファイルパスまたはWebサーバーのURLになります。  
> スマートフォンからアクセスするには、Webサーバーで公開する必要があります。

---

## Firebaseへの移行方法

現在はすべてのデータを `localStorage` に保存しています。  
`js/data.js` の各メソッドをFirebase Firestore呼び出しに置き換えるだけで移行できます。

### 移行手順

1. Firebase プロジェクトを作成し、Firestore を有効化
2. 各HTMLファイルの `</body>` 直前にFirebase SDKを追加：

```html
<script src="https://www.gstatic.com/firebasejs/10.x.x/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.x.x/firebase-firestore-compat.js"></script>
<script>
  firebase.initializeApp({ /* your config */ });
  const db = firebase.firestore();
</script>
```

3. `js/data.js` の各メソッドを置き換え：

```javascript
// 例：getCranes()
async getCranes() {
  const snap = await db.collection('cranes').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
},

// 例：saveCrane(crane)
async saveCrane(crane) {
  if (!crane.id) {
    const ref = await db.collection('cranes').add(crane);
    crane.id = ref.id;
  } else {
    await db.collection('cranes').doc(crane.id).set(crane);
  }
  return crane;
},
```

4. 非同期処理（`async/await`）に対応するよう各ページのJSを更新
5. Firebase Authentication でパスワード認証に切り替え（`js/auth.js` を更新）

---

## 使用ライブラリ

| ライブラリ | 用途 |
|-----------|------|
| Google Fonts (Noto Sans JP) | フォント |
| Font Awesome 6 | アイコン |
| QRCode.js | QRコード生成 |

---

## カラーテーマ

| 色 | カラーコード | 用途 |
|----|------------|------|
| ダークネイビー | `#1a2744` | メインカラー |
| ゴールド | `#c9a84c` | アクセントカラー |
