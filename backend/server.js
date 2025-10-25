// Load environment variables
require('dotenv').config();

// Dependencies
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const path = require('path');
const connectDB = require('./config/db');

// Routes
const authRoutes = require('./routes/authRoute');
const fileRoutes = require('./routes/filesRoute');
const shareRoutes = require('./routes/shareRoute');

const app = express();

// ✅ Required for Nginx / AWS load balancers
app.set('trust proxy', 1);

// Middleware
app.use(express.json());
app.use(cookieParser());

// ✅ Allowed frontend origins
const allowedOrigins = [
  'http://localhost:5173', // Vite local dev
  process.env.FRONTEND_URL // Vercel production
];

// ✅ CORS FIXED FOR SESSION COOKIES
app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // mobile, curl, postman

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ✅ Session configuration FIXED
app.use(
  session({
    name: 'sid',
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      secure: process.env.NODE_ENV === 'production', // must be true for sameSite=none
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      ttl: 7 * 24 * 60 * 60,
    }),
  })
);

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/share', shareRoutes);

// Health Check (for debugging)
app.get('/api/status', (req, res) => {
  res.json({ ok: true, message: 'Backend is alive ✅' });
});

// Start server
const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to database:', err);
    process.exit(1);
  });
