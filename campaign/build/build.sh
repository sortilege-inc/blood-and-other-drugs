#!/usr/bin/env bash
# The chronicle's own build: its DSL layer (the cast) through upstream's gate, then its docs and its map.
# Run from anywhere; the books' data/ is upstream's and must already be built.
#
#   bash campaign/build/build.sh
set -euo pipefail
cd "$(dirname "$0")/../.."
bash build/build_layer.sh campaign/dsl campaign "Blood & Other Drugs" campaign/data
python3 campaign/source/check_cast.py
python3 campaign/build/build_docs.py
python3 campaign/build/build_map.py
node --check campaign/data/docs.js
node --check campaign/data/map.js
node --check campaign/site/site.js
echo "campaign build: OK"
