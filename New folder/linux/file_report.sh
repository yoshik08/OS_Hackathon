#!/usr/bin/env bash
set -euo pipefail

target="${1:-.}"
echo "Files under: $target"
find "$target" -maxdepth 1 -type f -printf '%f\n' | sort
