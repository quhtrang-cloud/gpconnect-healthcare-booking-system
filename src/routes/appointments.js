const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
const { checkGoogleConflicts } = require('../utils/googleCalendar');
const { sendEmail } = require('../utils/sendEmail');
const fs = require('fs').promises;
const path = require('path');

const router = express.Router();

// Path to notifications JSON file
const NOTIFICATIONS_FILE = path.join(__dirname, '../notifications.json');

// Ensure notifications.json exists
async function initializeNotificationsFile() {
  try {
    await fs.access(NOTIFICATIONS_FILE);
  } catch {
    await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify([]));
  }
}

// Triage function to categorize urgency
function triageUrgency({ symptom_category, symptom_duration, red_flags }) {
  const hasRedFlags = red_flags && (red_flags.severe_pain || red_flags.breathing || red_flags.high_fever || red_flags.other);
  if (hasRedFlags) {
    return 'Urgent';
  }
  if (symptom_category === 'Fever' && symptom_duration === '<1 day') {
    return 'Urgent';
  }
  if (['Pain', 'Fever', 'Respiratory', 'Digestive'].includes(symptom_category) && ['<1 day', '1-3 days'].includes(symptom_duration)) {
    return 'Soon';
  }
  return 'Routine';
}

// Map symptom categories to GP specializations
const symptomToSpecialization = {
  Respiratory: 'Chest',
  Pain: 'Bones',
  Fever: 'Stomach',
  Digestive: 'Stomach',
  Skin: 'Skin',
  Other: null
};

// View Available Appointments (FR2, FR3)
router.post('/availability', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  console.log('POST /availability - req.body:', req.body);
  const { city, date, gp_id, practice_id, recommend, symptom_category } = req.body;
  try {
    const cities = await pool.query('SELECT DISTINCT city FROM practices');
    const gps = await pool.query('SELECT id, name, specialization FROM gps');
    const practices = await pool.query('SELECT id, name, city FROM practices');
    await initializeNotificationsFile();
    const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE));
    const userNotifications = notifications.filter(n => n.user_id == req.user.id && !n.is_read);
    if (!city || !date) {
      const userPrefs = await pool.query('SELECT preferred_gp FROM users WHERE id = $1', [req.user.id]);
      return res.render('appointments', {
        user: req.user,
        appointments: [],
        cities: cities.rows,
        gps: gps.rows,
        practices: practices.rows,
        notifications: userNotifications,
        error: 'City and date are required for search.',
        conflicts: null,
        recommended: false,
        selectedCity: userPrefs.rows[0]?.preferred_gp ? cities.rows.find(c => c.city === 'London')?.city || cities.rows[0]?.city || null : null,
        selectedDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
        selectedGp: userPrefs.rows[0]?.preferred_gp || null,
        selectedPractice: null,
        selectedSymptom: null
      });
    }
    if (recommend === 'true') {
      return res.redirect(`/api/appointments/recommend?city=${encodeURIComponent(city)}&date=${encodeURIComponent(date)}&gp_id=${encodeURIComponent(gp_id || '')}&preferred_time=${encodeURIComponent(req.body.preferred_time || '')}&symptom_category=${encodeURIComponent(req.body.symptom_category || '')}&symptom_duration=${encodeURIComponent(req.body.symptom_duration || '')}&red_flags[severe_pain]=${req.body.red_flags?.severe_pain || ''}&red_flags[breathing]=${req.body.red_flags?.breathing || ''}&red_flags[high_fever]=${req.body.red_flags?.high_fever || ''}&red_flags[other]=${req.body.red_flags?.other || ''}`);
    }
    let query = 'SELECT a.id, a.gp_id, g.name AS gp_name, a.start_time, a.end_time, p.city, p.name AS practice_name, a.is_booked, a.user_id, g.specialization FROM appointments a JOIN gps g ON a.gp_id = g.id JOIN practices p ON g.practice_id = p.id WHERE p.city = $1 AND a.start_time::date = $2 AND a.is_booked = false';
    const params = [city, date];
    if (gp_id) {
      query += ' AND g.id = $3';
      params.push(gp_id);
    } else if (symptom_category && symptomToSpecialization[symptom_category]) {
      query += ' AND g.specialization = $3';
      params.push(symptomToSpecialization[symptom_category]);
    }
    if (practice_id) {
      query += ' AND p.id = $' + (params.length + 1);
      params.push(practice_id);
    }

    query += ' ORDER BY a.start_time ASC';

    console.log('Executing query:', query, 'with params:', params);
    const result = await pool.query(query, params);
    console.log('Query result rows:', result.rows);
    res.render('appointments', {
      user: req.user,
      appointments: result.rows,
      cities: cities.rows,
      gps: gps.rows,
      practices: practices.rows,
      notifications: userNotifications,
      error: result.rows.length === 0 ? 'No available appointments found for the selected criteria.' : null,
      conflicts: null,
      recommended: false,
      selectedCity: city,
      selectedDate: date,
      selectedGp: gp_id || null,
      selectedPractice: practice_id || null,
      selectedSymptom: symptom_category || null
    });
  } catch (error) {
    console.error('Error in /availability:', error);
    await initializeNotificationsFile();
    const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE));
    const userNotifications = notifications.filter(n => n.user_id == req.user.id && !n.is_read);
    res.render('appointments', {
      user: req.user,
      appointments: [],
      cities: [],
      gps: [],
      practices: [],
      notifications: userNotifications,
      error: 'Error loading appointments: ' + error.message,
      conflicts: null,
      recommended: false,
      selectedCity: city || null,
      selectedDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
      selectedGp: null,
      selectedPractice: null,
      selectedSymptom: null
    });
  }
});

