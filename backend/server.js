// server.js — production HTTP backend behind Nginx+DuckDNS

require('dotenv').config();

// ------------ ENV VALIDATION ------------
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

// ------------ DEPENDENCIES ------------
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const helmet = require('helmet');
const compression = require('compression');
const connectDB = require('./config/db');

// ------------ ROUTES ------------
const authRoutes = require('./routes/authRoute');
const fileRoutes = require('./routes/filesRoute');
const shareRoutes = require('./routes/shareRoute');

const app = express();

// ------------ TRUST REVERSE PROXY ------------
app.set('trust proxy', 1);

// ------------ SECURITY HEADERS ------------
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// ------------ PERFORMANCE ------------
app.use(compression());

// ------------ CORS (MUST BE FIRST) ------------
const ALLOWED = new Set(
  FRONTEND_URL.split(',').map((s) => s.trim())
);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // Postman, mobile, curl

      if (ALLOWED.has(origin)) return cb(null, true);

      if (origin.includes('vercel.app')) {
        return cb(null, true);
      }

      if (
        NODE_ENV !== 'production' &&
        origin.startsWith('http://localhost')
      ) {
        return cb(null, true);
      }

      cb(new Error(`Blocked by CORS: ${origin}`));
    },
    credentials: true,
  })
);

// ------------ COOKIES + SESSION (MUST BE BEFORE express.json) ------------
app.use(cookieParser());

app.use(
  session({
    name: 'sid',
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true, // required for SameSite=None
      sameSite: 'none',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    store: MongoStore.create({
      mongoUrl: MONGODB_URI,
      ttl: 7 * 24 * 60 * 60,
    }),
  })
);

// ------------ BODY PARSER (AFTER SESSION!) ------------
app.use(express.json({ limit: '2mb' }));

// ------------ API ROUTES ------------
app.use('/api/auth', authRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/share', shareRoutes);

// ------------ HEALTH CHECK ------------
app.get('/api/status', (_req, res) => {
  res.json({
    alive: true,
    env: NODE_ENV,
    cookieSecure: true,
    sameSite: 'none',
  });
});

// ------------ CONNECT DB + RUN SERVER ------------
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`✅ Backend running on port ${PORT}`);
      console.log(`✅ Allowed origins: ${[...ALLOWED].join(', ')}`);
      console.log(`✅ NODE_ENV=${NODE_ENV}`);
    });
  })
  .catch((err) => {
    console.error('❌ DB failed:', err);
    process.exit(1);
  });

// ------------ GLOBAL ERROR HANDLER ------------
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ ok: false, error: err.message });
});
