#!/bin/bash
# ESLint fix formatter for Zed editor
# Receives content via stdin, writes to file, fixes, and outputs result

set -e

# Get the file path from argument
FILE_PATH="$1"

# If FILE_PATH is provided and exists, fix it directly
if [ -n "$FILE_PATH" ] && [ -f "$FILE_PATH" ]; then
  # Fix the file in place (suppress errors)
  bunx eslint --fix "$FILE_PATH" 2>/dev/null || true
  # Output the fixed content
  cat "$FILE_PATH"
else
  # Fallback: just pass through stdin (Zed should always provide file path)
  cat
fi