// Fallback for GET /availability
router.get('/availability', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  console.log('GET /availability - req.query:', req.query);
  const { city, date, gp_id, practice_id, symptom_category } = req.query;
  try {
    const cities = await pool.query('SELECT DISTINCT city FROM practices');
    const gps = await pool.query('SELECT id, name, specialization FROM gps');
    const practices = await pool.query('SELECT id, name, city FROM practices');
    await initializeNotificationsFile();
    const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE));
    const userNotifications = notifications.filter(n => n.user_id == req.user.id && !n.is_read);
    if (!city || !date) {
      const userPrefs = await pool.query('SELECT preferred_gp FROM users WHERE id = $1', [req.user.id]);
      return res.render('appointments', {
        user: req.user,
        appointments: [],
        cities: cities.rows,
        gps: gps.rows,
        practices: practices.rows,
        notifications: userNotifications,
        error: 'City and date are required for search.',
        conflicts: null,
        recommended: false,
        selectedCity: userPrefs.rows[0]?.preferred_gp ? cities.rows.find(c => c.city === 'London')?.city || cities.rows[0]?.city || null : null,
        selectedDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
        selectedGp: userPrefs.rows[0]?.preferred_gp || null,
        selectedPractice: null,
        selectedSymptom: null
      });
    }
    let query = 'SELECT a.id, a.gp_id, g.name AS gp_name, a.start_time, a.end_time, p.city, p.name AS practice_name, a.is_booked, a.user_id, g.specialization FROM appointments a JOIN gps g ON a.gp_id = g.id JOIN practices p ON g.practice_id = p.id WHERE p.city = $1 AND a.start_time::date = $2 AND a.is_booked = false';
    const params = [city, date];
    if (gp_id) {
      query += ' AND g.id = $3';
      params.push(gp_id);
    } else if (symptom_category && symptomToSpecialization[symptom_category]) {
      query += ' AND g.specialization = $3';
      params.push(symptomToSpecialization[symptom_category]);
    }
    if (practice_id) {
      query += ' AND p.id = $' + (params.length + 1);
      params.push(practice_id);
    }

    query += ' ORDER BY a.start_time ASC';

    console.log('Executing query:', query, 'with params:', params);
    const result = await pool.query(query, params);
    console.log('Query result rows:', result.rows);
    res.render('appointments', {
      user: req.user,
      appointments: result.rows,
      cities: cities.rows,
      gps: gps.rows,
      practices: practices.rows,
      notifications: userNotifications,
      error: result.rows.length === 0 ? 'No available appointments found for the selected criteria.' : null,
      conflicts: null,
      recommended: false,
      selectedCity: city,
      selectedDate: date,
      selectedGp: gp_id || null,
      selectedPractice: practice_id || null,
      selectedSymptom: symptom_category || null
    });
  } catch (error) {
    console.error('Error in /availability:', error);
    await initializeNotificationsFile();
    const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE));
    const userNotifications = notifications.filter(n => n.user_id == req.user.id && !n.is_read);
    res.render('appointments', {
      user: req.user,
      appointments: [],
      cities: [],
      gps: [],
      practices: [],
      notifications: userNotifications,
      error: 'Error loading appointments: ' + error.message,
      conflicts: null,
      recommended: false,
      selectedCity: city || null,
      selectedDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
      selectedGp: null,
      selectedPractice: null,
      selectedSymptom: null
    });
  }
});

