// server.js — HTTP backend version (safer)

require('dotenv').config();

const assertEnv = (name) => {
  if (!process.env[name] || process.env[name].trim() === '') {
    throw new Error(`Missing env variable: ${name}`);
  }
  return process.env[name];
};

const NODE_ENV = process.env.NODE_ENV || 'production';
const PORT = parseInt(process.env.PORT || '4000', 10);
const MONGODB_URI = assertEnv('MONGODB_URI');
const SESSION_SECRET = assertEnv('SESSION_SECRET');
const FRONTEND_URL = assertEnv('FRONTEND_URL');

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const compression = require('compression');
const connectDB = require('./config/db');

const authRoutes = require('./routes/authRoute');
const fileRoutes = require('./routes/filesRoute');
const shareRoutes = require('./routes/shareRoute');

const app = express();

// Required behind Nginx
app.set('trust proxy', 1);

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Performance
app.use(compression());

// Body & cookies
app.use(express.json({ limit: '2mb' }));
app.use(cookieParser());

// Build allowlist
const ALLOWED = new Set(
  FRONTEND_URL.split(',').map((s) => s.trim())
);

// CORS
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);

      if (ALLOWED.has(origin)) return cb(null, true);

      // Allow local dev if NODE_ENV !== production
      if (
        NODE_ENV !== 'production' &&
        origin.startsWith('http://localhost')
      ) {
        return cb(null, true);
      }

      if (origin.includes('vercel.app')) {
        return cb(null, true);
      }

      cb(new Error(`Blocked by CORS: ${origin}`));
    },
    credentials: true,
  })
);

// Sessions (HTTP backend rules)
app.use(
  session({
    name: 'sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      ttl: 7 * 24 * 60 * 60,
    }),
  })
);

// --- Routes ---
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/share', shareRoutes);

// Health check
app.get('/api/status', (_req, res) => {
  res.json({
    alive: true,
    env: NODE_ENV,
    httpsRequiredForSecureCookie: false,
  });
});

// Start
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Backend running HTTP on port ${PORT}`);
      console.log(`✅ Allowed origins: ${[...ALLOWED].join(', ')}`);
    });
  })
  .catch((err) => {
    console.error('❌ DB failed:', err);
    process.exit(1);
  });

// Global error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: err.message });
});
