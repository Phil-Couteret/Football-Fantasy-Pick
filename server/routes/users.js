const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Get user profile
router.get('/:id', authenticateToken, (req, res) => {
  const database = db.getDb();
  database.get(
    'SELECT id, username, email, created_at FROM users WHERE id = ?',
    [req.params.id],
    (err, user) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(user);
    }
  );
});

// Get user's fantasy teams
router.get('/:id/fantasy-teams', authenticateToken, (req, res) => {
  const database = db.getDb();
  database.all(
    `SELECT ft.*, fl.name as league_name 
     FROM fantasy_teams ft
     JOIN fantasy_leagues fl ON ft.league_id = fl.id
     WHERE ft.user_id = ?`,
    [req.params.id],
    (err, teams) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(teams);
    }
  );
});

// Get user's pick'em groups
router.get('/:id/pickem-groups', authenticateToken, (req, res) => {
  const database = db.getDb();
  database.all(
    `SELECT pg.*, u.username as admin_name
     FROM pickem_groups pg
     JOIN pickem_group_members pgm ON pg.id = pgm.group_id
     JOIN users u ON pg.admin_id = u.id
     WHERE pgm.user_id = ?`,
    [req.params.id],
    (err, groups) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(groups);
    }
  );
});

module.exports = router;

