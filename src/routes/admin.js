const express = require('express');
const pool = require('../config/db');
const auth = require('../middleware/auth');
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

// Generate a simple UUID for notification IDs
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Admin Dashboard
router.get('/dashboard', auth, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.redirect('/login');
  }
  try {
    const swapRequests = await pool.query(
      'SELECT sr.id, sr.user_id, u.name AS user_name, sr.current_appointment_id, sr.target_appointment_id, sr.status, a1.start_time AS current_start, a2.start_time AS target_start, g1.name AS current_gp_name, p1.city AS current_city, p1.name AS current_practice_name, g2.name AS target_gp_name, p2.city AS target_city, p2.name AS target_practice_name ' +
      'FROM swap_requests sr ' +
      'JOIN users u ON sr.user_id = u.id ' +
      'JOIN appointments a1 ON sr.current_appointment_id = a1.id ' +
      'JOIN appointments a2 ON sr.target_appointment_id = a2.id ' +
      'JOIN gps g1 ON a1.gp_id = g1.id ' +
      'JOIN gps g2 ON a2.gp_id = g2.id ' +
      'JOIN practices p1 ON g1.practice_id = p1.id ' +
      'JOIN practices p2 ON g2.practice_id = p2.id'
    );
    const feedback = await pool.query(
      'SELECT f.id, f.rating, f.comments, a.gp_id, g.name AS gp_name, a.start_time, u.name AS user_name ' +
      'FROM feedback f ' +
      'JOIN appointments a ON f.appointment_id = a.id ' +
      'JOIN gps g ON a.gp_id = g.id ' +
      'JOIN users u ON f.user_id = u.id'
    );
    const gps = await pool.query(
      'SELECT g.id, g.name, p.name AS practice_name, p.city ' +
      'FROM gps g JOIN practices p ON g.practice_id = p.id'
    );
    const appointments = await pool.query(
      'SELECT a.id, a.gp_id, g.name AS gp_name, a.start_time, a.end_time, p.name AS practice_name, p.city, a.is_booked ' +
      'FROM appointments a JOIN gps g ON a.gp_id = g.id JOIN practices p ON g.practice_id = p.id ' +
      'WHERE a.start_time >= $1',
      [new Date()]
    );
    const practices = await pool.query('SELECT id, name, city FROM practices');
    res.render('admin', {
      user: req.user,
      swapRequests: swapRequests.rows,
      feedback: feedback.rows,
      gps: gps.rows,
      appointments: appointments.rows,
      practices: practices.rows,
      error: null,
      success: req.query.success || null
    });
  } catch (error) {
    console.error('Error loading admin dashboard:', error);
    res.render('admin', {
      user: req.user,
      swapRequests: [],
      feedback: [],
      gps: [],
      appointments: [],
      practices: [],
      error: 'Error loading admin dashboard: ' + error.message,
      success: null
    });
  }
});

// Add New GP
router.post('/add-gp', auth, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.redirect('/login');
  }
  const { gp_name, practice_id } = req.body;
  if (!gp_name || !practice_id) {
    return res.redirect('/api/admin/dashboard?error=Missing%20GP%20name%20or%20practice');
  }
  try {
    const practice = await pool.query('SELECT id FROM practices WHERE id = $1', [practice_id]);
    if (practice.rows.length === 0) {
      return res.redirect('/api/admin/dashboard?error=Invalid%20practice%20selected');
    }
    const existingGp = await pool.query('SELECT id FROM gps WHERE name = $1', [gp_name]);
    if (existingGp.rows.length > 0) {
      return res.redirect('/api/admin/dashboard?error=GP%20name%20already%20exists');
    }
    await pool.query('INSERT INTO gps (name, practice_id) VALUES ($1, $2)', [gp_name, practice_id]);
    res.redirect('/api/admin/dashboard?success=GP%20added%20successfully');
  } catch (error) {
    console.error('Error adding GP:', error);
    res.redirect('/api/admin/dashboard?error=Error%20adding%20GP:%20' + encodeURIComponent(error.message));
  }
});

// Edit GP
router.post('/edit-gp', auth, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.redirect('/login');
  }
  const { gp_id, gp_name, practice_id } = req.body;
  if (!gp_id || !gp_name || !practice_id) {
    return res.redirect('/api/admin/dashboard?error=Missing%20required%20fields');
  }
  try {
    const practice = await pool.query('SELECT id FROM practices WHERE id = $1', [practice_id]);
    if (practice.rows.length === 0) {
      return res.redirect('/api/admin/dashboard?error=Invalid%20practice%20selected');
    }
    const existingGp = await pool.query('SELECT id FROM gps WHERE name = $1 AND id != $2', [gp_name, gp_id]);
    if (existingGp.rows.length > 0) {
      return res.redirect('/api/admin/dashboard?error=GP%20name%20already%20exists');
    }
    await pool.query('UPDATE gps SET name = $1, practice_id = $2 WHERE id = $3', [gp_name, practice_id, gp_id]);
    res.redirect('/api/admin/dashboard?success=GP%20updated%20successfully');
  } catch (error) {
    console.error('Error editing GP:', error);
    res.redirect('/api/admin/dashboard?error=Error%20editing%20GP:%20' + encodeURIComponent(error.message));
  }
});

