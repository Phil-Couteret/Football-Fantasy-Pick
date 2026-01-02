#!/bin/bash

# Script to start NFL Fantasy & Pick'em servers

echo "🚀 Starting NFL Fantasy & Pick'em servers..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found. Please create one from .env.example"
    exit 1
fi

# Create data directory if it doesn't exist
mkdir -p data

# Start backend server in background
echo "📦 Starting backend server on port 3001..."
cd "$(dirname "$0")"
node server/index.js > server.log 2>&1 &
BACKEND_PID=$!
echo $BACKEND_PID > .backend.pid

# Wait a moment for backend to start
sleep 2

# Check if backend started successfully
if ps -p $BACKEND_PID > /dev/null; then
    echo "✅ Backend server started (PID: $BACKEND_PID)"
else
    echo "❌ Failed to start backend server. Check server.log for errors."
    exit 1
fi

# Start frontend server in background
echo "🎨 Starting frontend server on port 3000..."
cd client
npm start > ../client.log 2>&1 &
FRONTEND_PID=$!
echo $FRONTEND_PID > ../.frontend.pid
cd ..

# Wait a moment for frontend to start
sleep 3

# Check if frontend started successfully
if ps -p $FRONTEND_PID > /dev/null; then
    echo "✅ Frontend server started (PID: $FRONTEND_PID)"
else
    echo "⚠️  Frontend server may still be starting. Check client.log for details."
fi

echo ""
echo "🎉 Servers are starting!"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:3000"
echo ""
echo "📝 Logs:"
echo "   Backend:  tail -f server.log"
echo "   Frontend: tail -f client.log"
echo ""
echo "🔍 Check status: ./check.sh"
echo "🛑 Stop servers: ./stop.sh"

