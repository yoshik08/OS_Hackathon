#!/usr/bin/env bash
set -euo pipefail

if [[ $# -eq 0 ]]; then
  echo "usage: $0 FILE" >&2
  exit 2
fi

wc -l -- "$1"
