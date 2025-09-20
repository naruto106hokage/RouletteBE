require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const balanceRoutes = require('./routes/balance');
const errorHandler = require('./middleware/errorHandler');

const app = express();

// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization']
}));
app.use(express.json());

// Routes
app.use('/api/player', authRoutes);
app.use('/api/player', balanceRoutes);

// Error handling
app.use(errorHandler);

// Database connection
const connectDB = require('./config/database');
connectDB();

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});