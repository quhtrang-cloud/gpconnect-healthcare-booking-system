const nodemailer = require('nodemailer')
const pool = require('../config/db')

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: Number(process.env.SMTP_PORT) === 465,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
})

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function sendEmail(userId, subject, action, details = {}) {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.EMAIL_FROM) {
      console.warn('Email skipped because SMTP configuration is incomplete')
      return false
    }

    const result = await pool.query(
      'SELECT email, name, notification_preferences FROM users WHERE id = $1',
      [userId]
    )
    const user = result.rows[0]

    if (!user || user.notification_preferences?.email !== true) return false

    const appUrl = process.env.APP_URL || 'http://localhost:3000'
    const supportEmail = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM
    const rows = Object.entries(details).map(([key, value]) => `
      <tr>
        <th style="text-align:left;padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(key.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase()))}</th>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(value)}</td>
      </tr>`).join('')

    const html = `<!doctype html>
      <html lang="en"><body style="margin:0;background:#f4f7fa;font-family:Arial,sans-serif;color:#222;">
        <main style="max-width:640px;margin:24px auto;background:#fff;border-radius:12px;overflow:hidden;">
          <header style="padding:28px;background:#1e3a8a;color:#fff;text-align:center;">
            <h1 style="margin:0;font-size:26px;">${escapeHtml(subject)}</h1>
          </header>
          <section style="padding:28px;">
            <p>Dear ${escapeHtml(user.name || 'User')},</p>
            <p>Your ${escapeHtml(action)} has been processed. The details are shown below.</p>
            <table style="width:100%;border-collapse:collapse;">${rows}</table>
            <p style="margin-top:24px;"><a href="${escapeHtml(appUrl)}/appointments" style="display:inline-block;padding:12px 20px;background:#1e3a8a;color:#fff;text-decoration:none;border-radius:8px;">View appointments</a></p>
            <p>Need help? Contact <a href="mailto:${escapeHtml(supportEmail)}">${escapeHtml(supportEmail)}</a>.</p>
          </section>
          <footer style="padding:18px;background:#f8fafc;text-align:center;color:#555;font-size:13px;">
            <p>GP Appointment System © ${new Date().getFullYear()} | All Rights Reserved</p>
            <p>
              <a href="http://gpappointmentsystem.com">Visit our Website</a> |
              <a href="mailto:support@gpappointmentsystem.com">support@gpappointmentsystem.com</a>
            </p>
            <p>
              <a href="https://facebook.com/gpappointmentsystem">Facebook</a> |
              <a href="https://instagram.com/gpappointmentsystem">Instagram</a> |
              <a href="https://twitter.com/gpappointmentsystem">Twitter</a>
            </p>
          </footer>
        </main>
      </body></html>`

    await transporter.sendMail({
      from: `${process.env.EMAIL_FROM_NAME || 'GPConnect'} <${process.env.EMAIL_FROM}>`,
      to: user.email,
      subject,
      html,
    })
    return true
  } catch (error) {
    console.error(`Error sending email for user_id ${userId}:`, error.message)
    return false
  }
}

module.exports = { sendEmail }