// Delete GP
router.post('/delete-gp', auth, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.redirect('/login');
  }
  const { gp_id } = req.body;
  if (!gp_id) {
    return res.redirect('/api/admin/dashboard?error=Missing%20GP%20ID');
  }
  try {
    const linkedAccounts = await pool.query(
      'SELECT id FROM users WHERE gp_id = $1 LIMIT 1',
      [gp_id]
    );
    if (linkedAccounts.rows.length > 0) {
      return res.redirect('/api/admin/dashboard?error=Cannot%20delete%20GP%20while%20a%20user%20account%20is%20linked');
    }
    const appointments = await pool.query('SELECT id FROM appointments WHERE gp_id = $1', [gp_id]);
    if (appointments.rows.length > 0) {
      return res.redirect('/api/admin/dashboard?error=Cannot%20delete%20GP%20with%20existing%20appointments');
    }
    const gp = await pool.query('SELECT id FROM gps WHERE id = $1', [gp_id]);
    if (gp.rows.length === 0) {
      return res.redirect('/api/admin/dashboard?error=Invalid%20GP%20ID');
    }
    await pool.query('DELETE FROM gps WHERE id = $1', [gp_id]);
    res.redirect('/api/admin/dashboard?success=GP%20deleted%20successfully');
  } catch (error) {
    console.error('Error deleting GP:', error);
    res.redirect('/api/admin/dashboard?error=Error%20deleting%20GP:%20' + encodeURIComponent(error.message));
  }
});

// Add New Appointment
router.post('/add-appointment', auth, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.redirect('/login');
  }
  const { gp_id, start_time, end_time } = req.body;
  if (!gp_id || !start_time || !end_time) {
    return res.redirect('/api/admin/dashboard?error=Missing%20required%20fields');
  }
  try {
    const gp = await pool.query('SELECT id FROM gps WHERE id = $1', [gp_id]);
    if (gp.rows.length === 0) {
      return res.redirect('/api/admin/dashboard?error=Invalid%20GP%20selected');
    }
    const start = new Date(start_time);
    const end = new Date(end_time);
    const now = new Date();
    if (start < now) {
      return res.redirect('/api/admin/dashboard?error=Start%20time%20cannot%20be%20in%20the%20past');
    }
    if (end <= start) {
      return res.redirect('/api/admin/dashboard?error=End%20time%20must%20be%20after%20start%20time');
    }
    const overlap = await pool.query(
      'SELECT id FROM appointments WHERE gp_id = $1 AND is_booked = false AND ($2 < end_time AND $3 > start_time)',
      [gp_id, start, end]
    );
    if (overlap.rows.length > 0) {
      return res.redirect('/api/admin/dashboard?error=Appointment%20overlaps%20with%20existing%20appointment');
    }
    await pool.query(
      'INSERT INTO appointments (gp_id, start_time, end_time, is_booked) VALUES ($1, $2, $3, $4)',
      [gp_id, start, end, false]
    );
    res.redirect('/api/admin/dashboard?success=Appointment%20added%20successfully');
  } catch (error) {
    console.error('Error adding appointment:', error);
    res.redirect('/api/admin/dashboard?error=Error%20adding%20appointment:%20' + encodeURIComponent(error.message));
  }
});

