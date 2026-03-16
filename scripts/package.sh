#!/bin/bash
# Know AI ERP - Package for Release
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
RELEASE_DIR="/Users/darshjme/knowai-erp-release"
ZIP_FILE="/Users/darshjme/knowai-erp-v1.0.zip"

echo "=== Know AI ERP - Packaging ==="

# Step 1: Run the build
echo "Step 1: Running production build..."
bash "$ROOT_DIR/scripts/build.sh"

# Step 2: Create release directory (clean slate)
echo "Step 2: Creating release directory..."
rm -rf "$RELEASE_DIR"
mkdir -p "$RELEASE_DIR/frontend"
mkdir -p "$RELEASE_DIR/backend"
mkdir -p "$RELEASE_DIR/scripts"

# Step 3: Copy frontend build output
echo "Step 3: Copying frontend dist..."
cp -r "$ROOT_DIR/frontend/dist" "$RELEASE_DIR/frontend/dist"

# Step 4: Copy backend artifacts
echo "Step 4: Copying backend artifacts..."
cp -r "$ROOT_DIR/backend/.next" "$RELEASE_DIR/backend/.next"
cp -r "$ROOT_DIR/backend/prisma" "$RELEASE_DIR/backend/prisma"
cp "$ROOT_DIR/backend/package.json" "$RELEASE_DIR/backend/package.json"

# Copy pruned node_modules (production only)
echo "Step 5: Copying pruned backend node_modules..."
cd "$ROOT_DIR/backend"
cp -r node_modules "$RELEASE_DIR/backend/node_modules"
cd "$RELEASE_DIR/backend"
npm prune --production 2>/dev/null || true

# Step 6: Copy docs if exists
if [ -d "$ROOT_DIR/docs" ]; then
  echo "Step 6: Copying docs..."
  cp -r "$ROOT_DIR/docs" "$RELEASE_DIR/docs"
fi

# Step 7: Copy scripts
echo "Step 7: Copying scripts..."
cp "$ROOT_DIR/scripts/build.sh" "$RELEASE_DIR/scripts/"
cp "$ROOT_DIR/scripts/start-prod.sh" "$RELEASE_DIR/scripts/"
cp "$ROOT_DIR/scripts/package.sh" "$RELEASE_DIR/scripts/"
# Copy any other scripts that exist
for f in "$ROOT_DIR/scripts/"*.sh; do
  [ -f "$f" ] && cp "$f" "$RELEASE_DIR/scripts/" 2>/dev/null || true
done
chmod +x "$RELEASE_DIR/scripts/"*.sh

# Step 8: Copy root config files
echo "Step 8: Copying config files..."
[ -f "$ROOT_DIR/docker-compose.yml" ] && cp "$ROOT_DIR/docker-compose.yml" "$RELEASE_DIR/"
[ -f "$ROOT_DIR/.env.example" ] && cp "$ROOT_DIR/.env.example" "$RELEASE_DIR/"
[ -f "$ROOT_DIR/README.md" ] && cp "$ROOT_DIR/README.md" "$RELEASE_DIR/"

# Step 9: Create zip
echo "Step 9: Creating zip archive..."
rm -f "$ZIP_FILE"
cd /Users/darshjme
zip -r "$ZIP_FILE" "knowai-erp-release/" -x "*/node_modules/.cache/*" "*/.*"

echo ""
echo "=== Packaging Complete ==="
echo "Release directory: $RELEASE_DIR"
echo "Zip archive: $ZIP_FILE"
ls -lh "$ZIP_FILE"
