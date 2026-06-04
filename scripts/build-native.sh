#!/usr/bin/env bash
# build-native.sh — compile the Swift HotkeyHelper binary (v2 feature)
# Run: npm run compile:native  (add to package.json scripts when ready)
set -euo pipefail

SWIFT_SRC="native/macos/HotkeyHelper.swift"
OUTPUT="resources/HotkeyHelper"

if ! command -v swiftc &>/dev/null; then
  echo "❌  swiftc not found. Install Xcode Command Line Tools:"
  echo "    xcode-select --install"
  exit 1
fi

echo "→ Compiling HotkeyHelper..."
swiftc -O "$SWIFT_SRC" -o "$OUTPUT"
chmod +x "$OUTPUT"
echo "✓ Built: $OUTPUT"