// Fallback for GET /recommend
router.get('/recommend', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  console.log('GET /recommend - req.query:', req.query);
  try {
    const cities = await pool.query('SELECT DISTINCT city FROM practices');
    const gps = await pool.query('SELECT id, name, specialization FROM gps');
    const practices = await pool.query('SELECT id, name, city FROM practices');
    const userPrefs = await pool.query('SELECT preferred_gp FROM users WHERE id = $1', [req.user.id]);
    await initializeNotificationsFile();
    const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE));
    const userNotifications = notifications.filter(n => n.user_id == req.user.id && !n.is_read);
    res.render('appointments', {
      user: req.user,
      appointments: [],
      cities: cities.rows,
      gps: gps.rows,
      practices: practices.rows,
      notifications: userNotifications,
      error: 'Please use the intelligent scheduling form to get recommendations.',
      conflicts: null,
      recommended: false,
      selectedCity: userPrefs.rows[0]?.preferred_gp ? cities.rows.find(c => c.city === 'London')?.city || cities.rows[0]?.city || null : null,
      selectedDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
      selectedGp: userPrefs.rows[0]?.preferred_gp || null,
      selectedPractice: null,
      selectedSymptom: null
    });
  } catch (error) {
    console.error('Error in GET /recommend:', error);
    await initializeNotificationsFile();
    const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE));
    const userNotifications = notifications.filter(n => n.user_id == req.user.id && !n.is_read);
    res.render('appointments', {
      user: req.user,
      appointments: [],
      cities: [],
      gps: [],
      practices: [],
      notifications: userNotifications,
      error: 'Error loading recommendation form: ' + error.message,
      conflicts: null,
      recommended: false,
      selectedCity: null,
      selectedDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
      selectedGp: null,
      selectedPractice: null,
      selectedSymptom: null
    });
  }
});

