#!/bin/bash
# Script to deploy Firebase integration fixes to GitHub Pages

echo "Deploying Firebase integration fixes to GitHub Pages..."

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "Error: git is not installed. Please install git and try again."
    exit 1
fi

# Check if we're in a git repository
if ! git rev-parse --is-inside-work-tree &> /dev/null; then
    echo "Error: Not in a git repository. Please run this script from within your git repository."
    exit 1
fi

# Check if there are uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "There are uncommitted changes in your repository."
    read -p "Do you want to commit these changes? (y/n): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment canceled. Please commit your changes manually and try again."
        exit 1
    fi
    
    # Commit the changes
    git add .
    git commit -m "Fix Firebase integration issues"
    echo "Changes committed."
fi

# Push to main branch
echo "Pushing changes to main branch..."
git push origin main

# Check if GitHub Actions is configured
if [ -f ".github/workflows/deploy-to-github-pages.yml" ]; then
    echo "GitHub Actions workflow found. The changes will be automatically deployed to GitHub Pages."
    echo "Please check the Actions tab in your GitHub repository to monitor the deployment."
else
    echo "GitHub Actions workflow not found. Would you like to deploy manually?"
    read -p "Deploy manually? (y/n): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Check if gh-pages branch exists
        if git show-ref --verify --quiet refs/heads/gh-pages; then
            echo "gh-pages branch exists. Deploying to gh-pages branch..."
        else
            echo "Creating gh-pages branch..."
            git checkout --orphan gh-pages
            git reset --hard
            git commit --allow-empty -m "Initial gh-pages commit"
            git checkout main
        fi
        
        # Build and deploy
        echo "Building and deploying to gh-pages branch..."
        
        # Create a temporary directory for the build
        mkdir -p build
        
        # Copy frontend files to build directory
        cp -r frontend/* build/
        
        # Create a temporary branch for deployment
        git checkout --orphan temp-gh-pages
        
        # Remove everything
        git rm -rf .
        
        # Copy build files
        cp -r build/* .
        rm -rf build
        
        # Add all files
        git add .
        
        # Commit
        git commit -m "Deploy to GitHub Pages"
        
        # Force push to gh-pages branch
        git push -f origin temp-gh-pages:gh-pages
        
        # Clean up
        git checkout main
        git branch -D temp-gh-pages
        
        echo "Deployed to gh-pages branch."
    else
        echo "Manual deployment skipped."
    fi
fi

echo "Deployment process completed."
echo "Please test the application to verify that the Firebase integration issues are resolved."
echo "See firebase-integration-fix.md for more information and next steps."
