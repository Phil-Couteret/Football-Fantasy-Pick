const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const sportradar = require('../services/sportradar');

const router = express.Router();

// Get all leagues
router.get('/leagues', authenticateToken, (req, res) => {
  const database = db.getDb();
  database.all(
    `SELECT fl.*, u.username as commissioner_name,
     (SELECT COUNT(*) FROM fantasy_teams WHERE league_id = fl.id) as team_count
     FROM fantasy_leagues fl
     JOIN users u ON fl.commissioner_id = u.id`,
    (err, leagues) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(leagues);
    }
  );
});

// Create a league
router.post('/leagues', authenticateToken, (req, res) => {
  const { name, season_year, max_teams, draft_date } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'League name is required' });
  }

  const database = db.getDb();
  const season = season_year || sportradar.getCurrentSeason();

  database.run(
    'INSERT INTO fantasy_leagues (name, commissioner_id, season_year, max_teams, draft_date) VALUES (?, ?, ?, ?, ?)',
    [name, req.user.userId, season, max_teams || 12, draft_date || null],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create league' });
      }
      res.status(201).json({
        id: this.lastID,
        name,
        season_year: season,
        message: 'League created successfully'
      });
    }
  );
});

// Join a league (create a team)
router.post('/leagues/:leagueId/join', authenticateToken, (req, res) => {
  const { team_name } = req.body;
  const { leagueId } = req.params;

  if (!team_name) {
    return res.status(400).json({ error: 'Team name is required' });
  }

  const database = db.getDb();

  // Check if league exists and has space
  database.get(
    'SELECT * FROM fantasy_leagues WHERE id = ?',
    [leagueId],
    (err, league) => {
      if (err || !league) {
        return res.status(404).json({ error: 'League not found' });
      }

      // Check team count
      database.get(
        'SELECT COUNT(*) as count FROM fantasy_teams WHERE league_id = ?',
        [leagueId],
        (err, result) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          if (result.count >= league.max_teams) {
            return res.status(400).json({ error: 'League is full' });
          }

          // Check if user already has a team
          database.get(
            'SELECT * FROM fantasy_teams WHERE league_id = ? AND user_id = ?',
            [leagueId, req.user.userId],
            (err, existingTeam) => {
              if (err) {
                return res.status(500).json({ error: 'Database error' });
              }
              if (existingTeam) {
                return res.status(400).json({ error: 'You already have a team in this league' });
              }

              // Create team
              database.run(
                'INSERT INTO fantasy_teams (league_id, user_id, team_name) VALUES (?, ?, ?)',
                [leagueId, req.user.userId, team_name],
                function(err) {
                  if (err) {
                    return res.status(500).json({ error: 'Failed to join league' });
                  }
                  res.status(201).json({
                    id: this.lastID,
                    team_name,
                    message: 'Joined league successfully'
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

// Get league details
router.get('/leagues/:leagueId', authenticateToken, (req, res) => {
  const database = db.getDb();
  database.get(
    `SELECT fl.*, u.username as commissioner_name
     FROM fantasy_leagues fl
     JOIN users u ON fl.commissioner_id = u.id
     WHERE fl.id = ?`,
    [req.params.leagueId],
    (err, league) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!league) {
        return res.status(404).json({ error: 'League not found' });
      }
      res.json(league);
    }
  );
});

// Get league teams
router.get('/leagues/:leagueId/teams', authenticateToken, (req, res) => {
  const database = db.getDb();
  database.all(
    `SELECT ft.*, u.username as owner_name
     FROM fantasy_teams ft
     JOIN users u ON ft.user_id = u.id
     WHERE ft.league_id = ?`,
    [req.params.leagueId],
    (err, teams) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(teams);
    }
  );
});

// Get team roster
router.get('/teams/:teamId/roster', authenticateToken, (req, res) => {
  const database = db.getDb();
  database.all(
    'SELECT * FROM fantasy_rosters WHERE team_id = ?',
    [req.params.teamId],
    (err, roster) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(roster);
    }
  );
});

// Add player to roster
router.post('/teams/:teamId/roster', authenticateToken, (req, res) => {
  const { player_id, player_name, position, team_abbr } = req.body;
  const { teamId } = req.params;

  if (!player_id || !player_name || !position) {
    return res.status(400).json({ error: 'Player information is required' });
  }

  const database = db.getDb();

  // Verify team ownership
  database.get(
    'SELECT * FROM fantasy_teams WHERE id = ? AND user_id = ?',
    [teamId, req.user.userId],
    (err, team) => {
      if (err || !team) {
        return res.status(403).json({ error: 'Unauthorized or team not found' });
      }

      database.run(
        'INSERT INTO fantasy_rosters (team_id, player_id, player_name, position, team_abbr) VALUES (?, ?, ?, ?, ?)',
        [teamId, player_id, player_name, position, team_abbr || null],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to add player' });
          }
          res.status(201).json({
            id: this.lastID,
            message: 'Player added to roster'
          });
        }
      );
    }
  );
});

// Set lineup for a week
router.post('/teams/:teamId/lineup', authenticateToken, (req, res) => {
  const { season, week, qb, rb1, rb2, wr1, wr2, te, flex, k, def } = req.body;
  const { teamId } = req.params;

  if (!season || !week) {
    return res.status(400).json({ error: 'Season and week are required' });
  }

  const database = db.getDb();

  // Verify team ownership
  database.get(
    'SELECT * FROM fantasy_teams WHERE id = ? AND user_id = ?',
    [teamId, req.user.userId],
    (err, team) => {
      if (err || !team) {
        return res.status(403).json({ error: 'Unauthorized or team not found' });
      }

      database.run(
        `INSERT OR REPLACE INTO fantasy_lineups 
         (team_id, season, week, qb_player_id, rb1_player_id, rb2_player_id, 
          wr1_player_id, wr2_player_id, te_player_id, flex_player_id, k_player_id, def_player_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [teamId, season, week, qb, rb1, rb2, wr1, wr2, te, flex, k, def],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to set lineup' });
          }
          res.json({ message: 'Lineup set successfully' });
        }
      );
    }
  );
});

// Get team standings (points scored)
router.get('/leagues/:leagueId/standings', authenticateToken, async (req, res) => {
  const database = db.getDb();
  const season = sportradar.getCurrentSeason();

  // Get all teams in the league
  database.all(
    'SELECT * FROM fantasy_teams WHERE league_id = ?',
    [req.params.leagueId],
    async (err, teams) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Calculate points for each team
      const standings = await Promise.all(teams.map(team => {
        return new Promise((resolve) => {
          database.all(
            `SELECT SUM(fantasy_points) as total_points
             FROM nfl_stats_cache nsc
             JOIN fantasy_lineups fl ON (
               nsc.player_id = fl.qb_player_id OR
               nsc.player_id = fl.rb1_player_id OR
               nsc.player_id = fl.rb2_player_id OR
               nsc.player_id = fl.wr1_player_id OR
               nsc.player_id = fl.wr2_player_id OR
               nsc.player_id = fl.te_player_id OR
               nsc.player_id = fl.flex_player_id OR
               nsc.player_id = fl.k_player_id OR
               nsc.player_id = fl.def_player_id
             )
             WHERE fl.team_id = ? AND nsc.season = ?`,
            [team.id, season],
            (err, result) => {
              if (err) {
                resolve({ ...team, total_points: 0 });
              } else {
                resolve({
                  ...team,
                  total_points: result[0]?.total_points || 0
                });
              }
            }
          );
        });
      }));

      standings.sort((a, b) => b.total_points - a.total_points);
      res.json(standings);
    }
  );
});

module.exports = router;

