const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// ── POST /api/weekly-tasks ────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const { week_start, week_end, summary } = req.body;
    const internId = req.intern.id;

    if (!week_start || !week_end || !summary) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    // Upsert: one report per intern per week_start
    const result = await pool.query(
      `INSERT INTO weekly_tasks (intern_id, week_start, week_end, summary)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (intern_id, week_start)
       DO UPDATE SET week_end = EXCLUDED.week_end,
                     summary  = EXCLUDED.summary,
                     updated_at = NOW()
       RETURNING *`,
      [internId, week_start, week_end, summary.trim()]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Weekly task save error:', err.message);
    res.status(500).json({ error: 'Could not save weekly report' });
  }
});

// ── GET /api/weekly-tasks ─────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM weekly_tasks WHERE intern_id = $1 ORDER BY week_start DESC`,
      [req.intern.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Weekly task fetch error:', err.message);
    res.status(500).json({ error: 'Could not fetch weekly reports' });
  }
});

module.exports = router;