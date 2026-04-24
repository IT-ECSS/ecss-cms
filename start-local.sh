#!/bin/bash

# SkillsFuture Local Development Startup Script
# Starts both frontend and backend servers

set -e

PROJECT_ROOT="/Users/moseslee/Desktop/ecss-cms"
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "======================================"
echo "SkillsFuture Development Environment"
echo "======================================"
echo ""

# Check if .env files exist
if [ ! -f "$BACKEND_DIR/.env" ]; then
  echo "❌ Missing: backend/.env"
  echo "Please create backend/.env with SF_PUBLIC_KEY, SF_ENCRYPTION_KEY, etc."
  exit 1
fi

if [ ! -f "$FRONTEND_DIR/.env" ]; then
  echo "❌ Missing: frontend/.env"
  echo "Please create frontend/.env with REACT_APP_BACKEND_URL"
  exit 1
fi

echo "✓ Environment files found"
echo ""

# Start backend in background
echo "Starting Backend Server..."
cd "$BACKEND_DIR"
npm start &
BACKEND_PID=$!
echo "✓ Backend started (PID: $BACKEND_PID)"
echo "  Backend URL: http://localhost:5000"
echo ""

# Wait for backend to start
sleep 2

# Start frontend in background
echo "Starting Frontend Server..."
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
echo "✓ Frontend started (PID: $FRONTEND_PID)"
echo "  Frontend URL: http://localhost:3000"
echo "  Payment Page: http://localhost:3000/skillsfuture/payment"
echo ""

echo "======================================"
echo "✓ Both servers are running!"
echo "======================================"
echo ""
echo "To stop servers, press Ctrl+C"
echo ""

# Wait for both processes
wait $BACKEND_PID $FRONTEND_PID