// Edit Appointment
router.post('/edit-appointment', auth, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.redirect('/login');
  }
  const { appointment_id, gp_id, start_time, end_time } = req.body;
  if (!appointment_id || !gp_id || !start_time || !end_time) {
    return res.redirect('/api/admin/dashboard?error=Missing%20required%20fields');
  }
  try {
    const gp = await pool.query('SELECT id FROM gps WHERE id = $1', [gp_id]);
    if (gp.rows.length === 0) {
      return res.redirect('/api/admin/dashboard?error=Invalid%20GP%20selected');
    }
    const appointment = await pool.query('SELECT is_booked FROM appointments WHERE id = $1', [appointment_id]);
    if (appointment.rows.length === 0) {
      return res.redirect('/api/admin/dashboard?error=Invalid%20appointment%20ID');
    }
    if (appointment.rows[0].is_booked) {
      return res.redirect('/api/admin/dashboard?error=Cannot%20edit%20booked%20appointment');
    }
    const start = new Date(start_time);
    const end = new Date(end_time);
    const now = new Date();
    if (start < now) {
      return res.redirect('/api/admin/dashboard?error=Start%20time%20cannot%20be%20in%20the%20past');
    }
    if (end <= start) {
      return res.redirect('/api/admin/dashboard?error=End%20time%20must%20be%20after%20start%20time');
    }
    const overlap = await pool.query(
      'SELECT id FROM appointments WHERE gp_id = $1 AND id != $2 AND is_booked = false AND ($3 < end_time AND $4 > start_time)',
      [gp_id, appointment_id, start, end]
    );
    if (overlap.rows.length > 0) {
      return res.redirect('/api/admin/dashboard?error=Appointment%20overlaps%20with%20existing%20appointment');
    }
    await pool.query(
      'UPDATE appointments SET gp_id = $1, start_time = $2, end_time = $3 WHERE id = $4',
      [gp_id, start, end, appointment_id]
    );
    res.redirect('/api/admin/dashboard?success=Appointment%20updated%20successfully');
  } catch (error) {
    console.error('Error editing appointment:', error);
    res.redirect('/api/admin/dashboard?error=Error%20editing%20appointment:%20' + encodeURIComponent(error.message));
  }
});

// Delete Appointment
router.post('/delete-appointment', auth, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.redirect('/login');
  }
  const { appointment_id } = req.body;
  if (!appointment_id) {
    return res.redirect('/api/admin/dashboard?error=Missing%20appointment%20ID');
  }
  try {
    const appointment = await pool.query('SELECT is_booked FROM appointments WHERE id = $1', [appointment_id]);
    if (appointment.rows.length === 0) {
      return res.redirect('/api/admin/dashboard?error=Invalid%20appointment%20ID');
    }
    if (appointment.rows[0].is_booked) {
      return res.redirect('/api/admin/dashboard?error=Cannot%20delete%20booked%20appointment');
    }
    await pool.query('DELETE FROM appointments WHERE id = $1', [appointment_id]);
    res.redirect('/api/admin/dashboard?success=Appointment%20deleted%20successfully');
  } catch (error) {
    console.error('Error deleting appointment:', error);
    res.redirect('/api/admin/dashboard?error=Error%20deleting%20appointment:%20' + encodeURIComponent(error.message));
  }
});

// Approve Swap Request
router.post('/approve-swap', auth, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.redirect('/login');
  }
  const { request_id } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const swap = await client.query(
      'SELECT sr.user_id, sr.current_appointment_id, sr.target_appointment_id, a1.gp_id AS current_gp_id, a1.start_time AS current_start, a1.end_time AS current_end, p1.city AS current_city, g1.name AS current_gp_name, a2.gp_id AS target_gp_id, a2.start_time AS target_start, a2.end_time AS target_end, p2.city AS target_city, g2.name AS target_gp_name ' +
      'FROM swap_requests sr ' +
      'JOIN appointments a1 ON sr.current_appointment_id = a1.id ' +
      'JOIN appointments a2 ON sr.target_appointment_id = a2.id ' +
      'JOIN gps g1 ON a1.gp_id = g1.id ' +
      'JOIN gps g2 ON a2.gp_id = g2.id ' +
      'JOIN practices p1 ON g1.practice_id = p1.id ' +
      'JOIN practices p2 ON g2.practice_id = p2.id ' +
      'WHERE sr.id = $1 AND sr.status = $2 FOR UPDATE OF sr, a1, a2',
      [request_id, 'pending']
    );
    if (swap.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.redirect('/success?message=Invalid%20or%20already%20processed%20swap%20request');
    }
    const { user_id, current_appointment_id, target_appointment_id, current_gp_name, current_city, current_start, target_gp_name, target_city, target_start } = swap.rows[0];
    const currentAppt = await client.query('SELECT user_id FROM appointments WHERE id = $1 FOR UPDATE', [current_appointment_id]);
    const targetAppt = await client.query('SELECT user_id FROM appointments WHERE id = $1 FOR UPDATE', [target_appointment_id]);

    if (!currentAppt.rows[0] || !targetAppt.rows[0]) {
      throw new Error('One or both appointments no longer exist');
    }

    await client.query('UPDATE appointments SET user_id = $1 WHERE id = $2', [targetAppt.rows[0].user_id, current_appointment_id]);
    await client.query('UPDATE appointments SET user_id = $1 WHERE id = $2', [currentAppt.rows[0].user_id, target_appointment_id]);
    await client.query('UPDATE swap_requests SET status = $1 WHERE id = $2', ['approved', request_id]);
    await client.query('COMMIT');

    // Write notification to JSON file for both users
    await initializeNotificationsFile();
    const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE));
    const newNotifications = [];

    // Notification for the requesting user
    newNotifications.push({
      id: generateUUID(),
      user_id: user_id,
      message: `Your swap request has been approved. Your new appointment is with ${target_gp_name} in ${target_city} on ${new Date(target_start).toLocaleString()}.`,
      status: 'approved',
      created_at: new Date().toISOString(),
      is_read: false
    });

    // Notification for the target user (if different)
    if (targetAppt.rows[0].user_id && targetAppt.rows[0].user_id !== user_id) {
      newNotifications.push({
        id: generateUUID(),
        user_id: targetAppt.rows[0].user_id,
        message: `A swap request affecting your appointment has been approved. Your new appointment is with ${current_gp_name} in ${current_city} on ${new Date(current_start).toLocaleString()}.`,
        status: 'approved',
        created_at: new Date().toISOString(),
        is_read: false
      });
    }

    notifications.push(...newNotifications);
    await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));

    // Send emails
    await sendEmail(user_id, 'Swap Request Approved', 'swap request approval', {
      original_appointment: `${current_gp_name} - ${current_city} - ${new Date(current_start).toLocaleString()}`,
      new_appointment: `${target_gp_name} - ${target_city} - ${new Date(target_start).toLocaleString()}`,
      status: 'Approved'
    });
    if (targetAppt.rows[0].user_id && targetAppt.rows[0].user_id !== user_id) {
      await sendEmail(targetAppt.rows[0].user_id, 'Swap Request Approved', 'swap request approval', {
        original_appointment: `${target_gp_name} - ${target_city} - ${new Date(target_start).toLocaleString()}`,
        new_appointment: `${current_gp_name} - ${current_city} - ${new Date(current_start).toLocaleString()}`,
        status: 'Approved'
      });
    }
    res.redirect('/success?message=Swap%20request%20approved');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    console.error('Error approving swap:', error);
    res.redirect('/success?message=Error%20approving%20swap');
  } finally {
    client.release();
  }
});

