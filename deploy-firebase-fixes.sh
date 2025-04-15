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

# Check if manual deployment is needed
read -p "Do you want to manually deploy to GitHub Pages? (y/n): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    # Check if manual-deploy.sh exists
    if [ -f "manual-deploy.sh" ]; then
        echo "Running manual deployment script..."
        chmod +x manual-deploy.sh
        ./manual-deploy.sh
    else
        echo "Error: manual-deploy.sh not found. Please deploy manually."
        exit 1
    fi
else
    echo "GitHub Actions will automatically deploy the changes to GitHub Pages."
    echo "Please check the Actions tab in your GitHub repository to monitor the deployment."
fi

echo "Deployment process completed."
echo "Please test the application to verify that the Firebase integration issues are resolved."
echo "See firebase-fixes.md for more information and next steps."
