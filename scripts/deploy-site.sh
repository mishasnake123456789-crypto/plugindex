#!/bin/bash
set -euo pipefail
# preserve server-side downloads/
rsync -az --delete --exclude 'downloads/' \
  -e "ssh -o StrictHostKeyChecking=no" \
  /workspace/site/ root@91.92.43.209:/var/www/plugin-dex/
