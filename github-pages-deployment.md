# GitHub Pagesでのデプロイ方法

VQA Panorama Annotation InterfaceをGitHub Pagesでデプロイして、URLを踏んでアクセスできるようにする手順を説明します。

## GitHub Pagesの制限について

GitHub Pagesには以下の制限があります：

> ソース ブランチのリポジトリ (/) のルートまたはソース ブランチの /docs フォルダーのいずれかを指定できます。変更がソース ブランチにプッシュされるたびに、ソース フォルダー内の変更が GitHub Pages サイトに公開されます。

つまり、`/frontend`ディレクトリを直接公開することはできません。この制限に対応するために、以下の方法があります。

## プロジェクト構造の再編成

プロジェクトに含まれる`restructure-for-github-pages.sh`スクリプトを使用して、GitHub Pages用にプロジェクト構造を再編成できます：

```bash
./restructure-for-github-pages.sh
```

このスクリプトは以下の3つの方法を提供します：

### 方法1: フロントエンドを`/docs`ディレクトリに移動

フロントエンドファイルを`/docs`ディレクトリにコピーし、GitHub Pagesの設定で`/docs`フォルダーを指定します。

### 方法2: フロントエンドをリポジトリのルートに移動

バックエンドとその他のファイルをバックアップし、フロントエンドファイルをリポジトリのルートに移動します。

### 方法3: GitHub Actionsを使用してデプロイ（推奨）

現在のプロジェクト構造を維持したまま、GitHub Actionsを使用してビルド時にフロントエンドファイルを`gh-pages`ブランチにデプロイします。

## 1. GitHubリポジトリの準備

1. GitHubアカウントにログインします。
2. 新しいリポジトリを作成します（例：`vqa-annotation-interface`）。
3. ローカルのプロジェクトをGitHubリポジトリにプッシュします：

```bash
# リポジトリを初期化
cd vqa-interface
git init
git add .
git commit -m "Initial commit"

# GitHubリポジトリに接続してプッシュ
git remote add origin https://github.com/あなたのユーザー名/vqa-annotation-interface.git
git push -u origin main
```

## 2. GitHub Actionsを使用したデプロイ（推奨）

このプロジェクトには既にGitHub Actionsのワークフローファイル（`.github/workflows/deploy-to-github-pages.yml`）が含まれています。このワークフローは、`main`ブランチにプッシュされるたびに、フロントエンドファイルを`gh-pages`ブランチにデプロイします。

1. コードをGitHubにプッシュします：

```bash
git push origin main
```

2. GitHub Actionsが自動的に実行され、`gh-pages`ブランチにフロントエンドファイルがデプロイされます。

3. リポジトリの設定ページ（Settings > Pages）で以下を設定します：
   - Source: Deploy from a branch
   - Branch: gh-pages
   - Folder: / (root)

4. 数分後、サイトが以下のURLで公開されます：
   ```
   https://あなたのユーザー名.github.io/vqa-annotation-interface/
   ```

## 3. データの準備

GitHub Pagesはサーバーサイドのコードを実行できないため、データは以下の方法で準備する必要があります：

1. WebDatasetからデータを変換して、`frontend/assets/`ディレクトリに保存します：

```bash
# ローカルで実行
python convert_webdataset.py --data path/to/shard-{000000..000999}.tar --output frontend/assets/annotation_data.json
```

2. `api.js`ファイルを編集して、`SAMPLE_DATA_URL`を正しいパスに設定します：

```javascript
// frontend/js/api.js
const SAMPLE_DATA_URL = 'assets/annotation_data.json';
```

3. 変更をコミットしてプッシュします：

```bash
git add frontend/assets/annotation_data.json
git add frontend/js/api.js
git commit -m "Add annotation data"
git push origin main  # または gh-pages ブランチを使用している場合は gh-pages
```

## 4. アクセス方法

デプロイが完了すると、以下のURLでアクセスできます：

```
https://あなたのユーザー名.github.io/vqa-annotation-interface/
```

または、カスタムドメインを設定している場合は、そのドメインでアクセスできます。

## 5. 認証とデータ保存について

GitHub Pagesはサーバーサイドの処理ができないため、以下の点に注意が必要です：

1. **認証**: 現在の実装では、ユーザー名とパスワードはフロントエンドのコードに直接埋め込まれています。本番環境では、これはセキュリティリスクとなります。

2. **データ保存**: アノテーションデータはブラウザのlocalStorageに保存されます。これはブラウザごとに独立しており、デバイス間で共有されません。

## 6. バックエンドが必要な場合

もし認証やデータの永続化が重要な場合は、以下の方法を検討してください：

1. **Firebase Authentication + Firestore**: Firebaseを使用すると、サーバーレスでも認証とデータベース機能を利用できます。

2. **別サーバーでバックエンドを実行**: バックエンドサーバーを別途ホスティングし、GitHub Pagesのフロントエンドからアクセスする方法です。

```javascript
// frontend/js/api_with_backend.js
const API_URL = 'https://あなたのバックエンドサーバー.com/api';
```

3. **GitHub Actionsでデータ同期**: GitHub Actionsを使用して、localStorageのデータをリポジトリに定期的にコミットする方法も考えられます。

## 7. Firebase設定の安全な管理

パブリックリポジトリでGitHub Pagesを使用しながらFirebase設定を安全に管理するには、以下の手順を実施してください：

### 7.1 Firebase APIキーのセキュリティ強化

Firebase APIキー自体は完全に秘密にする必要はありませんが、以下の設定を行うことでセキュリティを強化できます：

1. **Firebase Console**で、APIキーの使用を特定のドメイン（GitHub Pagesのドメイン）に制限する
   - Firebase Console > Project Settings > API Settings > Application restrictions
   - 「HTTP referrers (websites)」を選択し、`*.github.io/*`を追加

2. **Firebase Authentication**の設定で、許可されるドメインを追加する
   - Firebase Console > Authentication > Settings > Authorized domains
   - `yourusername.github.io`を追加

3. **Firestore**のセキュリティルールを厳格に設定する
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ```

### 7.2 GitHub Secretsの設定

1. リポジトリの Settings > Secrets > Actions に移動
2. 以下の変数を追加：
   - `FIREBASE_API_KEY`
   - `FIREBASE_AUTH_DOMAIN`
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_STORAGE_BUCKET`
   - `FIREBASE_MESSAGING_SENDER_ID`
   - `FIREBASE_APP_ID`

これらのシークレットは、GitHub Actionsワークフローで使用され、ビルド時に`firebase-config.js`ファイルを生成します。

### 7.3 ローカル開発環境の設定

1. `firebase-config.template.js`ファイルを`firebase-config.js`にコピー
2. 実際のFirebase認証情報を入力
3. `.gitignore`ファイルに`firebase-config.js`が含まれていることを確認

### 7.4 Firebaseの有効化

1. `index.html`と`admin.html`ファイル内のFirebase SDKとfirebase-integration.jsのコメントを解除
2. GitHub Actionsワークフローを実行して、GitHub Pagesにデプロイ

## 8. まとめ

GitHub Pagesを使用すると、簡単にVQA Annotation Interfaceをデプロイして、URLでアクセスできるようになります。Firebase統合を使用することで、認証とデータ永続化の問題を解決できます。ただし、パブリックリポジトリでFirebase設定を安全に管理するために、上記の方法を実施してください。
