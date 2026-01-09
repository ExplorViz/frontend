#!/bin/sh

SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT="$SCRIPT_DIR/.."

INPUT_DIR="$PROJECT_ROOT/sample-manifests"
OUTPUT_DIR="$PROJECT_ROOT/public/manifest-svgs"

mkdir -p "$OUTPUT_DIR"

for file in "$INPUT_DIR"/*.y*ml; do
    [ -e "$file" ] || continue

    filename=$(basename "$file")
    name="${filename%.*}"

    kube-diagrams -o "$OUTPUT_DIR/$name.svg" "$file"
    sed -i 's|https://raw.githubusercontent.com/mingrammer/diagrams/refs/heads/master/resources|/kubeDiagrams-icons|g' "$OUTPUT_DIR/$name.svg"

done
