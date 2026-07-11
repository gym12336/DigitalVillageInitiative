#!/bin/zsh

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT_DIR" || exit 1

node scripts/start-local.mjs
STATUS=$?

if [[ $STATUS -ne 0 ]]; then
  echo ""
  echo "启动未完成。按回车键关闭此窗口。"
  read -r
fi

exit $STATUS
