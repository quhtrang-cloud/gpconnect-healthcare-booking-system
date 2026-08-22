const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { getGoogleAuthUrl, getGoogleTokens, createGoogleEvent } = require('../utils/googleCalendar');

const router = express.Router();

// Initiate Google Calendar Authentication (FR7)
router.get('/auth', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  try {
    const authUrl = getGoogleAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Google auth:', error);
    res.redirect('/success?message=Error initiating Google Calendar authentication');
  }
});

// Google Calendar OAuth Callback (FR7)
router.get('/callback', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  const { code } = req.query;
  if (!code) {
    return res.redirect('/success?message=Google Calendar authentication failed: No code provided');
  }
  try {
    const tokens = await getGoogleTokens(code);
    await pool.query('UPDATE users SET google_tokens = $1 WHERE id = $2', [tokens, req.user.id]);
    res.redirect('/success?message=Google Calendar linked successfully');
  } catch (error) {
    console.error('Error in Google callback:', error);
    res.redirect('/success?message=Error linking Google Calendar');
  }
});

// Sync Appointment to Google Calendar (FR7)
router.post('/sync', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  const { appointment_id } = req.body;
  try {
    const appt = await pool.query(
      'SELECT a.start_time, a.end_time, g.name AS gp_name FROM appointments a JOIN gps g ON a.gp_id = g.id WHERE a.id = $1 AND a.user_id = $2',
      [appointment_id, req.user.id]
    );
    if (appt.rows.length === 0) {
      return res.redirect('/success?message=Invalid appointment or not yours');
    }
    const { start_time, end_time, gp_name } = appt.rows[0];
    const tokens = (await pool.query('SELECT google_tokens FROM users WHERE id = $1', [req.user.id])).rows[0]?.google_tokens;
    if (!tokens) {
      return res.redirect('/success?message=Please link Google Calendar in preferences');
    }
    await createGoogleEvent(tokens, {
      summary: `Appointment with ${gp_name}`,
      start: start_time,
      end: end_time
    });
    res.redirect('/success?message=Appointment synced to Google Calendar');
  } catch (error) {
    console.error('Error syncing appointment:', error);
    res.redirect('/success?message=Error syncing appointment to Google Calendar');
  }
});

module.exports = router;