const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { getGoogleAuthUrl, getGoogleTokens } = require('../utils/googleCalendar')
const router = express.Router();

// Register User
router.post('/register', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email.includes('@') || password.length < 6 || name.length < 2) {
    return res.render('register', { user: null, error: 'Invalid email, password (min 6 chars), or name (min 2 chars)' });
  }
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query('INSERT INTO users (email, password, name, role, notification_preferences) VALUES ($1, $2, $3, $4, $5)', [
      email,
      hashedPassword,
      name,
      'user',
      { email: false, sms: false }
    ]);
    res.redirect('/login');
  } catch (error) {
    res.render('register', { user: null, error: 'Error registering user' });
  }
});

// Login User
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.render('login', { user: null, error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, process.env.JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, { httpOnly: true });
    if (user.role === 'admin') {
      return res.redirect('/api/admin/dashboard');
    } else if (user.role === 'gp') {
      return res.redirect('/gp');
    }
    res.redirect('/appointments');
  } catch (error) {
    console.error('Error logging in:', error);
    res.render('login', { user: null, error: 'Error logging in' });
  }
});

// Logout User
router.get('/logout', (req, res) => {
  res.clearCookie('token');
  res.redirect('/login');
});

// Update Preferences
router.post('/preferences', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  const { preferred_gp, notification_preferences } = req.body;
  try {
    const notificationPrefs = {
      email: notification_preferences?.email === 'true',
      sms: notification_preferences?.sms === 'true'
    };
    await pool.query(
      'UPDATE users SET preferred_gp = $1, notification_preferences = $2 WHERE id = $3',
      [preferred_gp || null, notificationPrefs, req.user.id]
    );
    res.redirect('/success?message=Preferences updated successfully');
  } catch (error) {
    console.error('Error updating preferences:', error);
    const gps = await pool.query('SELECT id, name FROM gps').catch(() => ({ rows: [] }));
    res.render('preferences', {
      user: req.user,
      gps: gps.rows,
      preferences: { preferred_gp: null, notification_preferences: { email: false, sms: false } },
      error: 'Error updating preferences'
    });
  }
});

// Initiate Google OAuth
router.get('/google-auth', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  try {
    const authUrl = getGoogleAuthUrl();
    res.redirect(authUrl);
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    res.redirect('/success?message=Error initiating Google Calendar linking');
  }
});

// Google OAuth Callback
router.get('/google-callback', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  const { code } = req.query;
  if (!code) {
    return res.redirect('/success?message=Error: No authorization code provided');
  }
  try {
    const tokens = await getGoogleTokens(code);
    await pool.query('UPDATE users SET google_tokens = $1 WHERE id = $2', [
      JSON.stringify(tokens),
      req.user.id
    ]);
    res.redirect('/success?message=Google Calendar linked successfully');
  } catch (error) {
    console.error('Error processing Google OAuth callback:', error);
    res.redirect('/success?message=Error linking Google Calendar');
  }
});

module.exports = router;