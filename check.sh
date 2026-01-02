#!/bin/bash

# Script to check NFL Fantasy & Pick'em server status

echo "🔍 Checking server status..."
echo ""

# Check backend
BACKEND_PID=$(cat .backend.pid 2>/dev/null)
if [ -n "$BACKEND_PID" ] && ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "✅ Backend server: RUNNING (PID: $BACKEND_PID)"
    BACKEND_PORT=$(lsof -ti:3001 2>/dev/null)
    if [ -n "$BACKEND_PORT" ]; then
        echo "   Port 3001: IN USE"
    else
        echo "   Port 3001: NOT LISTENING"
    fi
else
    echo "❌ Backend server: NOT RUNNING"
    echo "   Port 3001: NOT IN USE"
fi

echo ""

# Check frontend
FRONTEND_PID=$(cat .frontend.pid 2>/dev/null)
if [ -n "$FRONTEND_PID" ] && ps -p $FRONTEND_PID > /dev/null 2>&1; then
    echo "✅ Frontend server: RUNNING (PID: $FRONTEND_PID)"
    FRONTEND_PORT=$(lsof -ti:3000 2>/dev/null)
    if [ -n "$FRONTEND_PORT" ]; then
        echo "   Port 3000: IN USE"
    else
        echo "   Port 3000: NOT LISTENING"
    fi
else
    echo "❌ Frontend server: NOT RUNNING"
    echo "   Port 3000: NOT IN USE"
fi

echo ""

# Test backend API
if [ -n "$BACKEND_PID" ] && ps -p $BACKEND_PID > /dev/null 2>&1; then
    echo "🧪 Testing backend API..."
    HEALTH_CHECK=$(curl -s http://localhost:3001/api/health 2>/dev/null)
    if [ $? -eq 0 ] && [ -n "$HEALTH_CHECK" ]; then
        echo "   ✅ API responding: $HEALTH_CHECK"
    else
        echo "   ⚠️  API not responding yet (may still be starting)"
    fi
fi

echo ""
echo "📊 Process details:"
if [ -n "$BACKEND_PID" ] && ps -p $BACKEND_PID > /dev/null 2>&1; then
    ps -p $BACKEND_PID -o pid,comm,etime,pcpu,pmem | tail -n +2 | awk '{print "   Backend:  " $0}'
fi
if [ -n "$FRONTEND_PID" ] && ps -p $FRONTEND_PID > /dev/null 2>&1; then
    ps -p $FRONTEND_PID -o pid,comm,etime,pcpu,pmem | tail -n +2 | awk '{print "   Frontend: " $0}'
fi

echo ""