// Intelligent Scheduling with Triage (FR8, 2.2)
router.post('/recommend', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }

  console.log('POST /recommend - req.body:', req.body);

  const {
    city = '',
    date = '',
    gp_id = '',
    practice_id = '',
    preferred_time = '',
    symptom_category = '',
    symptom_duration = '',
    red_flags = {}
  } = req.body || {};

  const recommend = req.body?.recommend === 'true';

  if (!recommend) {
    return res.redirect(
      `/api/appointments/availability?city=${encodeURIComponent(city)}` +
      `&date=${encodeURIComponent(date)}` +
      `&gp_id=${encodeURIComponent(gp_id)}` +
      `&practice_id=${encodeURIComponent(practice_id)}` +
      `&symptom_category=${encodeURIComponent(symptom_category)}`
    );
  }

  try {
    const cities = await pool.query(
      'SELECT DISTINCT city FROM practices ORDER BY city'
    );

    const gps = await pool.query(
      'SELECT id, name, specialization FROM gps ORDER BY name'
    );

    const practices = await pool.query(
      'SELECT id, name, city FROM practices ORDER BY city, name'
    );

    const userPrefs = await pool.query(
      'SELECT preferred_gp FROM users WHERE id = $1',
      [req.user.id]
    );

    await initializeNotificationsFile();

    const notifications = JSON.parse(
      await fs.readFile(NOTIFICATIONS_FILE)
    );

    const userNotifications = notifications.filter(
      n => n.user_id == req.user.id && !n.is_read
    );

    if (!city || !date) {
      return res.render('appointments', {
        user: req.user,
        appointments: [],
        cities: cities.rows,
        gps: gps.rows,
        practices: practices.rows,
        notifications: userNotifications,
        error: 'City and date are required for intelligent scheduling.',
        conflicts: null,
        recommended: false,
        selectedCity: city || null,
        selectedDate:
          date ||
          new Date(
            new Date().setDate(new Date().getDate() + 1)
          )
            .toISOString()
            .split('T')[0],
        selectedGp: gp_id || userPrefs.rows[0]?.preferred_gp || null,
        selectedPractice: practice_id || null,
        selectedSymptom: symptom_category || null
      });
    }

    const validSymptoms = [
      'Respiratory',
      'Pain',
      'Fever',
      'Digestive',
      'Skin',
      'Other'
    ];

    if (
      symptom_category &&
      !validSymptoms.includes(symptom_category)
    ) {
      return res.render('appointments', {
        user: req.user,
        appointments: [],
        cities: cities.rows,
        gps: gps.rows,
        practices: practices.rows,
        notifications: userNotifications,
        error: 'Invalid symptom category.',
        conflicts: null,
        recommended: false,
        selectedCity: city,
        selectedDate: date,
        selectedGp: gp_id || null,
        selectedPractice: practice_id || null,
        selectedSymptom: null
      });
    }

    const preferredGp =
      userPrefs.rows[0]?.preferred_gp || null;

    const bookingHistory = await pool.query(
      `
        SELECT gp_id, COUNT(*)::int AS count
        FROM appointments
        WHERE user_id = $1
          AND is_booked = true
        GROUP BY gp_id
      `,
      [req.user.id]
    );

    let query = `
      SELECT
        a.id,
        a.gp_id,
        g.name AS gp_name,
        a.start_time,
        a.end_time,
        p.city,
        p.name AS practice_name,
        a.is_booked,
        a.user_id,
        g.specialization
      FROM appointments a
      JOIN gps g ON a.gp_id = g.id
      JOIN practices p ON g.practice_id = p.id
      WHERE a.is_booked = false
    `;

    const params = [];

    query += ` AND p.city = $${params.length + 1}`;
    params.push(city);

    query += ` AND a.start_time::date >= $${params.length + 1}`;
    params.push(date);

    if (gp_id) {
      query += ` AND g.id = $${params.length + 1}`;
      params.push(gp_id);
    } else if (preferredGp) {
      query += ` AND g.id = $${params.length + 1}`;
      params.push(preferredGp);
    }

    if (
      symptom_category &&
      symptomToSpecialization[symptom_category]
    ) {
      query += ` AND g.specialization = $${params.length + 1}`;
      params.push(
        symptomToSpecialization[symptom_category]
      );
    }

    if (practice_id) {
      query += ` AND p.id = $${params.length + 1}`;
      params.push(practice_id);
    }

    if (preferred_time) {
      query += ` AND a.start_time::time = $${params.length + 1}`;
      params.push(preferred_time);
    }

    query += ' ORDER BY a.start_time ASC';

    console.log(
      'Executing recommend query:',
      query,
      'with params:',
      params
    );

    const result = await pool.query(query, params);

    const urgency = triageUrgency({
      symptom_category,
      symptom_duration,
      red_flags
    });

    const startDate = new Date(`${date}T00:00:00`);
    const maxDate = new Date(startDate);

    if (urgency === 'Urgent') {
      maxDate.setDate(startDate.getDate() + 1);
    } else if (urgency === 'Soon') {
      maxDate.setDate(startDate.getDate() + 3);
    } else {
      maxDate.setDate(startDate.getDate() + 7);
    }

    const historyCountForGp = gpId => {
      const row = bookingHistory.rows.find(
        h => String(h.gp_id) === String(gpId)
      );

      return row?.count || 0;
    };

    const scoredAppointments = result.rows
      .map(appt => {
        const apptDate = new Date(appt.start_time);
        let score = 0;

        if (urgency === 'Urgent') {
          score += apptDate <= maxDate ? 100 : -100;
        } else if (urgency === 'Soon') {
          score += apptDate <= maxDate ? 50 : -50;
        } else {
          score += apptDate <= maxDate ? 25 : -25;
        }

        if (
          preferredGp &&
          String(appt.gp_id) === String(preferredGp)
        ) {
          score += 50;
        }

        score += historyCountForGp(appt.gp_id) * 10;

        return {
          ...appt,
          urgency,
          recommendation_score: score
        };
      })
      .sort((a, b) => {
        if (
          b.recommendation_score !==
          a.recommendation_score
        ) {
          return (
            b.recommendation_score -
            a.recommendation_score
          );
        }

        return (
          new Date(a.start_time) -
          new Date(b.start_time)
        );
      });

    const topRecommendations =
      scoredAppointments.slice(0, 5);

    res.render('appointments', {
      user: req.user,
      appointments: topRecommendations,
      cities: cities.rows,
      gps: gps.rows,
      practices: practices.rows,
      notifications: userNotifications,
      error:
        topRecommendations.length === 0
          ? preferred_time
            ? 'No recommended appointments match the selected preferred time. Try another time or leave Preferred Time blank.'
            : 'No recommended appointments found for the selected criteria.'
          : null,
      conflicts: null,
      recommended: true,
      selectedCity: city,
      selectedDate: date,
      selectedGp: gp_id || preferredGp || null,
      selectedPractice: practice_id || null,
      selectedSymptom: symptom_category || null
    });
  } catch (error) {
    console.error('Error in /recommend:', error);

    await initializeNotificationsFile();

    const notifications = JSON.parse(
      await fs.readFile(NOTIFICATIONS_FILE)
    );

    const userNotifications = notifications.filter(
      n => n.user_id == req.user.id && !n.is_read
    );

    res.render('appointments', {
      user: req.user,
      appointments: [],
      cities: [],
      gps: [],
      practices: [],
      notifications: userNotifications,
      error:
        'Error getting recommendations: ' +
        error.message,
      conflicts: null,
      recommended: false,
      selectedCity: city || null,
      selectedDate:
        date ||
        new Date(
          new Date().setDate(new Date().getDate() + 1)
        )
          .toISOString()
          .split('T')[0],
      selectedGp: null,
      selectedPractice: null,
      selectedSymptom: symptom_category || null
    });
  }
});

