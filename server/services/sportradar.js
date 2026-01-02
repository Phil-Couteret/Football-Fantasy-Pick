const axios = require('axios');

const API_KEY = process.env.SPORTRADAR_API_KEY;
const BASE_URL = process.env.SPORTRADAR_API_BASE_URL || 'https://api.sportradar.com/nfl/official/trial/v7/en';

if (!API_KEY) {
  console.warn('Warning: SPORTRADAR_API_KEY not set in environment variables');
}

const sportradarAPI = axios.create({
  baseURL: BASE_URL,
  params: {
    api_key: API_KEY
  }
});

// Get current season
const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth(); // 0-11 (0 = January)
  // NFL season runs Sept-Feb, so:
  // - Jan/Feb (0-1): use year-1 (season started in September of previous year)
  // - Mar-Aug (2-7): use year-1 (previous season)
  // - Sep-Dec (8-11): use current year (current season)
  if (month < 8) {
    return year - 1; // Jan-Aug: season started in previous year's September
  } else {
    return year; // Sep-Dec: current season
  }
};

// Get current week (simplified - in production, use actual NFL schedule)
const getCurrentWeek = async () => {
  try {
    const season = getCurrentSeason();
    const response = await sportradarAPI.get(`/games/${season}/REG/schedule.json`);
    // This would need more sophisticated logic to determine current week
    // For now, return a default
    return 1;
  } catch (error) {
    console.error('Error getting current week:', error);
    return 1;
  }
};

// Get all teams
const getTeams = async () => {
  try {
    const response = await sportradarAPI.get('/league/hierarchy.json');
    return response.data;
  } catch (error) {
    console.error('Error fetching teams:', error.response?.data || error.message);
    throw error;
  }
};

// Get season schedule
const getSeasonSchedule = async (season, seasonType = 'REG') => {
  try {
    const response = await sportradarAPI.get(`/games/${season}/${seasonType}/schedule.json`);
    return response.data;
  } catch (error) {
    console.error('Error fetching schedule:', error.response?.data || error.message);
    throw error;
  }
};

// Get week schedule
const getWeekSchedule = async (season, seasonType = 'REG', week) => {
  try {
    const response = await sportradarAPI.get(`/games/${season}/${seasonType}/${week}/schedule.json`);
    return response.data;
  } catch (error) {
    console.error('Error fetching week schedule:', error.response?.data || error.message);
    throw error;
  }
};

// Get game details
const getGameDetails = async (gameId) => {
  try {
    const response = await sportradarAPI.get(`/games/${gameId}/summary.json`);
    return response.data;
  } catch (error) {
    console.error('Error fetching game details:', error.response?.data || error.message);
    throw error;
  }
};

// Get team roster
const getTeamRoster = async (teamId) => {
  try {
    const response = await sportradarAPI.get(`/teams/${teamId}/full_roster.json`);
    return response.data;
  } catch (error) {
    console.error('Error fetching team roster:', error.response?.data || error.message);
    throw error;
  }
};

// Get player profile
const getPlayerProfile = async (playerId) => {
  try {
    const response = await sportradarAPI.get(`/players/${playerId}/profile.json`);
    return response.data;
  } catch (error) {
    console.error('Error fetching player profile:', error.response?.data || error.message);
    throw error;
  }
};

// Get game statistics
const getGameStatistics = async (gameId) => {
  try {
    const response = await sportradarAPI.get(`/games/${gameId}/statistics.json`);
    return response.data;
  } catch (error) {
    console.error('Error fetching game statistics:', error.response?.data || error.message);
    throw error;
  }
};

// Calculate fantasy points (standard scoring)
const calculateFantasyPoints = (stats) => {
  let points = 0;
  
  // Passing
  points += (stats.passing_yards || 0) / 25; // 1 point per 25 yards
  points += (stats.passing_tds || 0) * 4;
  points -= (stats.passing_ints || 0) * 2;
  
  // Rushing
  points += (stats.rushing_yards || 0) / 10; // 1 point per 10 yards
  points += (stats.rushing_tds || 0) * 6;
  
  // Receiving
  points += (stats.receiving_yards || 0) / 10; // 1 point per 10 yards
  points += (stats.receiving_tds || 0) * 6;
  points += (stats.receptions || 0); // 1 point per reception (PPR)
  
  // Fumbles
  points -= (stats.fumbles || 0) * 2;
  
  return parseFloat(points.toFixed(2));
};

module.exports = {
  getCurrentSeason,
  getCurrentWeek,
  getTeams,
  getSeasonSchedule,
  getWeekSchedule,
  getGameDetails,
  getTeamRoster,
  getPlayerProfile,
  getGameStatistics,
  calculateFantasyPoints
};

