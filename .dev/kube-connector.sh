#!/bin/sh


SCRIPT_DIR=$(dirname "$0")
PROJECT_ROOT="$SCRIPT_DIR/.."

INPUT_DIR="$PROJECT_ROOT/sample-manifests"
OUTPUT_DIR="$PROJECT_ROOT/src/components/manifestDOT"

mkdir -p "$OUTPUT_DIR"

echo "📦 Generating .dot files from Kubernetes manifests..."

for file in "$INPUT_DIR"/*.y*ml; do
    [ -e "$file" ] || continue     # skip if no files found

    filename=$(basename "$file")
    name="${filename%.*}"

    echo "➡️  Processing $file -> $OUTPUT_DIR/$name.dot"

    kube-diagrams -o "$OUTPUT_DIR/$name.dot" "$file"
done

echo "✅ Done!"