// Check Google Calendar Conflicts (FR10)
router.post('/check-conflicts', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  console.log('POST /check-conflicts - req.body:', req.body);
  const { start_time, end_time } = req.body;
  try {
    const cities = await pool.query('SELECT DISTINCT city FROM practices');
    const gps = await pool.query('SELECT id, name, specialization FROM gps');
    const practices = await pool.query('SELECT id, name, city FROM practices');
    const userPrefs = await pool.query('SELECT preferred_gp, google_tokens FROM users WHERE id = $1', [req.user.id]);
    await initializeNotificationsFile();
    const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE));
    const userNotifications = notifications.filter(n => n.user_id == req.user.id && !n.is_read);
    const tokens = userPrefs.rows[0]?.google_tokens;

    let conflicts = [];
    let errorMessage = null;
    if (!tokens) {
      errorMessage = 'Google Calendar not linked. Please link your calendar in preferences.';
    } else {
      conflicts = await checkGoogleConflicts(tokens, start_time, end_time);
    }

    const appointments = await pool.query(
      'SELECT a.id, a.gp_id, g.name AS gp_name, a.start_time, a.end_time, p.city, p.name AS practice_name, a.is_booked, a.user_id, g.specialization ' +
      'FROM appointments a JOIN gps g ON a.gp_id = g.id JOIN practices p ON g.practice_id = p.id ' +
      'WHERE a.is_booked = true AND a.user_id = $1',
      [req.user.id]
    );

    res.render('appointments', {
      user: req.user,
      appointments: appointments.rows,
      cities: cities.rows,
      gps: gps.rows,
      practices: practices.rows,
      notifications: userNotifications,
      error: errorMessage || (conflicts.length > 0 ? 'Conflicts found with your Google Calendar.' : 'No conflicts found.'),
      conflicts: conflicts.length > 0 ? conflicts : null,
      recommended: false,
      selectedCity: userPrefs.rows[0]?.preferred_gp ? cities.rows.find(c => c.city === 'London')?.city || cities.rows[0]?.city || null : null,
      selectedDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
      selectedGp: userPrefs.rows[0]?.preferred_gp || null,
      selectedPractice: null,
      selectedSymptom: null
    });
  } catch (error) {
    console.error('Error in /check-conflicts:', error);
    const cities = await pool.query('SELECT DISTINCT city FROM practices').catch(() => ({ rows: [] }));
    const gps = await pool.query('SELECT id, name, specialization FROM gps').catch(() => ({ rows: [] }));
    const practices = await pool.query('SELECT id, name, city FROM practices').catch(() => ({ rows: [] }));
    const appointments = await pool.query(
      'SELECT a.id, a.gp_id, g.name AS gp_name, a.start_time, a.end_time, p.city, p.name AS practice_name, a.is_booked, a.user_id, g.specialization ' +
      'FROM appointments a JOIN gps g ON a.gp_id = g.id JOIN practices p ON g.practice_id = p.id ' +
      'WHERE a.is_booked = true AND a.user_id = $1',
      [req.user.id]
    ).catch(() => ({ rows: [] }));
    await initializeNotificationsFile();
    const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE));
    const userNotifications = notifications.filter(n => n.user_id == req.user.id && !n.is_read);
    res.render('appointments', {
      user: req.user,
      appointments: appointments.rows,
      cities: cities.rows,
      gps: gps.rows,
      practices: practices.rows,
      notifications: userNotifications,
      error: 'Error checking conflicts: ' + error.message,
      conflicts: null,
      recommended: false,
      selectedCity: null,
      selectedDate: new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0],
      selectedGp: null,
      selectedPractice: null,
      selectedSymptom: null
    });
  }
});

