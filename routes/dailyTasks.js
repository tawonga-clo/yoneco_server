const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// ── POST /api/daily-tasks ─────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { date, activities } = req.body;
    const internId = req.intern.id;

    if (!date || !activities) {
      return res.status(400).json({ error: 'Date and activities are required' });
    }

    // Upsert: one entry per intern per date
    const result = await pool.query(
      `INSERT INTO daily_tasks (intern_id, date, activities)
       VALUES ($1, $2, $3)
       ON CONFLICT (intern_id, date)
       DO UPDATE SET activities = EXCLUDED.activities, updated_at = NOW()
       RETURNING *`,
      [internId, date, activities.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Daily task save error:', err.message);
    res.status(500).json({ error: 'Could not save daily task' });
  }
});

// ── GET /api/daily-tasks ──────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM daily_tasks WHERE intern_id = $1 ORDER BY date DESC`,
      [req.intern.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Daily task fetch error:', err.message);
    res.status(500).json({ error: 'Could not fetch daily tasks' });
  }
});

module.exports = router;