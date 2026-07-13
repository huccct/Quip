#!/bin/bash
# 打包扩展为 docs/quip.zip（供落地页下载）。只收扩展运行必需文件，绝不把 docs/ 或自己塞进去。
set -e
cd "$(dirname "$0")"
rm -f docs/quip.zip
zip -q -r docs/quip.zip manifest.json content.js popup.html popup.js icons \
  -x '*.DS_Store'
echo "✓ docs/quip.zip 已生成："
unzip -l docs/quip.zip | tail -n +2
