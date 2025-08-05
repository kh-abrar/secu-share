const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

require('dotenv').config();


// Routes
const authRoutes = require('./routes/authRoute');
const fileRoutes = require('./routes/filesRoute');
const shareRoutes = require('./routes/shareRoute');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


// Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/share', shareRoutes);

const PORT = process.env.PORT || 5000;
// Connect to the database first, then start the server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`);
    });
}).catch(err => {
    console.error('Failed to start server after DB connection failure', err);
});