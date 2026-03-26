require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ────────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: '*',          // Allow Flutter Android, iOS, Web & Chrome debugger
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Health check (Render pings this to keep service alive) ────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'YONECO Intern API', time: new Date().toISOString() });
});

app.get('/health', (req, res) => res.json({ status: 'healthy' }));

// ── Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/daily-tasks',  require('./routes/dailyTasks'));
app.use('/api/weekly-tasks', require('./routes/weeklyTasks'));
app.use('/api/cases',        require('./routes/cases'));

// ── 404 handler ───────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Database initialisation (create tables if they don't exist) ───────────
async function initDB() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS interns (
        id            SERIAL PRIMARY KEY,
        name          VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        school        VARCHAR(200),
        program       VARCHAR(200),
        district      VARCHAR(100),
        created_at    TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS daily_tasks (
        id          SERIAL PRIMARY KEY,
        intern_id   INTEGER NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
        date        DATE NOT NULL,
        activities  TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (intern_id, date)
      );

      CREATE TABLE IF NOT EXISTS weekly_tasks (
        id          SERIAL PRIMARY KEY,
        intern_id   INTEGER NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
        week_start  DATE NOT NULL,
        week_end    DATE NOT NULL,
        summary     TEXT NOT NULL,
        created_at  TIMESTAMPTZ DEFAULT NOW(),
        updated_at  TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE (intern_id, week_start)
      );

      CREATE TABLE IF NOT EXISTS cases (
        id                    SERIAL PRIMARY KEY,
        intern_id             INTEGER NOT NULL REFERENCES interns(id) ON DELETE CASCADE,
        case_ref              VARCHAR(30) UNIQUE,
        date                  DATE,
        time                  VARCHAR(20),
        duration              VARCHAR(50),
        mode_of_contact       VARCHAR(100),
        cooperating_partner   VARCHAR(150),
        programme_type        VARCHAR(150),
        client_name           VARCHAR(200) NOT NULL,
        client_gender         VARCHAR(20),
        client_type           VARCHAR(20),
        client_age_range      VARCHAR(20),
        client_ta             VARCHAR(150),
        client_village        VARCHAR(150),
        client_district       VARCHAR(100),
        client_disability     VARCHAR(150),
        client_beneficiary    VARCHAR(150),
        client_phone          VARCHAR(30),
        client_relationship   VARCHAR(100),
        survivor_name         VARCHAR(200) NOT NULL,
        survivor_gender       VARCHAR(20),
        survivor_type         VARCHAR(20),
        survivor_age_range    VARCHAR(20),
        survivor_ta           VARCHAR(150),
        survivor_village      VARCHAR(150),
        survivor_district     VARCHAR(100),
        survivor_disability   VARCHAR(150),
        place_of_abuse        VARCHAR(100),
        perpetrator_name      VARCHAR(200),
        perpetrator_gender    VARCHAR(20),
        perpetrator_age_range VARCHAR(20),
        perpetrator_ta        VARCHAR(150),
        perpetrator_village   VARCHAR(150),
        perpetrator_district  VARCHAR(100),
        perpetrator_country   VARCHAR(100),
        proxy_name            VARCHAR(200),
        proxy_phone           VARCHAR(30),
        proxy_relationship    VARCHAR(100),
        main_issue            TEXT,
        case_id_gvh           VARCHAR(100),
        district_case_logged  VARCHAR(100),
        summary               TEXT,
        created_at            TIMESTAMPTZ DEFAULT NOW()
      );
    `);
    console.log('✅  Database tables ready');
  } catch (err) {
    console.error('❌  Database init error:', err.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

// ── Start ─────────────────────────────────────────────────────────────────
initDB().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀  YONECO server running on port ${PORT}`);
  });
});