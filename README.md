# NFL Fantasy & Pick'em

A full-stack web application for playing Fantasy NFL Football and Pick'em games with friends, powered by the Sportradar NFL API.

**GitHub Repository:** [https://github.com/Phil-Couteret/Football-Fantasy-Pick](https://github.com/Phil-Couteret/Football-Fantasy-Pick)

## Features

### Fantasy Football
- Create and join fantasy leagues
- Draft NFL players to your team
- Set weekly lineups
- Track team performance and standings
- Real-time scoring based on player statistics

### Pick'em Game
- Create pick'em groups
- Make weekly picks for NFL games
- View leaderboards
- Track your win/loss record

### NFL Data Integration
- Real-time game schedules
- Team rosters and player information
- Game statistics and scoring
- Powered by Sportradar NFL API

## Tech Stack

### Backend
- Node.js with Express.js
- SQLite database
- JWT authentication
- Sportradar NFL API integration

### Frontend
- React with React Router
- Modern, responsive UI
- Context API for state management

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Sportradar API key (get one at https://developer.sportradar.com/)

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Phil-Couteret/Football-Fantasy-Pick.git
cd Football-Fantasy-Pick
```

2. Install backend dependencies:
```bash
npm install
```

3. Install frontend dependencies:
```bash
cd client
npm install
cd ..
```

4. Create a `.env` file in the root directory:
```bash
# Copy the example and fill in your values
cp .env.example .env
```

5. Edit the `.env` file and add your Sportradar API key:
```
SPORTRADAR_API_KEY=your_api_key_here
SPORTRADAR_API_BASE_URL=https://api.sportradar.com/nfl
PORT=3001
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here_change_in_production
DB_PATH=./data/nfl_fantasy.db
```

## Running the Application

### Development Mode

Run both backend and frontend concurrently:
```bash
npm run dev
```

Or run them separately:

**Backend:**
```bash
npm run server
```

**Frontend:**
```bash
npm run client
```

The backend will run on `http://localhost:3001` and the frontend on `http://localhost:3000`.

### Production Build

Build the frontend:
```bash
npm run build
```

The built files will be in the `client/build` directory.

## Getting a Sportradar API Key

1. Visit https://developer.sportradar.com/
2. Sign up for a free account
3. Navigate to "My Apps" and create a new application
4. Select the NFL API product
5. Copy your API key and add it to your `.env` file

**Note:** The free tier has rate limits. For production use, consider upgrading to a paid plan.

## Project Structure

```
.
├── server/
│   ├── config/
│   │   └── database.js          # SQLite database setup
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── users.js             # User routes
│   │   ├── fantasy.js           # Fantasy football routes
│   │   ├── pickem.js            # Pick'em routes
│   │   └── nfl.js               # NFL data routes
│   ├── services/
│   │   └── sportradar.js        # Sportradar API service
│   └── index.js                 # Express server
├── client/
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── context/             # React Context (Auth)
│   │   ├── pages/               # Page components
│   │   └── services/            # API service
│   └── public/
└── data/                        # SQLite database (created automatically)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user

### Fantasy Football
- `GET /api/fantasy/leagues` - Get all leagues
- `POST /api/fantasy/leagues` - Create a league
- `GET /api/fantasy/leagues/:id` - Get league details
- `POST /api/fantasy/leagues/:id/join` - Join a league
- `GET /api/fantasy/leagues/:id/teams` - Get league teams
- `GET /api/fantasy/leagues/:id/standings` - Get league standings
- `GET /api/fantasy/teams/:id/roster` - Get team roster
- `POST /api/fantasy/teams/:id/roster` - Add player to roster
- `POST /api/fantasy/teams/:id/lineup` - Set weekly lineup

### Pick'em
- `GET /api/pickem/groups` - Get all groups
- `POST /api/pickem/groups` - Create a group
- `POST /api/pickem/groups/:id/join` - Join a group
- `POST /api/pickem/groups/:id/picks` - Make a pick
- `GET /api/pickem/groups/:id/picks/:week` - Get picks for a week
- `GET /api/pickem/groups/:id/leaderboard` - Get group leaderboard

### NFL Data
- `GET /api/nfl/teams` - Get all teams
- `GET /api/nfl/schedule/:season` - Get season schedule
- `GET /api/nfl/schedule/:season/:type/:week` - Get week schedule
- `GET /api/nfl/games/:id` - Get game details
- `GET /api/nfl/teams/:id/roster` - Get team roster
- `GET /api/nfl/players/:id` - Get player profile
- `GET /api/nfl/games/:id/stats` - Get game statistics
- `GET /api/nfl/players/search/:query` - Search players

## Fantasy Scoring System

Standard PPR (Point Per Reception) scoring:
- Passing Yards: 1 point per 25 yards
- Passing TDs: 4 points
- Interceptions: -2 points
- Rushing Yards: 1 point per 10 yards
- Rushing TDs: 6 points
- Receiving Yards: 1 point per 10 yards
- Receiving TDs: 6 points
- Receptions: 1 point
- Fumbles Lost: -2 points

## Database Schema

The application uses SQLite with the following main tables:
- `users` - User accounts
- `fantasy_leagues` - Fantasy football leagues
- `fantasy_teams` - User teams in leagues
- `fantasy_rosters` - Players on teams
- `fantasy_lineups` - Weekly lineups
- `pickem_groups` - Pick'em groups
- `pickem_picks` - User picks
- `nfl_teams_cache` - Cached NFL team data
- `nfl_schedule_cache` - Cached schedule data
- `nfl_players_cache` - Cached player data
- `nfl_stats_cache` - Cached player statistics

## Contributing

1. Fork the repository: [https://github.com/Phil-Couteret/Football-Fantasy-Pick](https://github.com/Phil-Couteret/Football-Fantasy-Pick)
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License

## Disclaimer

This application is for personal/educational use. Make sure to comply with Sportradar's API terms of service and NFL's usage policies. The data provided by Sportradar is subject to their terms and conditions.

## Support

For issues related to:
- **Sportradar API**: Visit https://developer.sportradar.com/docs
- **Application Issues**: Open an issue on GitHub

## Future Enhancements

- [ ] Live scoring updates
- [ ] Push notifications
- [ ] Mobile app
- [ ] Advanced league settings
- [ ] Trade management
- [ ] Waiver wire system
- [ ] Playoff brackets
- [ ] Custom scoring rules

