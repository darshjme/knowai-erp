#!/bin/bash
# Know AI ERP - Production Build Script
set -e

echo "Building Know AI ERP..."

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Build frontend
cd "$ROOT_DIR/frontend"
npm ci
npm run build
echo "Frontend built to frontend/dist/"

# Build backend
cd "$ROOT_DIR/backend"
npm ci
npx prisma generate
npm run build
echo "Backend built to backend/.next/"

echo "Build complete!"
