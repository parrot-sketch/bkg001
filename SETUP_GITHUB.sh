#!/bin/bash

# GitHub Repository Setup Script
# This script helps you connect your local repository to a new GitHub repository

set -e

echo "🚀 GitHub Repository Setup"
echo "=========================="
echo ""

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Error: Git is not initialized in this directory"
    exit 1
fi

# Check current remote
echo "📋 Current remote configuration:"
git remote -v
echo ""

# Prompt for GitHub repository URL
echo "Please provide your GitHub repository URL:"
echo "  Example (SSH): git@github.com:username/repo-name.git"
echo "  Example (HTTPS): https://github.com/username/repo-name.git"
echo ""
read -p "GitHub repository URL: " REPO_URL

if [ -z "$REPO_URL" ]; then
    echo "❌ Error: Repository URL is required"
    exit 1
fi

# Remove existing remote if it exists
if git remote get-url origin &>/dev/null; then
    echo "🗑️  Removing existing 'origin' remote..."
    git remote remove origin
fi

# Add new remote
echo "➕ Adding new remote 'origin'..."
git remote add origin "$REPO_URL"

# Verify remote
echo ""
echo "✅ Remote configured:"
git remote -v
echo ""

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "📌 Current branch: $CURRENT_BRANCH"

# Ask if user wants to push
echo ""
read -p "Do you want to push to GitHub now? (y/n): " PUSH_NOW

if [ "$PUSH_NOW" = "y" ] || [ "$PUSH_NOW" = "Y" ]; then
    echo ""
    echo "📤 Pushing to GitHub..."
    
    # Ensure we're on main branch
    if [ "$CURRENT_BRANCH" != "main" ]; then
        echo "🔄 Switching to 'main' branch..."
        git checkout -b main 2>/dev/null || git checkout main
    fi
    
    # Push to GitHub
    git push -u origin main
    
    echo ""
    echo "✅ Successfully pushed to GitHub!"
    echo "🌐 Your repository is now available at: $REPO_URL"
else
    echo ""
    echo "ℹ️  Remote configured. You can push later with:"
    echo "   git push -u origin main"
fi

echo ""
echo "✨ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Set up environment variables in your deployment platform"
echo "2. Configure database connection"
echo "3. Deploy to Vercel (see DEPLOYMENT.md)"
echo ""
