# Server Management Scripts

This project includes scripts to easily manage the development servers.

## Scripts

### Start Servers
```bash
./start.sh
# or
npm run start
```

Starts both the backend (port 3001) and frontend (port 3000) servers in the background.
- Creates PID files (`.backend.pid` and `.frontend.pid`) to track running processes
- Outputs logs to `server.log` and `client.log`
- Checks for `.env` file before starting
- Creates data directory if needed

### Check Server Status
```bash
./check.sh
# or
npm run check
```

Shows the current status of both servers:
- Whether each server is running
- Process IDs (PIDs)
- Port status (3000 and 3001)
- API health check
- Process resource usage (CPU, memory, uptime)

### Stop Servers
```bash
./stop.sh
# or
npm run stop
```

Stops both servers gracefully:
- Sends termination signals to running processes
- Force kills if processes don't stop gracefully
- Cleans up PID files
- Also kills any processes using ports 3000 or 3001

## Usage Examples

### Basic Workflow
```bash
# Start servers
./start.sh

# Check status
./check.sh

# View logs
tail -f server.log    # Backend logs
tail -f client.log    # Frontend logs

# Stop servers when done
./stop.sh
```

### Troubleshooting

If servers won't start or stop properly:

1. Check if ports are in use:
   ```bash
   lsof -ti:3000  # Frontend port
   lsof -ti:3001  # Backend port
   ```

2. Manually kill processes:
   ```bash
   kill -9 $(lsof -ti:3000)
   kill -9 $(lsof -ti:3001)
   ```

3. Remove PID files and restart:
   ```bash
   rm -f .backend.pid .frontend.pid
   ./start.sh
   ```

## Alternative: Using npm run dev

You can also use the original `npm run dev` command which runs both servers in the foreground using `concurrently`. This is useful for development when you want to see live output:

```bash
npm run dev
```

Press `Ctrl+C` to stop both servers.

