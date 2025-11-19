#!/bin/bash
# SessionStart Hook - Install hook dependencies with symlink awareness
# Ensures dependencies are available for all worktrees through shared node_modules

set -e

HOOKS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NODE_MODULES_PATH="$HOOKS_DIR/node_modules"

# Detect if node_modules is a symlink (worktree) or real directory (main repo)
if [ -L "$NODE_MODULES_PATH" ]; then
  # We're in a worktree - resolve symlink to find main repo
  # Must cd to HOOKS_DIR first to resolve relative symlink path correctly
  SYMLINK_TARGET="$(readlink "$NODE_MODULES_PATH")"
  MAIN_HOOKS_DIR="$(cd "$HOOKS_DIR" && cd "$(dirname "$SYMLINK_TARGET")" && pwd)"
  echo "[SessionStart] Detected worktree - installing dependencies in main repo"
  INSTALL_DIR="$MAIN_HOOKS_DIR"
else
  # We're in main repo - install here
  echo "[SessionStart] Installing dependencies in main repo"
  INSTALL_DIR="$HOOKS_DIR"
fi

# Check if dependencies are already installed
if [ -d "$INSTALL_DIR/node_modules" ] && [ -n "$(ls -A "$INSTALL_DIR/node_modules" 2>/dev/null)" ]; then
  echo "[SessionStart] ✓ Dependencies already installed"
  exit 0
fi

# Clean up broken symlinks or non-directory files at node_modules
if [ -e "$INSTALL_DIR/node_modules" ] || [ -L "$INSTALL_DIR/node_modules" ]; then
  if [ ! -d "$INSTALL_DIR/node_modules" ]; then
    echo "[SessionStart] Cleaning up corrupted node_modules (non-directory file or broken symlink)"
    rm -f "$INSTALL_DIR/node_modules"
  fi
fi

# Install dependencies
echo "[SessionStart] Running npm install..."
cd "$INSTALL_DIR" && npm install --silent > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo "[SessionStart] ✓ Hook dependencies installed successfully"
  echo "[SessionStart] All worktrees can now use shared node_modules via symlinks"
else
  echo "[SessionStart] ✗ Failed to install dependencies - hooks may not work"
  exit 1
fi
