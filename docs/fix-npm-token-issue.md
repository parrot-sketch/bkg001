# Fixing npm Access Token Expired Error

## Problem

You're getting "Access token expired or revoked" errors when trying to install npm packages.

## Solution Options

### Option 1: Clear npm Authentication (Recommended)

If you're not using a private registry, clear the expired token:

```bash
# Check if you have any auth tokens configured
npm config list

# Remove any expired tokens
npm config delete //registry.npmjs.org/:_authToken
npm config delete //npm.pkg.github.com/:_authToken

# Or clear all auth config
npm config delete _auth
npm config delete _authToken
```

### Option 2: Use pnpm Instead (Recommended for this project)

This project uses pnpm. Install the packages with:

```bash
pnpm add react-pdf pdfjs-dist
```

If you get store location errors, fix it first:

```bash
# Fix pnpm store location
pnpm config set store-dir ~/.local/share/pnpm/store/v3 --global

# Then install
pnpm add react-pdf pdfjs-dist
```

### Option 3: Re-authenticate with npm

If you need to use npm and have a private registry:

```bash
# For GitHub Packages
npm login --scope=@your-scope --registry=https://npm.pkg.github.com

# For npm registry
npm login
```

### Option 4: Use npm with --legacy-peer-deps (Quick Fix)

If you just need to install quickly:

```bash
npm install react-pdf pdfjs-dist --legacy-peer-deps
```

But you'll still need to fix the token issue first.

## Recommended Approach

Since this project uses pnpm, use Option 2:

```bash
pnpm add react-pdf pdfjs-dist
```

This avoids the npm token issue entirely.
