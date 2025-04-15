# Firebase認証の設定方法

VQA Panorama Annotation InterfaceでFirebase認証を使用するための設定手順を説明します。

## 1. Firebaseプロジェクトの作成

1. [Firebase Console](https://console.firebase.google.com/)にアクセスします。
2. 「プロジェクトを追加」をクリックして、新しいプロジェクトを作成します。
3. プロジェクト名を入力し、指示に従ってプロジェクトを作成します。

## 2. Webアプリの追加

1. プロジェクトのダッシュボードで「Webアプリ」アイコン（`</>`）をクリックします。
2. アプリのニックネームを入力し、「アプリを登録」をクリックします。
3. 表示されるFirebase設定（`firebaseConfig`）をコピーします。

## 3. 認証の有効化

1. 左側のメニューから「Authentication」を選択します。
2. 「始める」をクリックします。
3. 「ログイン方法」タブで「メール/パスワード」を選択し、有効にします。
4. 「保存」をクリックします。

## 4. ユーザーの作成

### 方法1: Firebase Consoleでユーザーを作成

1. 「Authentication」セクションの「ユーザー」タブに移動します。
2. 「ユーザーを追加」をクリックします。
3. 以下のユーザーを作成します：
   - メールアドレス: `annotator@example.com`
   - パスワード: `anno123`
4. 管理者ユーザーも作成します：
   - メールアドレス: `admin@example.com`
   - パスワード: `admin123`

### 方法2: Firebase Admin SDKを使用してユーザーを作成

Node.jsスクリプトを使用して、Firebase Admin SDKでユーザーを作成することもできます：

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// 一般ユーザーの作成
admin.auth().createUser({
  email: 'annotator@example.com',
  password: 'anno123',
  displayName: 'Annotator'
})
.then((userRecord) => {
  console.log('Successfully created annotator user:', userRecord.uid);
})
.catch((error) => {
  console.error('Error creating annotator user:', error);
});

// 管理者ユーザーの作成
admin.auth().createUser({
  email: 'admin@example.com',
  password: 'admin123',
  displayName: 'Admin'
})
.then((userRecord) => {
  console.log('Successfully created admin user:', userRecord.uid);
  
  // Firestoreに管理者権限を設定
  const db = admin.firestore();
  return db.collection('users').doc(userRecord.uid).set({
    isAdmin: true
  });
})
.then(() => {
  console.log('Successfully set admin privileges');
})
.catch((error) => {
  console.error('Error creating admin user:', error);
});
```

## 5. 認証ドメインの設定

GitHub Pagesを使用する場合は、認証ドメインを追加する必要があります：

1. 「Authentication」セクションの「設定」タブに移動します。
2. 「承認済みドメイン」セクションで「ドメインを追加」をクリックします。
3. `yourusername.github.io`を追加します（あなたのGitHubユーザー名に置き換えてください）。
4. 「追加」をクリックします。

## 6. Firebase設定の適用

1. `firebase-config.template.js`ファイルを`firebase-config.js`にコピーします：

```bash
cp frontend/js/firebase-config.template.js frontend/js/firebase-config.js
```

2. `firebase-config.js`ファイルを編集して、Firebaseコンソールからコピーした設定を貼り付けます：

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project-id.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project-id.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

3. `index.html`と`admin.html`ファイル内のFirebase関連のコメントを解除します。

## 7. Firestoreデータベースの作成

1. 左側のメニューから「Firestore Database」を選択します。
2. 「データベースの作成」をクリックします。
3. セキュリティルールを選択し、「次へ」をクリックします。
4. ロケーションを選択し、「有効にする」をクリックします。

## 8. セキュリティルールの設定

Firestoreのセキュリティルールを設定して、認証されたユーザーのみがデータにアクセスできるようにします：

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ユーザーコレクションのルール
    match /users/{userId} {
      // 自分自身のデータのみ読み取り可能
      allow read: if request.auth.uid == userId;
      // 管理者は全てのユーザーデータを読み取り可能
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
      // 自分自身のデータのみ書き込み可能（ただし、isAdminフィールドは変更不可）
      allow write: if request.auth.uid == userId && 
                    (!request.resource.data.diff(resource.data).affectedKeys().hasAny(['isAdmin']));
    }
    
    // アノテーションコレクションのルール
    match /annotations/{annotationId} {
      // 自分が作成したアノテーションのみ読み書き可能
      allow read, write: if request.auth != null && 
                          resource.data.userId == request.auth.uid;
      // 管理者は全てのアノテーションを読み取り可能
      allow read: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
    
    // タスクコレクションのルール
    match /tasks/{taskId} {
      // 認証されたユーザーは読み取り可能
      allow read: if request.auth != null;
      // 管理者のみ書き込み可能
      allow write: if get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isAdmin == true;
    }
  }
}
```

## 9. タスクデータの作成

Firestoreに初期タスクデータを作成します：

1. 「Firestore Database」セクションの「データ」タブに移動します。
2. 「コレクションを開始」をクリックします。
3. コレクションID「tasks」を入力し、「次へ」をクリックします。
4. 最初のドキュメントを作成します：
   - ドキュメントID: 自動生成
   - フィールド:
     - `imageId`: `https://pannellum.org/images/cerro-toco-01.jpg`（文字列）
     - `imageUrl`: `https://pannellum.org/images/cerro-toco-01.jpg`（文字列）
     - `caption`: `A panoramic view of a mountainous landscape with clear blue sky.`（文字列）
5. 「保存」をクリックします。
6. 必要に応じて、さらにタスクを追加します。

## 10. ログイン方法

Firebase認証を有効にした後は、以下のユーザー情報でログインできます：

1. 一般ユーザー:
   - ユーザー名: `annotator`（または`annotator@example.com`）
   - パスワード: `anno123`

2. 管理者ユーザー:
   - ユーザー名: `admin`（または`admin@example.com`）
   - パスワード: `admin123`

ユーザー名にはドメイン部分（`@example.com`）を含めても含めなくても構いません。システムが自動的に処理します。