// Book Appointment (FR4, FR10)
router.post('/book', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  console.log('POST /book - req.body:', req.body);
  const { appointment_id } = req.body;
  try {
    const appt = await pool.query(
      'SELECT a.*, g.name AS gp_name, p.city, p.name AS practice_name, g.specialization FROM appointments a JOIN gps g ON a.gp_id = g.id JOIN practices p ON g.practice_id = p.id WHERE a.id = $1 AND a.is_booked = false',
      [appointment_id]
    );
    if (appt.rows.length === 0) {
      return res.redirect('/success?message=Appointment already booked or invalid');
    }
    const { start_time, end_time, gp_name, city, practice_name } = appt.rows[0];
    const tokens = (await pool.query('SELECT google_tokens FROM users WHERE id = $1', [req.user.id])).rows[0]?.google_tokens;
    if (tokens) {
      const conflicts = await checkGoogleConflicts(tokens, start_time, end_time);
      if (conflicts.length > 0) {
        return res.redirect('/success?message=Cannot book: Conflicts with existing calendar events');
      }
    }
    const result = await pool.query(
      'UPDATE appointments SET is_booked = true, user_id = $1 WHERE id = $2 AND is_booked = false RETURNING *',
      [req.user.id, appointment_id]
    );
    if (result.rows.length === 0) {
      return res.redirect('/success?message=Appointment already booked');
    }
    await sendEmail(req.user.id, 'Appointment Booked', 'appointment booking', {
      appointment_id,
      gp_name,
      city,
      practice_name,
      start_time: new Date(start_time).toLocaleString(),
      end_time: new Date(end_time).toLocaleString()
    });
    res.redirect('/success?message=Appointment booked successfully');
  } catch (error) {
    console.error('Error in /book:', error);
    res.redirect('/success?message=Error booking appointment');
  }
});

// Cancel Appointment (FR5)
router.post('/cancel', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  console.log('POST /cancel - req.body:', req.body);
  const { appointment_id } = req.body;
  try {
    const appt = await pool.query(
      'SELECT a.*, g.name AS gp_name, p.city, p.name AS practice_name, g.specialization FROM appointments a JOIN gps g ON a.gp_id = g.id JOIN practices p ON g.practice_id = p.id WHERE a.id = $1 AND a.user_id = $2',
      [appointment_id, req.user.id]
    );
    if (appt.rows.length === 0) {
      return res.redirect('/success?message=Invalid appointment or not yours');
    }
    const { gp_name, city, practice_name, start_time, end_time } = appt.rows[0];
    const result = await pool.query(
      'UPDATE appointments SET is_booked = false, user_id = NULL WHERE id = $1 AND user_id = $2 RETURNING *',
      [appointment_id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.redirect('/success?message=Invalid appointment or not yours');
    }
    await sendEmail(req.user.id, 'Appointment Cancelled', 'appointment cancellation', {
      appointment_id,
      gp_name,
      city,
      practice_name,
      start_time: new Date(start_time).toLocaleString(),
      end_time: new Date(end_time).toLocaleString()
    });
    res.redirect('/success?message=Appointment cancelled');
  } catch (error) {
    console.error('Error in /cancel:', error);
    res.redirect('/success?message=Error cancelling appointment');
  }
});


// Get Current User's Upcoming Booked Appointments for Swap (FR6)
router.get('/swap-options', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Please log in' });
  }

  try {
    const myAppointments = await pool.query(
      `
        SELECT
          a.id,
          a.gp_id,
          a.user_id,
          a.start_time,
          a.end_time,
          a.is_booked,
          g.name AS gp_name,
          g.specialization,
          p.name AS practice_name,
          p.city
        FROM appointments a
        JOIN gps g ON a.gp_id = g.id
        JOIN practices p ON g.practice_id = p.id
        WHERE a.is_booked = true
          AND a.user_id = $1
          AND a.start_time >= CURRENT_DATE
        ORDER BY a.start_time
      `,
      [req.user.id]
    );

    res.json({ appointments: myAppointments.rows });
  } catch (error) {
    console.error('Error loading swap options:', error);
    res.status(500).json({ error: 'Failed to load your appointments' });
  }
});

