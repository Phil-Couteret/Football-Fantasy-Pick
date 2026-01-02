const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/nfl_fantasy.db');

// Ensure data directory exists
const dbDir = path.dirname(DB_PATH);
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = null;

const init = () => {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('Connected to SQLite database');
      createTables().then(resolve).catch(reject);
    });
  });
};

const createTables = () => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Fantasy leagues table
      db.run(`CREATE TABLE IF NOT EXISTS fantasy_leagues (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        commissioner_id INTEGER NOT NULL,
        season_year INTEGER NOT NULL,
        max_teams INTEGER DEFAULT 12,
        draft_date TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (commissioner_id) REFERENCES users(id)
      )`);

      // Fantasy teams table
      db.run(`CREATE TABLE IF NOT EXISTS fantasy_teams (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        league_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        team_name TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (league_id) REFERENCES fantasy_leagues(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(league_id, user_id)
      )`);

      // Fantasy roster (players on teams)
      db.run(`CREATE TABLE IF NOT EXISTS fantasy_rosters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        player_id TEXT NOT NULL,
        player_name TEXT NOT NULL,
        position TEXT NOT NULL,
        team_abbr TEXT,
        added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES fantasy_teams(id)
      )`);

      // Fantasy lineup (active players for a week)
      db.run(`CREATE TABLE IF NOT EXISTS fantasy_lineups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id INTEGER NOT NULL,
        season INTEGER NOT NULL,
        week INTEGER NOT NULL,
        qb_player_id TEXT,
        rb1_player_id TEXT,
        rb2_player_id TEXT,
        wr1_player_id TEXT,
        wr2_player_id TEXT,
        te_player_id TEXT,
        flex_player_id TEXT,
        k_player_id TEXT,
        def_player_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (team_id) REFERENCES fantasy_teams(id),
        UNIQUE(team_id, season, week)
      )`);

      // Pick'em groups
      db.run(`CREATE TABLE IF NOT EXISTS pickem_groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        admin_id INTEGER NOT NULL,
        season_year INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (admin_id) REFERENCES users(id)
      )`);

      // Pick'em group members
      db.run(`CREATE TABLE IF NOT EXISTS pickem_group_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES pickem_groups(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(group_id, user_id)
      )`);

      // Pick'em picks
      db.run(`CREATE TABLE IF NOT EXISTS pickem_picks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        group_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        game_id TEXT NOT NULL,
        picked_team_id TEXT NOT NULL,
        season INTEGER NOT NULL,
        week INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (group_id) REFERENCES pickem_groups(id),
        FOREIGN KEY (user_id) REFERENCES users(id),
        UNIQUE(group_id, user_id, game_id)
      )`);

      // Cached NFL data
      db.run(`CREATE TABLE IF NOT EXISTS nfl_teams_cache (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        market TEXT NOT NULL,
        alias TEXT,
        conference TEXT,
        division TEXT,
        venue_name TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS nfl_schedule_cache (
        id TEXT PRIMARY KEY,
        season INTEGER NOT NULL,
        week INTEGER NOT NULL,
        scheduled TEXT NOT NULL,
        home_team_id TEXT NOT NULL,
        away_team_id TEXT NOT NULL,
        status TEXT,
        home_score INTEGER,
        away_score INTEGER,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS nfl_players_cache (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        position TEXT,
        team_id TEXT,
        jersey_number TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS nfl_stats_cache (
        player_id TEXT NOT NULL,
        game_id TEXT NOT NULL,
        season INTEGER NOT NULL,
        week INTEGER NOT NULL,
        passing_yards INTEGER DEFAULT 0,
        passing_tds INTEGER DEFAULT 0,
        passing_ints INTEGER DEFAULT 0,
        rushing_yards INTEGER DEFAULT 0,
        rushing_tds INTEGER DEFAULT 0,
        receiving_yards INTEGER DEFAULT 0,
        receiving_tds INTEGER DEFAULT 0,
        receptions INTEGER DEFAULT 0,
        fumbles INTEGER DEFAULT 0,
        fantasy_points REAL DEFAULT 0,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (player_id, game_id)
      )`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};

module.exports = {
  init,
  getDb
};

