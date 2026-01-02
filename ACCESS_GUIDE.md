# How to Access the Servers

## 🚀 Server URLs

Once the servers are running, access them at:

### Frontend Application (Main UI)
```
http://localhost:3000
```
- **This is your main entry point**
- Open this URL in your web browser
- The React application will automatically connect to the backend API
- All user interactions happen here

### Backend API Server
```
http://localhost:3001
```
- This is the REST API server
- Directly accessible for API calls
- Main endpoint: `http://localhost:3001/api`

### Backend Health Check
```
http://localhost:3001/api/health
```
- Test if the backend is running
- Returns: `{"status":"ok","message":"NFL Fantasy & Pick'em API is running"}`

## 📋 Quick Access Steps

1. **Start the servers:**
   ```bash
   npm run start
   # or
   ./start.sh
   ```

2. **Wait for startup messages** (usually 10-30 seconds)

3. **Open your web browser** and navigate to:
   ```
   http://localhost:3000
   ```

4. **You should see the home page** with options to:
   - Register/Login
   - View Fantasy Football features
   - View Pick'em game features

## 🔍 Verify Servers Are Running

### Option 1: Use the check script
```bash
npm run check
```

### Option 2: Check URLs in browser
- Frontend: Visit `http://localhost:3000` - should show the app
- Backend: Visit `http://localhost:3001/api/health` - should return JSON

### Option 3: Check ports manually
```bash
# Check if ports are in use
lsof -ti:3000  # Frontend port
lsof -ti:3001  # Backend port
```

## 🌐 Network Access

By default, servers only accept connections from `localhost` (same machine).

### To access from other devices on your network:

1. **Find your local IP address:**
   ```bash
   # macOS/Linux
   ifconfig | grep "inet " | grep -v 127.0.0.1
   
   # Or
   ipconfig getifaddr en0  # macOS
   ```

2. **Access using your IP:**
   - Frontend: `http://YOUR_IP:3000`
   - Backend: `http://YOUR_IP:3001/api`

   Example: `http://192.168.1.100:3000`

**Note:** For network access, you may need to:
- Configure firewall rules
- Update CORS settings in the backend (currently allows all origins)
- Ensure React dev server accepts external connections

## 🐛 Troubleshooting

### "This site can't be reached" or "Connection refused"
- Check if servers are running: `npm run check`
- Check if ports are available: `lsof -ti:3000` and `lsof -ti:3001`
- Start servers if needed: `npm run start`

### Frontend shows errors connecting to API
- Verify backend is running on port 3001
- Check browser console for specific error messages
- Test backend directly: `http://localhost:3001/api/health`

### Port already in use
- Stop existing servers: `npm run stop`
- Or kill processes manually:
  ```bash
  kill $(lsof -ti:3000)
  kill $(lsof -ti:3001)
  ```

## 📱 Using the Application

1. **First Visit:**
   - Go to `http://localhost:3000`
   - Click "Register" to create an account
   - Or "Login" if you already have an account

2. **After Login:**
   - Navigate to "Fantasy" to create/join leagues
   - Navigate to "Pick'em" to create/join pick'em groups
   - Use the navigation bar to switch between sections

3. **API Endpoints:**
   - All API calls are made automatically by the frontend
   - Backend API is accessible at `http://localhost:3001/api/*`
   - See README.md for full API documentation

## 🔐 Default Configuration

- **Backend Port:** 3001 (configurable in `.env` as `PORT`)
- **Frontend Port:** 3000 (React default, can be changed with `PORT` env var)
- **API Base URL:** `http://localhost:3001/api`
- **CORS:** Enabled for all origins (development mode)

## 📝 Notes

- Both servers must be running for the app to work
- Frontend requires backend to be running (makes API calls)
- Backend can run independently (useful for API testing)
- Database is automatically created in `./data/nfl_fantasy.db` on first run

