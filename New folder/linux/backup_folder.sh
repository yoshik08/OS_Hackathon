#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 2 ]]; then
  echo "usage: $0 SOURCE_DIR DEST_DIR" >&2
  exit 2
fi

mkdir -p "$2"
cp -a "$1"/. "$2"/
echo "backup copied to $2"
