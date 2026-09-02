#!/bin/zsh
# Конвертирует записанный .webm в .mp4 (H.264 + AAC), пригодный для App Store,
# соцсетей и Keynote. Требует ffmpeg: brew install ffmpeg
set -e
if [ -z "$1" ]; then
  echo "Использование: ./to-mp4.sh /путь/до/mockup.webm [crf]"
  echo "  crf: 18 — почти без потерь, 23 — по умолчанию, 28 — компактно"
  exit 1
fi
IN="$1"
CRF="${2:-20}"
OUT="${IN%.*}.mp4"
ffmpeg -y -i "$IN" \
  -c:v libx264 -preset slow -crf "$CRF" -pix_fmt yuv420p \
  -vf "scale=trunc(iw/2)*2:trunc(ih/2)*2" \
  -movflags +faststart \
  -c:a aac -b:a 192k \
  "$OUT"
echo "→ $OUT"
