#!/bin/bash
# Script to copy PDF.js worker file to public folder
# Run this after installing/updating pdfjs-dist

set -e

# Find the worker file in node_modules
WORKER_FILE=$(find node_modules -path "*/pdfjs-dist/*/build/pdf.worker.min.mjs" -type f 2>/dev/null | head -1)

if [ -z "$WORKER_FILE" ]; then
    echo "Error: Could not find pdf.worker.min.mjs in node_modules"
    echo "Make sure pdfjs-dist is installed: npm install pdfjs-dist"
    exit 1
fi

# Copy to public folder
cp "$WORKER_FILE" public/pdf.worker.min.mjs

echo "✓ Copied PDF.js worker file to public/pdf.worker.min.mjs"
echo "  Source: $WORKER_FILE"
echo "  Size: $(ls -lh public/pdf.worker.min.mjs | awk '{print $5}')"
