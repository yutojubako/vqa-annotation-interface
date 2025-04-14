# GitHub Pagesでのデプロイ方法

VQA Panorama Annotation InterfaceをGitHub Pagesでデプロイして、URLを踏んでアクセスできるようにする手順を説明します。

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

## 2. フロントエンドのみをデプロイする場合

GitHub Pagesはサーバーサイドのコードを実行できないため、フロントエンドのみをデプロイします。

### 方法1: `frontend`ディレクトリをルートとしてデプロイ

1. リポジトリの設定ページに移動します（Settings > Pages）。
2. Source セクションで、デプロイするブランチ（例：`main`）と、ディレクトリ（`/frontend`）を選択します。
3. "Save"をクリックします。

### 方法2: `gh-pages`ブランチを使用する

1. `frontend`ディレクトリの内容だけを`gh-pages`ブランチにプッシュします：

```bash
# gh-pagesブランチを作成
git checkout -b gh-pages

# frontendディレクトリの内容だけをリポジトリのルートに移動
git rm -rf .
git checkout main -- frontend
mkdir temp
mv frontend/* temp/
mv temp/* .
rmdir temp
rm -rf frontend

# 変更をコミットしてプッシュ
git add .
git commit -m "Setup GitHub Pages"
git push origin gh-pages
```

2. リポジトリの設定ページで、Source セクションの Branch を `gh-pages` に設定します。

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

## 7. まとめ

GitHub Pagesを使用すると、簡単にVQA Annotation Interfaceをデプロイして、URLでアクセスできるようになります。ただし、サーバーサイドの機能が制限されるため、認証やデータ保存については上記の方法を検討してください。
