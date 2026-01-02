#!/bin/bash

# Script to stop NFL Fantasy & Pick'em servers

echo "🛑 Stopping NFL Fantasy & Pick'em servers..."
echo ""

# Stop backend server
BACKEND_PID=$(cat .backend.pid 2>/dev/null)
if [ -n "$BACKEND_PID" ] && ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "Stopping backend server (PID: $BACKEND_PID)..."
    kill $BACKEND_PID 2>/dev/null
    sleep 1
    
    # Force kill if still running
    if ps -p $BACKEND_PID > /dev/null 2>&1; then
        echo "Force killing backend server..."
        kill -9 $BACKEND_PID 2>/dev/null
    fi
    
    rm -f .backend.pid
    echo "✅ Backend server stopped"
else
    echo "⚠️  Backend server not running (PID file not found or process not found)"
    # Try to kill any process on port 3001
    PORT_PID=$(lsof -ti:3001 2>/dev/null)
    if [ -n "$PORT_PID" ]; then
        echo "Killing process on port 3001 (PID: $PORT_PID)..."
        kill $PORT_PID 2>/dev/null
        sleep 1
        if ps -p $PORT_PID > /dev/null 2>&1; then
            kill -9 $PORT_PID 2>/dev/null
        fi
        echo "✅ Process on port 3001 stopped"
    fi
fi

echo ""

# Stop frontend server
FRONTEND_PID=$(cat .frontend.pid 2>/dev/null)
if [ -n "$FRONTEND_PID" ] && ps -p $FRONTEND_PID > /dev/null 2>&1; then
    echo "Stopping frontend server (PID: $FRONTEND_PID)..."
    kill $FRONTEND_PID 2>/dev/null
    sleep 1
    
    # Force kill if still running
    if ps -p $FRONTEND_PID > /dev/null 2>&1; then
        echo "Force killing frontend server..."
        kill -9 $FRONTEND_PID 2>/dev/null
    fi
    
    rm -f .frontend.pid
    echo "✅ Frontend server stopped"
else
    echo "⚠️  Frontend server not running (PID file not found or process not found)"
    # Try to kill any process on port 3000
    PORT_PID=$(lsof -ti:3000 2>/dev/null)
    if [ -n "$PORT_PID" ]; then
        echo "Killing process on port 3000 (PID: $PORT_PID)..."
        kill $PORT_PID 2>/dev/null
        sleep 1
        if ps -p $PORT_PID > /dev/null 2>&1; then
            kill -9 $PORT_PID 2>/dev/null
        fi
        echo "✅ Process on port 3000 stopped"
    fi
fi

echo ""
echo "✅ All servers stopped"
echo ""

