const express = require('express');
const db = require('../config/database');
const { authenticateToken } = require('../middleware/auth');
const sportradar = require('../services/sportradar');

const router = express.Router();

// Get teams
router.get('/teams', authenticateToken, async (req, res) => {
  try {
    const data = await sportradar.getTeams();
    
    // Cache teams
    const database = db.getDb();
    if (data.conferences) {
      data.conferences.forEach(conference => {
        conference.divisions?.forEach(division => {
          division.teams?.forEach(team => {
            database.run(
              `INSERT OR REPLACE INTO nfl_teams_cache 
               (id, name, market, alias, conference, division, venue_name)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
              [
                team.id,
                team.name,
                team.market || '',
                team.alias || '',
                conference.name || '',
                division.name || '',
                team.venue?.name || ''
              ]
            );
          });
        });
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch teams', details: error.message });
  }
});

// Get season schedule
router.get('/schedule/:season?', authenticateToken, async (req, res) => {
  try {
    const season = parseInt(req.params.season) || sportradar.getCurrentSeason();
    const data = await sportradar.getSeasonSchedule(season);

    // Cache schedule
    const database = db.getDb();
    if (data.weeks) {
      data.weeks.forEach(week => {
        week.games?.forEach(game => {
          database.run(
            `INSERT OR REPLACE INTO nfl_schedule_cache 
             (id, season, week, scheduled, home_team_id, away_team_id, status, home_score, away_score)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              game.id,
              season,
              week.sequence,
              game.scheduled || '',
              game.home?.id || '',
              game.away?.id || '',
              game.status || 'scheduled',
              game.scoring?.home_points || null,
              game.scoring?.away_points || null
            ]
          );
        });
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch schedule', details: error.message });
  }
});

// Get week schedule
router.get('/schedule/:season/:seasonType/:week', authenticateToken, async (req, res) => {
  try {
    const { season, seasonType, week } = req.params;
    const data = await sportradar.getWeekSchedule(parseInt(season), seasonType, parseInt(week));
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch week schedule', details: error.message });
  }
});

// Get game details
router.get('/games/:gameId', authenticateToken, async (req, res) => {
  try {
    const data = await sportradar.getGameDetails(req.params.gameId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game details', details: error.message });
  }
});

// Get team roster
router.get('/teams/:teamId/roster', authenticateToken, async (req, res) => {
  try {
    const data = await sportradar.getTeamRoster(req.params.teamId);
    
    // Cache players
    const database = db.getDb();
    if (data.players) {
      data.players.forEach(player => {
        database.run(
          `INSERT OR REPLACE INTO nfl_players_cache 
           (id, name, position, team_id, jersey_number)
           VALUES (?, ?, ?, ?, ?)`,
          [
            player.id,
            player.name || `${player.first_name} ${player.last_name}`,
            player.position || '',
            req.params.teamId,
            player.jersey_number || ''
          ]
        );
      });
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch roster', details: error.message });
  }
});

// Get player profile
router.get('/players/:playerId', authenticateToken, async (req, res) => {
  try {
    const data = await sportradar.getPlayerProfile(req.params.playerId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch player profile', details: error.message });
  }
});

// Get game statistics
router.get('/games/:gameId/stats', authenticateToken, async (req, res) => {
  try {
    const data = await sportradar.getGameStatistics(req.params.gameId);

    // Cache stats and calculate fantasy points
    const database = db.getDb();
    if (data.statistics) {
      const gameId = req.params.gameId;
      const season = parseInt(gameId.split('-')[0]) || sportradar.getCurrentSeason();
      const week = parseInt(gameId.split('-')[1]) || 1;

      // Process home team stats
      if (data.statistics.home?.players) {
        data.statistics.home.players.forEach(player => {
          const stats = {
            passing_yards: player.passing?.yards || 0,
            passing_tds: player.passing?.touchdowns || 0,
            passing_ints: player.passing?.interceptions || 0,
            rushing_yards: player.rushing?.yards || 0,
            rushing_tds: player.rushing?.touchdowns || 0,
            receiving_yards: player.receiving?.yards || 0,
            receiving_tds: player.receiving?.touchdowns || 0,
            receptions: player.receiving?.receptions || 0,
            fumbles: player.fumbles?.lost || 0
          };

          const fantasyPoints = sportradar.calculateFantasyPoints(stats);

          database.run(
            `INSERT OR REPLACE INTO nfl_stats_cache 
             (player_id, game_id, season, week, passing_yards, passing_tds, passing_ints,
              rushing_yards, rushing_tds, receiving_yards, receiving_tds, receptions, fumbles, fantasy_points)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              player.id,
              gameId,
              season,
              week,
              stats.passing_yards,
              stats.passing_tds,
              stats.passing_ints,
              stats.rushing_yards,
              stats.rushing_tds,
              stats.receiving_yards,
              stats.receiving_tds,
              stats.receptions,
              stats.fumbles,
              fantasyPoints
            ]
          );
        });
      }

      // Process away team stats
      if (data.statistics.away?.players) {
        data.statistics.away.players.forEach(player => {
          const stats = {
            passing_yards: player.passing?.yards || 0,
            passing_tds: player.passing?.touchdowns || 0,
            passing_ints: player.passing?.interceptions || 0,
            rushing_yards: player.rushing?.yards || 0,
            rushing_tds: player.rushing?.touchdowns || 0,
            receiving_yards: player.receiving?.yards || 0,
            receiving_tds: player.receiving?.touchdowns || 0,
            receptions: player.receiving?.receptions || 0,
            fumbles: player.fumbles?.lost || 0
          };

          const fantasyPoints = sportradar.calculateFantasyPoints(stats);

          database.run(
            `INSERT OR REPLACE INTO nfl_stats_cache 
             (player_id, game_id, season, week, passing_yards, passing_tds, passing_ints,
              rushing_yards, rushing_tds, receiving_yards, receiving_tds, receptions, fumbles, fantasy_points)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              player.id,
              gameId,
              season,
              week,
              stats.passing_yards,
              stats.passing_tds,
              stats.passing_ints,
              stats.rushing_yards,
              stats.rushing_tds,
              stats.receiving_yards,
              stats.receiving_tds,
              stats.receptions,
              stats.fumbles,
              fantasyPoints
            ]
          );
        });
      }
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch game statistics', details: error.message });
  }
});

// Search players
router.get('/players/search/:query', authenticateToken, (req, res) => {
  const database = db.getDb();
  const query = `%${req.params.query}%`;

  database.all(
    'SELECT * FROM nfl_players_cache WHERE name LIKE ? OR position LIKE ? LIMIT 50',
    [query, query],
    (err, players) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(players);
    }
  );
});

module.exports = router;

