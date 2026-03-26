const express = require('express');
const pool = require('../db');
const auth = require('../middleware/auth');

const router = express.Router();

// ── POST /api/cases ───────────────────────────────────────────────────────
router.post('/', auth, async (req, res) => {
  try {
    const internId = req.intern.id;
    const p = req.body;

    if (!p.client_name || !p.survivor_name) {
      return res.status(400).json({ error: 'Client name and survivor name are required' });
    }

    // Generate a human-readable case reference: YNCO-YYYYMMDD-XXXX
    const dateStr = (p.date || new Date().toISOString().split('T')[0]).replace(/-/g, '');
    const rand = Math.floor(1000 + Math.random() * 9000);
    const caseRef = `YNCO-${dateStr}-${rand}`;

    const result = await pool.query(
      `INSERT INTO cases (
        intern_id, case_ref, date, time, duration, mode_of_contact,
        cooperating_partner, programme_type,
        client_name, client_gender, client_type, client_age_range,
        client_ta, client_village, client_district, client_disability,
        client_beneficiary, client_phone, client_relationship,
        survivor_name, survivor_gender, survivor_type, survivor_age_range,
        survivor_ta, survivor_village, survivor_district, survivor_disability,
        place_of_abuse,
        perpetrator_name, perpetrator_gender, perpetrator_age_range,
        perpetrator_ta, perpetrator_village, perpetrator_district, perpetrator_country,
        proxy_name, proxy_phone, proxy_relationship,
        main_issue, case_id_gvh, district_case_logged, summary
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
        $20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,
        $36,$37,$38,$39,$40,$41,$42
      ) RETURNING id, case_ref`,
      [
        internId, caseRef,
        p.date, p.time, p.duration, p.mode_of_contact,
        p.cooperating_partner, p.programme_type,
        p.client_name, p.client_gender, p.client_type, p.client_age_range,
        p.client_ta, p.client_village, p.client_district, p.client_disability,
        p.client_beneficiary, p.client_phone, p.client_relationship,
        p.survivor_name, p.survivor_gender, p.survivor_type, p.survivor_age_range,
        p.survivor_ta, p.survivor_village, p.survivor_district, p.survivor_disability,
        p.place_of_abuse,
        p.perpetrator_name, p.perpetrator_gender, p.perpetrator_age_range,
        p.perpetrator_ta, p.perpetrator_village, p.perpetrator_district, p.perpetrator_country,
        p.proxy_name, p.proxy_phone, p.proxy_relationship,
        p.main_issue, p.case_id_gvh, p.district_case_logged, p.summary
      ]
    );

    res.status(201).json({
      message: 'Case saved successfully',
      case_ref: result.rows[0].case_ref,
      id: result.rows[0].id,
    });
  } catch (err) {
    console.error('Case save error:', err.message);
    res.status(500).json({ error: 'Could not save case. Please try again.' });
  }
});

// ── GET /api/cases ────────────────────────────────────────────────────────
router.get('/', auth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, case_ref, date, client_name, survivor_name, main_issue, created_at
       FROM cases WHERE intern_id = $1 ORDER BY created_at DESC`,
      [req.intern.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Cases fetch error:', err.message);
    res.status(500).json({ error: 'Could not fetch cases' });
  }
});

module.exports = router;