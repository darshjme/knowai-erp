#!/bin/bash
# Know AI ERP - Start Production Servers
set -e

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR/backend" && npm start &
cd "$ROOT_DIR/frontend" && npx serve dist -l 5173 &

echo "Frontend: http://localhost:5173"
echo "Backend: http://localhost:3001"
wait
