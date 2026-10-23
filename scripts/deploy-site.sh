#!/bin/bash
set -euo pipefail
# Never sync downloads to .com — installer is asia-only
rsync -az --delete --exclude 'downloads/' \
  -e "ssh -o StrictHostKeyChecking=no" \
  /workspace/site/ root@91.92.43.209:/var/www/plugin-dex/
rsync -az -e "ssh -o StrictHostKeyChecking=no" \
  /workspace/site-asia/index.html root@91.92.43.209:/var/www/plugin-dex-asia/index.html
