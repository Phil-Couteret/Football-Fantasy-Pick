const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const sportradar = require('../services/sportradar');

const router = express.Router();

// Get all pick'em groups
router.get('/groups', authenticateToken, (req, res) => {
  const database = db.getDb();
  database.all(
    `SELECT pg.*, u.username as admin_name,
     (SELECT COUNT(*) FROM pickem_group_members WHERE group_id = pg.id) as member_count
     FROM pickem_groups pg
     JOIN users u ON pg.admin_id = u.id`,
    (err, groups) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(groups);
    }
  );
});

// Create a pick'em group
router.post('/groups', authenticateToken, (req, res) => {
  const { name, season_year } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Group name is required' });
  }

  const database = db.getDb();
  const season = season_year || sportradar.getCurrentSeason();

  database.run(
    'INSERT INTO pickem_groups (name, admin_id, season_year) VALUES (?, ?, ?)',
    [name, req.user.userId, season],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create group' });
      }

      // Add creator as member
      database.run(
        'INSERT INTO pickem_group_members (group_id, user_id) VALUES (?, ?)',
        [this.lastID, req.user.userId],
        () => {
          res.status(201).json({
            id: this.lastID,
            name,
            season_year: season,
            message: 'Group created successfully'
          });
        }
      );
    }
  );
});

// Join a pick'em group
router.post('/groups/:groupId/join', authenticateToken, (req, res) => {
  const database = db.getDb();

  database.run(
    'INSERT OR IGNORE INTO pickem_group_members (group_id, user_id) VALUES (?, ?)',
    [req.params.groupId, req.user.userId],
    function(err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to join group' });
      }
      if (this.changes === 0) {
        return res.status(400).json({ error: 'Already a member of this group' });
      }
      res.json({ message: 'Joined group successfully' });
    }
  );
});

// Get group details
router.get('/groups/:groupId', authenticateToken, (req, res) => {
  const database = db.getDb();
  database.get(
    `SELECT pg.*, u.username as admin_name
     FROM pickem_groups pg
     JOIN users u ON pg.admin_id = u.id
     WHERE pg.id = ?`,
    [req.params.groupId],
    (err, group) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!group) {
        return res.status(404).json({ error: 'Group not found' });
      }
      res.json(group);
    }
  );
});

// Get group members
router.get('/groups/:groupId/members', authenticateToken, (req, res) => {
  const database = db.getDb();
  database.all(
    `SELECT u.id, u.username, u.email, pgm.joined_at
     FROM pickem_group_members pgm
     JOIN users u ON pgm.user_id = u.id
     WHERE pgm.group_id = ?`,
    [req.params.groupId],
    (err, members) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(members);
    }
  );
});

// Make a pick
router.post('/groups/:groupId/picks', authenticateToken, (req, res) => {
  const { game_id, picked_team_id, season, week } = req.body;
  const { groupId } = req.params;

  if (!game_id || !picked_team_id || !season || !week) {
    return res.status(400).json({ error: 'Game ID, picked team, season, and week are required' });
  }

  const database = db.getDb();

  // Verify user is member of group
  database.get(
    'SELECT * FROM pickem_group_members WHERE group_id = ? AND user_id = ?',
    [groupId, req.user.userId],
    (err, membership) => {
      if (err || !membership) {
        return res.status(403).json({ error: 'You must be a member of this group' });
      }

      database.run(
        `INSERT OR REPLACE INTO pickem_picks 
         (group_id, user_id, game_id, picked_team_id, season, week)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [groupId, req.user.userId, game_id, picked_team_id, season, week],
        function(err) {
          if (err) {
            return res.status(500).json({ error: 'Failed to save pick' });
          }
          res.json({ message: 'Pick saved successfully' });
        }
      );
    }
  );
});

// Get user's picks for a week
router.get('/groups/:groupId/picks/:week', authenticateToken, (req, res) => {
  const database = db.getDb();
  const season = sportradar.getCurrentSeason();

  database.all(
    `SELECT pp.*, nsc.home_team_id, nsc.away_team_id, nsc.status, nsc.home_score, nsc.away_score
     FROM pickem_picks pp
     LEFT JOIN nfl_schedule_cache nsc ON pp.game_id = nsc.id
     WHERE pp.group_id = ? AND pp.user_id = ? AND pp.season = ? AND pp.week = ?`,
    [req.params.groupId, req.user.userId, season, req.params.week],
    (err, picks) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(picks);
    }
  );
});

// Get leaderboard for a group
router.get('/groups/:groupId/leaderboard', authenticateToken, async (req, res) => {
  const database = db.getDb();
  const season = sportradar.getCurrentSeason();

  // Get all members
  database.all(
    `SELECT u.id, u.username
     FROM pickem_group_members pgm
     JOIN users u ON pgm.user_id = u.id
     WHERE pgm.group_id = ?`,
    [req.params.groupId],
    async (err, members) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Calculate scores for each member
      const leaderboard = await Promise.all(members.map(member => {
        return new Promise((resolve) => {
          database.all(
            `SELECT pp.*, nsc.home_team_id, nsc.away_team_id, nsc.home_score, nsc.away_score, nsc.status
             FROM pickem_picks pp
             JOIN nfl_schedule_cache nsc ON pp.game_id = nsc.id
             WHERE pp.group_id = ? AND pp.user_id = ? AND pp.season = ? AND nsc.status = 'closed'`,
            [req.params.groupId, member.id, season],
            (err, picks) => {
              if (err) {
                resolve({ ...member, wins: 0, losses: 0, win_percentage: 0 });
              } else {
                let wins = 0;
                let losses = 0;

                picks.forEach(pick => {
                  const isHomeWin = pick.home_score > pick.away_score;
                  const pickedHome = pick.picked_team_id === pick.home_team_id;

                  if ((isHomeWin && pickedHome) || (!isHomeWin && !pickedHome)) {
                    wins++;
                  } else {
                    losses++;
                  }
                });

                const winPercentage = picks.length > 0 ? (wins / picks.length) * 100 : 0;

                resolve({
                  ...member,
                  wins,
                  losses,
                  total_picks: picks.length,
                  win_percentage: parseFloat(winPercentage.toFixed(2))
                });
              }
            }
          );
        });
      }));

      leaderboard.sort((a, b) => {
        if (b.wins !== a.wins) return b.wins - a.wins;
        return b.win_percentage - a.win_percentage;
      });

      res.json(leaderboard);
    }
  );
});

module.exports = router;

