# Startup Checklist

Before starting the servers, ensure you have completed all of the following:

## ✅ Prerequisites

### 1. Node.js Installed
- **Required**: Node.js v14 or higher
- **Check**: Run `node --version`
- **Install**: Download from https://nodejs.org/ if needed

### 2. npm Installed
- **Required**: npm (comes with Node.js)
- **Check**: Run `npm --version`

## ✅ Installation Steps

### 1. Install Backend Dependencies
```bash
npm install
```
This installs all required packages listed in `package.json`.

### 2. Install Frontend Dependencies
```bash
cd client
npm install
cd ..
```
Or use the convenience script:
```bash
npm run install-all
```

### 3. Environment Configuration
- ✅ `.env` file exists in the root directory
- ✅ Contains your Sportradar API key
- ✅ Contains all required environment variables

**Required .env variables:**
```
SPORTRADAR_API_KEY=your_api_key_here
SPORTRADAR_API_BASE_URL=https://api.sportradar.com/nfl
PORT=3001
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here_change_in_production
DB_PATH=./data/nfl_fantasy.db
```

## ✅ Verify Setup

Run the check script to verify everything is ready:
```bash
npm run check
```

Or manually verify:
```bash
# Check dependencies
test -d node_modules && echo "✅ Backend deps installed" || echo "❌ Install backend deps"
test -d client/node_modules && echo "✅ Frontend deps installed" || echo "❌ Install frontend deps"

# Check .env file
test -f .env && echo "✅ .env file exists" || echo "❌ .env file missing"
```

## 🚀 Starting the Servers

Once everything is installed:

### Option 1: Using npm script (recommended)
```bash
npm run start
```

### Option 2: Using shell script directly
```bash
./start.sh
```

### Option 3: Using the original dev command (foreground)
```bash
npm run dev
```

## 📋 Quick Start Command

If starting fresh, run this sequence:
```bash
# 1. Install all dependencies
npm run install-all

# 2. Verify .env file exists and is configured
cat .env | grep SPORTRADAR_API_KEY

# 3. Start servers
npm run start

# 4. Check status
npm run check
```

## 🔍 Troubleshooting

### "Cannot find module" errors
→ Install missing dependencies: `npm install` or `npm run install-all`

### "Port already in use" errors
→ Stop existing servers: `npm run stop` or manually kill processes on ports 3000/3001

### ".env file not found" error
→ Create `.env` file from `.env.example` and add your API key

### "Permission denied" on scripts
→ Make scripts executable: `chmod +x *.sh`

## 📝 Current Status

Run this command to check your current setup status:
```bash
echo "Node.js: $(node --version 2>/dev/null || echo 'NOT INSTALLED')" && \
echo "npm: $(npm --version 2>/dev/null || echo 'NOT INSTALLED')" && \
test -d node_modules && echo "Backend deps: ✅" || echo "Backend deps: ❌ (run: npm install)" && \
test -d client/node_modules && echo "Frontend deps: ✅" || echo "Frontend deps: ❌ (run: cd client && npm install)" && \
test -f .env && echo ".env file: ✅" || echo ".env file: ❌ (create .env file)"
```