// Reject Swap Request
router.post('/reject-swap', auth, async (req, res) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.redirect('/login');
  }
  const { request_id } = req.body;
  try {
    const swap = await pool.query(
      'SELECT sr.user_id, sr.current_appointment_id, sr.target_appointment_id, a1.gp_id AS current_gp_id, a1.start_time AS current_start, p1.city AS current_city, g1.name AS current_gp_name, a2.gp_id AS target_gp_id, a2.start_time AS target_start, p2.city AS target_city, g2.name AS target_gp_name ' +
      'FROM swap_requests sr ' +
      'JOIN appointments a1 ON sr.current_appointment_id = a1.id ' +
      'JOIN appointments a2 ON sr.target_appointment_id = a2.id ' +
      'JOIN gps g1 ON a1.gp_id = g1.id ' +
      'JOIN gps g2 ON a2.gp_id = g2.id ' +
      'JOIN practices p1 ON g1.practice_id = p1.id ' +
      'JOIN practices p2 ON g2.practice_id = p2.id ' +
      'WHERE sr.id = $1 AND sr.status = $2',
      [request_id, 'pending']
    );
    if (swap.rows.length === 0) {
      return res.redirect('/success?message=Invalid%20or%20already%20processed%20swap%20request');
    }
    const { user_id, current_appointment_id, target_appointment_id, current_gp_name, current_city, current_start, target_gp_name, target_city, target_start } = swap.rows[0];
    await pool.query('UPDATE swap_requests SET status = $1 WHERE id = $2', ['rejected', request_id]);

    // Write notification to JSON file
    await initializeNotificationsFile();
    const notifications = JSON.parse(await fs.readFile(NOTIFICATIONS_FILE));
    notifications.push({
      id: generateUUID(),
      user_id: user_id,
      message: `Your swap request for ${current_gp_name} in ${current_city} on ${new Date(current_start).toLocaleString()} to ${target_gp_name} in ${target_city} on ${new Date(target_start).toLocaleString()} has been rejected.`,
      status: 'rejected',
      created_at: new Date().toISOString(),
      is_read: false
    });
    await fs.writeFile(NOTIFICATIONS_FILE, JSON.stringify(notifications, null, 2));

    await sendEmail(user_id, 'Swap Request Rejected', 'swap request rejection', {
      current_appointment: `${current_gp_name} - ${current_city} - ${new Date(current_start).toLocaleString()}`,
      target_appointment: `${target_gp_name} - ${target_city} - ${new Date(target_start).toLocaleString()}`,
      status: 'Rejected'
    });
    res.redirect('/success?message=Swap%20request%20rejected');
  } catch (error) {
    console.error('Error rejecting swap:', error);
    res.redirect('/success?message=Error%20rejecting%20swap');
  }
});

module.exports = router;
