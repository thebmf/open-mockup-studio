#!/bin/zsh
# Пересобирает demo.mp4 — синтетическое «видео приложения» для проверки студии.
set -e
cd "$(dirname "$0")"
ffmpeg -y -f lavfi -i "gradients=s=586x1266:c0=0x141833:c1=0x3d5bd6:c2=0x8b3bc9:c3=0x12304f:x0=120:y0=200:x1=460:y1=1100:speed=0.05:d=6:r=30" \
  -vf "scale=1170:2532:flags=lanczos" -c:v libx264 -preset slow -crf 26 -pix_fmt yuv420p -movflags +faststart \
  demo.mp4 >/dev/null 2>&1
echo "→ demo.mp4 — открой студию как http://127.0.0.1:8787/?video=demo.mp4"
