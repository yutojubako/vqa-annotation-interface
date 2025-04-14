#!/bin/bash
# GitHub Pages用にプロジェクト構造を再編成するスクリプト

# 方法1: フロントエンドをdocsディレクトリに移動
restructure_to_docs() {
  echo "フロントエンドファイルをdocsディレクトリに移動します..."
  
  # docsディレクトリを作成
  mkdir -p docs
  
  # フロントエンドファイルをdocsにコピー
  cp -r frontend/* docs/
  
  # GitHub Actionsワークフローを更新
  mkdir -p .github/workflows
  cat > .github/workflows/deploy-to-github-pages.yml << EOF
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

# GitHub Actionsに必要な権限を設定
permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # 全履歴をフェッチ
      
      # docsディレクトリは既にリポジトリのルートにあるため、
      # 追加の処理は必要ありません
EOF
  
  echo "完了！GitHub Pagesの設定で、Source: Deploy from a branch, Branch: main, Folder: /docs を選択してください。"
}

# 方法2: リポジトリを再構成してフロントエンドをルートに移動
restructure_to_root() {
  echo "プロジェクトを再構成してフロントエンドをルートに移動します..."
  
  # バックアップディレクトリを作成
  mkdir -p _backup
  
  # バックエンドとその他のファイルをバックアップディレクトリに移動
  mv backend _backup/
  mv Dockerfile _backup/
  mv docker-compose.yml _backup/
  mv run.py _backup/
  mv convert_webdataset.py _backup/
  mv LICENSE _backup/
  mv README.md _backup/
  mv .gitignore _backup/
  
  # フロントエンドファイルをルートに移動
  cp -r frontend/* ./
  
  # 重要なファイルを復元
  cp _backup/README.md ./
  cp _backup/LICENSE ./
  cp _backup/.gitignore ./
  
  # GitHub Actionsワークフローを更新
  mkdir -p .github/workflows
  cat > .github/workflows/deploy-to-github-pages.yml << EOF
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

# GitHub Actionsに必要な権限を設定
permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # 全履歴をフェッチ
      
      # ルートディレクトリは既にフロントエンドファイルを含んでいるため、
      # 追加の処理は必要ありません
EOF
  
  echo "完了！GitHub Pagesの設定で、Source: Deploy from a branch, Branch: main, Folder: / (root) を選択してください。"
}

# 方法3: 現在の構造を維持し、GitHub Actionsでビルド時に変換
update_github_actions() {
  echo "GitHub Actionsワークフローを更新して、ビルド時にフロントエンドファイルをデプロイします..."
  
  mkdir -p .github/workflows
  cat > .github/workflows/deploy-to-github-pages.yml << EOF
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - main

# GitHub Actionsに必要な権限を設定
permissions:
  contents: write

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0  # 全履歴をフェッチ

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Create build directory
        run: mkdir -p build

      - name: Copy frontend files to build directory
        run: cp -r frontend/* build/

      - name: Deploy to GitHub Pages
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: build
          branch: gh-pages
          clean: true
          token: \${{ secrets.GITHUB_TOKEN }}  # GitHub Tokenを使用
EOF
  
  echo "完了！GitHub Pagesの設定で、Source: Deploy from a branch, Branch: gh-pages, Folder: / (root) を選択してください。"
}

# メインメニュー
echo "GitHub Pages用にプロジェクト構造を再編成するスクリプト"
echo "======================================================="
echo "1) フロントエンドをdocsディレクトリに移動"
echo "2) リポジトリを再構成してフロントエンドをルートに移動"
echo "3) 現在の構造を維持し、GitHub Actionsでビルド時に変換"
echo "q) 終了"
echo ""
read -p "選択してください (1-3, q): " choice

case $choice in
  1)
    restructure_to_docs
    ;;
  2)
    restructure_to_root
    ;;
  3)
    update_github_actions
    ;;
  q|Q)
    echo "終了します"
    exit 0
    ;;
  *)
    echo "無効な選択です"
    exit 1
    ;;
esac
