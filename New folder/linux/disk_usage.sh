#!/usr/bin/env bash
set -euo pipefail

echo "Filesystem usage:"
df -h
echo
echo "Current directory size:"
du -sh .