// Get Other Users' Upcoming Booked Appointments in the Same City (FR6)
router.get('/swap-targets', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.status(401).json({ error: 'Please log in' });
  }

  const { city, exclude_id } = req.query;

  if (!city) {
    return res.status(400).json({ error: 'City is required' });
  }

  try {
    const params = [req.user.id, city];
    let query = `
      SELECT
        a.id,
        a.gp_id,
        a.user_id,
        a.start_time,
        a.end_time,
        a.is_booked,
        g.name AS gp_name,
        g.specialization,
        p.name AS practice_name,
        p.city
      FROM appointments a
      JOIN gps g ON a.gp_id = g.id
      JOIN practices p ON g.practice_id = p.id
      WHERE a.is_booked = true
        AND a.user_id IS NOT NULL
        AND a.user_id <> $1
        AND p.city = $2
        AND a.start_time >= CURRENT_DATE
    `;

    if (exclude_id) {
      params.push(exclude_id);
      query += ` AND a.id <> $3`;
    }

    query += ' ORDER BY a.start_time';

    const targets = await pool.query(query, params);
    res.json({ appointments: targets.rows });
  } catch (error) {
    console.error('Error loading swap targets:', error);
    res.status(500).json({ error: 'Failed to load target appointments' });
  }
});

// Swap Appointment (FR6)
router.post('/swap', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  console.log('POST /swap - req.body:', req.body);
  const { my_appointment_id, target_appointment_id } = req.body;
  try {
    const myAppt = await pool.query(
      'SELECT a.*, g.name AS gp_name, p.city, p.name AS practice_name, g.specialization FROM appointments a JOIN gps g ON a.gp_id = g.id JOIN practices p ON g.practice_id = p.id WHERE a.id = $1 AND a.user_id = $2',
      [my_appointment_id, req.user.id]
    );
    const targetAppt = await pool.query(
      'SELECT a.*, g.name AS gp_name, p.city, p.name AS practice_name, g.specialization FROM appointments a JOIN gps g ON a.gp_id = g.id JOIN practices p ON g.practice_id = p.id WHERE a.id = $1 AND a.is_booked = true AND a.user_id IS NOT NULL AND a.user_id <> $2',
      [target_appointment_id, req.user.id]
    );
    if (myAppt.rows.length === 0 || targetAppt.rows.length === 0) {
      return res.redirect('/success?message=Invalid appointments');
    }
    if (String(my_appointment_id) === String(target_appointment_id)) {
      return res.redirect('/success?message=Cannot swap with the same appointment');
    }
    const { gp_name: my_gp_name, city: my_city, practice_name: my_practice_name, start_time: my_start_time } = myAppt.rows[0];
    const { gp_name: target_gp_name, city: target_city, practice_name: target_practice_name, start_time: target_start_time } = targetAppt.rows[0];

    if (my_city !== target_city) {
      return res.redirect('/success?message=Swap appointments must be in the same city');
    }
    await pool.query('INSERT INTO swap_requests (user_id, current_appointment_id, target_appointment_id, status) VALUES ($1, $2, $3, $4)', [
      req.user.id,
      my_appointment_id,
      target_appointment_id,
      'pending'
    ]);
    await sendEmail(req.user.id, 'Swap Request Submitted', 'swap request', {
      current_appointment: `${my_gp_name} - ${my_practice_name} (${my_city}) - ${new Date(my_start_time).toLocaleString()}`,
      target_appointment: `${target_gp_name} - ${target_practice_name} (${target_city}) - ${new Date(target_start_time).toLocaleString()}`,
      status: 'Pending'
    });
    res.redirect('/success?message=Swap request submitted');
  } catch (error) {
    console.error('Error in /swap:', error);
    res.redirect('/success?message=Error requesting swap');
  }
});

