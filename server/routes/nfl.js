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
    const weekNum = parseInt(week);
    const seasonNum = parseInt(season);
    const database = db.getDb();
    
    // Helper function to get cached games
    const getCachedGames = () => {
      return new Promise((resolve) => {
        database.all(
          `SELECT * FROM nfl_schedule_cache 
           WHERE season = ? AND week = ? 
           ORDER BY scheduled`,
          [seasonNum, weekNum],
          (err, cachedGames) => {
            if (err) {
              console.error('Database error:', err);
              resolve([]);
            } else {
              resolve(cachedGames || []);
            }
          }
        );
      });
    };
    
    // Helper function to get team info from cache
    const getTeamInfo = (teamId) => {
      return new Promise((resolve) => {
        database.get(
          'SELECT * FROM nfl_teams_cache WHERE id = ?',
          [teamId],
          (err, team) => {
            resolve(team || { id: teamId, name: teamId, alias: teamId });
          }
        );
      });
    };
    
    // First, try to get from cache
    const cachedGames = await getCachedGames();
    
    if (cachedGames && cachedGames.length > 0) {
      // Build games array with team info
      const games = await Promise.all(cachedGames.map(async (game) => {
        const homeTeam = await getTeamInfo(game.home_team_id);
        const awayTeam = await getTeamInfo(game.away_team_id);
        
        return {
          id: game.id,
          scheduled: game.scheduled,
          status: game.status,
          home: {
            id: homeTeam.id,
            name: homeTeam.name || homeTeam.alias,
            alias: homeTeam.alias
          },
          away: {
            id: awayTeam.id,
            name: awayTeam.name || awayTeam.alias,
            alias: awayTeam.alias
          },
          scoring: {
            home_points: game.home_score,
            away_points: game.away_score
          }
        };
      }));
      
      return res.json({ week: { sequence: weekNum, games } });
    }
    
    // No cache, try API (but handle rate limits gracefully)
    try {
      // Try the direct week endpoint first
      const data = await sportradar.getWeekSchedule(seasonNum, seasonType, weekNum);
      res.json(data);
    } catch (weekError) {
      // If 404, no data available - return empty
      if (weekError.response?.status === 404) {
        console.warn(`Week ${weekNum} endpoint returned 404 for season ${seasonNum}`);
        return res.json({ week: { sequence: weekNum, games: [] } });
      }
      // If week endpoint fails, try getting full season and filter by week
      console.log(`Week endpoint failed for week ${weekNum}, trying full season schedule...`);
      try {
        const seasonData = await sportradar.getSeasonSchedule(seasonNum, seasonType);
        
        // Find the week in the season data
        let weekData = null;
        if (seasonData.weeks && Array.isArray(seasonData.weeks)) {
          weekData = seasonData.weeks.find(w => w.sequence === weekNum || w.title === `Week ${weekNum}`);
        }
        
        if (weekData) {
          res.json({ week: weekData });
        } else {
          // Return empty week structure
          res.json({ week: { sequence: weekNum, games: [] } });
        }
            } catch (seasonError) {
              // Check error status codes
              const status = seasonError.response?.status;
              if (status === 429) {
                console.warn('Rate limit exceeded (429). Using cached data if available.');
                res.json({ week: { sequence: weekNum, games: [] } });
              } else if (status === 404) {
                console.warn(`No data found for season ${seasonNum}, week ${weekNum} (404). Returning empty games.`);
                res.json({ week: { sequence: weekNum, games: [] } });
              } else {
                console.error('API failed:', seasonError.message);
                // Return empty games rather than error
                res.json({ week: { sequence: weekNum, games: [] } });
              }
            }
    }
  } catch (error) {
    console.error('Unexpected error:', error);
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

