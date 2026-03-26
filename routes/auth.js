const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db');

const router = express.Router();

// ── POST /api/auth/register ────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, password, school, program, district } = req.body;

    if (!name || !password || !school || !program || !district) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (password.length < 4) {
      return res.status(400).json({ error: 'Password must be at least 4 characters' });
    }

    // Check duplicate name
    const exists = await pool.query(
      'SELECT id FROM interns WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );
    if (exists.rows.length > 0) {
      return res.status(409).json({ error: 'An intern with that name already exists' });
    }

    const hash = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO interns (name, password_hash, school, program, district)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, school, program, district`,
      [name.trim(), hash, school.trim(), program.trim(), district]
    );

    const intern = result.rows[0];
    const token = jwt.sign(
      { id: intern.id, name: intern.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({ token, intern });
  } catch (err) {
    console.error('Register error:', err.message);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ── POST /api/auth/login ───────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body;

    if (!name || !password) {
      return res.status(400).json({ error: 'Name and password are required' });
    }

    const result = await pool.query(
      'SELECT * FROM interns WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid name or password' });
    }

    const intern = result.rows[0];
    const valid = await bcrypt.compare(password, intern.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Invalid name or password' });
    }

    const token = jwt.sign(
      { id: intern.id, name: intern.name },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      intern: {
        id: intern.id,
        name: intern.name,
        school: intern.school,
        program: intern.program,
        district: intern.district,
      },
    });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

module.exports = router;