// View Feedback
router.get('/feedback', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  try {
    const appointments = await pool.query(
      'SELECT a.id, a.gp_id, g.name AS gp_name, a.start_time, a.end_time, p.city, p.name AS practice_name, a.is_booked, a.user_id, g.specialization ' +
      'FROM appointments a JOIN gps g ON a.gp_id = g.id JOIN practices p ON g.practice_id = p.id ' +
      'WHERE a.is_booked = true AND a.user_id = $1',
      [req.user.id]
    );
    let feedbackQuery;
    if (req.user.role === 'user') {
      feedbackQuery = `
        SELECT f.id, f.rating, f.comments, a.gp_id, g.name AS gp_name, a.start_time, u.name AS user_name, p.name AS practice_name
        FROM feedback f
        JOIN appointments a ON f.appointment_id = a.id
        JOIN gps g ON a.gp_id = g.id
        JOIN practices p ON g.practice_id = p.id
        JOIN users u ON f.user_id = u.id
        WHERE f.user_id = $1
      `;
    } else {
      feedbackQuery = `
        SELECT f.id, f.rating, f.comments, a.gp_id, g.name AS gp_name, a.start_time, u.name AS user_name, p.name AS practice_name
        FROM feedback f
        JOIN appointments a ON f.appointment_id = a.id
        JOIN gps g ON a.gp_id = g.id
        JOIN practices p ON g.practice_id = p.id
        JOIN users u ON f.user_id = u.id
      `;
    }
    const feedback = await pool.query(feedbackQuery, req.user.role === 'user' ? [req.user.id] : []);
    await initializeNotificationsFile();
    const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE));
    const userNotifications = notifications.filter(n => n.user_id == req.user.id && !n.is_read);
    res.render('feedback', {
      user: req.user,
      appointments: appointments.rows,
      feedback: feedback.rows,
      notifications: userNotifications,
      error: null
    });
  } catch (error) {
    console.error('Error loading feedback:', error);
    await initializeNotificationsFile();
    const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE));
    const userNotifications = notifications.filter(n => n.user_id == req.user.id && !n.is_read);
    res.render('feedback', {
      user: req.user,
      appointments: [],
      feedback: [],
      notifications: userNotifications,
      error: 'Error loading feedback: ' + error.message
    });
  }
});

// Submit Feedback
router.post('/feedback', auth, async (req, res) => {
  if (!req.user || !req.user.id || req.user.role !== 'user') {
    return res.redirect('/login');
  }
  console.log('POST /feedback - req.body:', req.body);
  const { appointment_id, rating, comments } = req.body;
  if (!appointment_id || !rating || rating < 1 || rating > 5) {
    return res.redirect('/success?message=Invalid appointment or rating (must be 1-5)');
  }
  try {
    const appt = await pool.query(
      'SELECT a.*, g.name AS gp_name, p.city, p.name AS practice_name, g.specialization FROM appointments a JOIN gps g ON a.gp_id = g.id JOIN practices p ON g.practice_id = p.id WHERE a.id = $1 AND a.user_id = $2 AND a.is_booked = true',
      [appointment_id, req.user.id]
    );
    if (appt.rows.length === 0) {
      return res.redirect('/success?message=Invalid appointment or not yours');
    }
    const existingFeedback = await pool.query('SELECT * FROM feedback WHERE appointment_id = $1 AND user_id = $2', [appointment_id, req.user.id]);
    if (existingFeedback.rows.length > 0) {
      return res.redirect('/success?message=Feedback already submitted for this appointment');
    }
    const { gp_name, city, practice_name, start_time } = appt.rows[0];
    await pool.query('INSERT INTO feedback (user_id, appointment_id, rating, comments) VALUES ($1, $2, $3, $4)', [
      req.user.id,
      appointment_id,
      rating,
      comments || ''
    ]);
    await sendEmail(req.user.id, 'Feedback Submitted', 'feedback submission', {
      appointment_id,
      gp_name,
      city,
      practice_name,
      start_time: new Date(start_time).toLocaleString(),
      rating,
      comments: comments || 'No comments'
    });
    res.redirect('/success?message=Feedback submitted successfully');
  } catch (error) {
    console.error('Error in /feedback:', error);
    res.redirect('/success?message=Error submitting feedback: ' + error.message);
  }
});

// Mark Notification as Read
router.post('/mark-notification-read', auth, async (req, res) => {
  if (!req.user || !req.user.id) {
    return res.redirect('/login');
  }
  const { notification_id } = req.body;
  if (!notification_id) {
    return res.redirect('/success?message=Missing%20notification%20ID');
  }
  try {
    await initializeNotificationsFile();
    const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE));
    const notification = notifications.find(n => n.id === notification_id && n.user_id == req.user.id);
    if (!notification) {
      return res.redirect('/success?message=Invalid%20notification%20ID');
    }
    notification.is_read = true;
    await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));
    res.redirect('/appointments?message=Notification%20marked%20as%20read');
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.redirect('/success?message=Error%20marking%20notification%20as%20read');
  }
});

module.exports = router;