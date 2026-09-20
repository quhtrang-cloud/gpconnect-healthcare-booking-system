const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');
const userRoutes = require('./src/routes/users');
const appointmentRoutes = require('./src/routes/appointments');
const calendarRoutes = require('./src/routes/calendar');
const adminRoutes = require('./src/routes/admin');
const initDb = require('./src/config/initDb');
const auth = require('./src/middleware/auth');
const pool = require('./src/config/db');
const fs = require('fs').promises;

// Path to notifications JSON file
const NOTIFICATIONS_FILE = path.join(__dirname, 'src/notifications.json');

// Ensure notifications.json exists
async function initializeNotificationsFile() {
  try {
    await fs.access(NOTIFICATIONS_FILE);
  } catch {
    await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify([]));
  }
}

dotenv.config();

const app = express();

// Middleware
app.disable('x-powered-by');
app.use(cors({ origin: process.env.APP_URL || 'http://localhost:3000', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'src/public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));
app.use(auth);

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/calendar', calendarRoutes);
app.use('/api/admin', adminRoutes);

// Page Routes
app.get('/', (req, res) => res.render('index', { user: req.user }));
app.get('/login', (req, res) => res.render('login', { user: req.user, error: null }));
app.get('/register', (req, res) => res.render('register', { user: req.user, error: null }));
app.get('/appointments', async (req, res) => {
  try {
    const cities = await pool.query('SELECT DISTINCT city FROM practices');
    const practices = await pool.query('SELECT id, name, city FROM practices');
    const gps = await pool.query('SELECT id, name, specialization FROM gps');
    const appointments = await pool.query(
      'SELECT a.id, a.gp_id, g.name AS gp_name, a.start_time, a.end_time, p.city, p.name AS practice_name, a.is_booked, a.user_id, g.specialization FROM appointments a JOIN gps g ON a.gp_id = g.id JOIN practices p ON g.practice_id = p.id WHERE a.is_booked = true AND a.user_id = $1',
      [req.user?.id || 0]
    );
    const userPrefs = req.user ? await pool.query('SELECT preferred_gp, notification_preferences FROM users WHERE id = $1', [req.user.id]) : { rows: [{}] };
    await initializeNotificationsFile();
    const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE));
    const userNotifications = notifications.filter(n => n.user_id == req.user?.id && !n.is_read);
    res.render('appointments', {
      user: req.user,
      appointments: appointments.rows,
      cities: cities.rows,
      practices: practices.rows,
      gps: gps.rows,
      notifications: userNotifications,
      error: null,
      conflicts: null,
      recommended: false,
      selectedCity: userPrefs.rows[0]?.preferred_gp ? cities.rows.find(c => c.city === 'London')?.city || cities.rows[0]?.city || null : null,
      selectedPractice: null,
      selectedDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
      selectedGp: userPrefs.rows[0]?.preferred_gp || null,
      selectedSymptom: null
    });
  } catch (error) {
    console.error('Error loading appointments:', error);
    res.render('appointments', {
      user: req.user,
      appointments: [],
      cities: [],
      practices: [],
      gps: [],
      notifications: [],
      error: 'Error loading initial data',
      conflicts: null,
      recommended: false,
      selectedCity: null,
      selectedPractice: null,
      selectedDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
      selectedGp: null,
      selectedSymptom: null
    });
  }
});
app.get('/preferences', async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  try {
    const gps = await pool.query('SELECT id, name, specialization FROM gps');
    const userPrefs = await pool.query('SELECT preferred_gp, notification_preferences FROM users WHERE id = $1', [req.user.id]);
    res.render('preferences', {
      user: req.user,
      gps: gps.rows,
      preferences: {
        preferred_gp: userPrefs.rows[0]?.preferred_gp || null,
        notification_preferences: userPrefs.rows[0]?.notification_preferences || { email: false, sms: false }
      },
      error: null
    });
  } catch (error) {
    console.error('Error loading preferences:', error);
    res.render('preferences', {
      user: req.user,
      gps: [],
      preferences: { preferred_gp: null, notification_preferences: { email: false, sms: false } },
      error: 'Error loading preferences'
    });
  }
});
app.get('/feedback', async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  try {
    const appointments = await pool.query(
      'SELECT a.id, a.gp_id, g.name AS gp_name, a.start_time, a.end_time, p.city, p.name AS practice_name, a.is_booked, a.user_id, g.specialization ' +
      'FROM appointments a JOIN gps g ON a.gp_id = g.id JOIN practices p ON g.practice_id = p.id ' +
      'WHERE a.is_booked = true AND a.user_id = $1 AND a.end_time < NOW()',
      [req.user.id]
    );
    let feedbackQuery;
    if (req.user.role === 'user') {
      feedbackQuery = `
        SELECT f.id, f.rating, f.comments, a.gp_id, g.name AS gp_name, a.start_time, u.name AS user_name, g.specialization
        FROM feedback f
        JOIN appointments a ON f.appointment_id = a.id
        JOIN gps g ON a.gp_id = g.id
        JOIN users u ON f.user_id = u.id
        WHERE f.user_id = $1
      `;
    } else {
      feedbackQuery = `
        SELECT f.id, f.rating, f.comments, a.gp_id, g.name AS gp_name, a.start_time, u.name AS user_name, g.specialization
        FROM feedback f
        JOIN appointments a ON f.appointment_id = a.id
        JOIN gps g ON a.gp_id = g.id
        JOIN users u ON f.user_id = u.id
      `;
    }
    const feedback = await pool.query(feedbackQuery, req.user.role === 'user' ? [req.user.id] : []);
    res.render('feedback', {
      user: req.user,
      appointments: appointments.rows,
      feedback: feedback.rows,
      error: null
    });
  } catch (error) {
    console.error('Error loading feedback:', error);
    res.render('feedback', {
      user: req.user,
      appointments: [],
      feedback: [],
      error: 'Error loading feedback'
    });
  }
});
app.get('/gp', async (req, res) => {
  if (!req.user || req.user.role !== 'gp') {
    return res.redirect('/login');
  }
  try {
    const gp = await pool.query(
      `
        SELECT g.id, g.name, g.specialization
        FROM users AS u
        JOIN gps AS g ON g.id = u.gp_id
        WHERE u.id = $1
          AND u.role = 'gp'
      `,
      [req.user.id]
    );
    if (gp.rows.length === 0) {
      return res.render('gp', {
        user: req.user,
        appointments: [],
        feedback: [],
        error: 'No GP profile is linked to this account'
      });
    }
    const gpId = gp.rows[0].id;
    const appointments = await pool.query(
      'SELECT a.id, a.gp_id, g.name AS gp_name, a.start_time, a.end_time, p.city, p.name AS practice_name, a.is_booked, a.user_id, u.name AS user_name, g.specialization ' +
      'FROM appointments a ' +
      'JOIN gps g ON a.gp_id = g.id ' +
      'JOIN practices p ON g.practice_id = p.id ' +
      'LEFT JOIN users u ON a.user_id = u.id ' +
      'WHERE a.is_booked = true AND a.gp_id = $1',
      [gpId]
    );
    const feedback = await pool.query(
      'SELECT f.id, f.rating, f.comments, a.gp_id, g.name AS gp_name, a.start_time, u.name AS user_name, g.specialization ' +
      'FROM feedback f ' +
      'JOIN appointments a ON f.appointment_id = a.id ' +
      'JOIN gps g ON a.gp_id = g.id ' +
      'JOIN users u ON f.user_id = u.id ' +
      'WHERE a.gp_id = $1',
      [gpId]
    );
    res.render('gp', {
      user: req.user,
      appointments: appointments.rows,
      feedback: feedback.rows,
      error: null
    });
  } catch (error) {
    console.error('Error loading GP dashboard:', error);
    res.render('gp', {
      user: req.user,
      appointments: [],
      feedback: [],
      error: 'Error loading GP dashboard'
    });
  }
});
app.get('/success', (req, res) => res.render('success', { user: req.user, message: req.query.message || 'Action completed successfully' }));
app.get('/admin', async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.redirect('/login');
  }
  res.redirect('/api/admin/dashboard');
});

// Initialize database
initDb().then(() => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}).catch((error) => {
  console.error('Failed to initialize server:', error);
  process.exit(1);
});
