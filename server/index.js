require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/database');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const fantasyRoutes = require('./routes/fantasy');
const pickemRoutes = require('./routes/pickem');
const nflRoutes = require('./routes/nfl');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
db.init().then(() => {
  console.log('Database initialized');
}).catch(err => {
  console.error('Database initialization error:', err);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/fantasy', fantasyRoutes);
app.use('/api/pickem', pickemRoutes);
app.use('/api/nfl', nflRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'NFL Fantasy & Pick\'em API is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

