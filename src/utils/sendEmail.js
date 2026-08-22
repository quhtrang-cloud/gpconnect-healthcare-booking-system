const nodemailer = require('nodemailer')
const pool = require('../config/db')

// Configure Nodemailer with Brevo SMTP
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
})

// Function to send email
async function sendEmail(userId, subject, action, details) {
  try {
    // Fetch user email and notification preferences
    const userResult = await pool.query(
      `
        SELECT email, notification_preferences
        FROM users
        WHERE id = $1
      `,
      [userId]
    )

    if (userResult.rows.length === 0) {
      console.log(
        `User not found for email notification: ${userId}`
      )
      return false
    }

    const {
      email,
      notification_preferences: notificationPreferences,
    } = userResult.rows[0]

    const emailEnabled =
      notificationPreferences?.email === true

    if (!emailEnabled) {
      console.log(
        `Email notifications disabled for user_id: ${userId}`
      )
      return false
    }

    const appUrl =
      process.env.APP_URL || 'http://localhost:3000'

    // Generate HTML email body
    const htmlBody = `
      <html>
        <head>
          <style>
            body {
              background: #f4f7fa;
              margin: 0;
              padding: 0;
              font-family: 'Helvetica Neue', Arial, sans-serif;
              color: #333;
            }

            .email-container {
              max-width: 650px;
              margin: 30px auto;
              background: linear-gradient(
                145deg,
                #ffffff,
                #f9fbfd
              );
              border-radius: 16px;
              box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
              overflow: hidden;
            }

            .header {
              background: linear-gradient(
                90deg,
                #1a73e8,
                #34c0eb
              );
              color: white;
              text-align: center;
              padding: 40px 20px;
              position: relative;
            }

            .header::before {
              content: '';
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              background: url(
                'https://www.transparenttextures.com/patterns/white-diamond.png'
              );
              opacity: 0.1;
            }

            .header h1 {
              margin: 0;
              font-size: 32px;
              font-weight: 700;
              letter-spacing: 1px;
              position: relative;
            }

            .header p {
              margin: 8px 0 0;
              font-size: 16px;
              opacity: 0.9;
              position: relative;
            }

            .content {
              padding: 40px 30px;
              background: #ffffff;
            }

            .content p {
              font-size: 16px;
              line-height: 1.7;
              margin: 0 0 20px;
              color: #444;
            }

            .details {
              background: #f8fafc;
              border-radius: 12px;
              padding: 20px;
              margin: 25px 0;
              border-left: 4px solid #1a73e8;
            }

            .details p {
              margin: 10px 0;
              font-size: 15px;
              font-weight: 500;
              color: #222;
              display: flex;
              justify-content: space-between;
            }

            .details p span:first-child {
              font-weight: 600;
            }

            .cta-button {
              display: inline-block;
              padding: 14px 28px;
              background: #1a73e8;
              color: white;
              text-decoration: none;
              border-radius: 25px;
              font-weight: 600;
              font-size: 16px;
              margin: 20px 0;
            }

            .footer {
              text-align: center;
              font-size: 13px;
              color: #666;
              padding: 25px;
              background: #f8fafc;
              border-top: 1px solid #e8ecef;
            }

            .footer a {
              color: #1a73e8;
              text-decoration: none;
            }

            .social-icons {
              margin-top: 15px;
            }

            .social-icons img {
              width: 24px;
              margin: 0 8px;
              opacity: 0.7;
            }

            @media only screen and (max-width: 600px) {
              .email-container {
                margin: 15px;
                border-radius: 12px;
              }

              .header h1 {
                font-size: 24px;
              }

              .content {
                padding: 20px;
              }

              .details p {
                flex-direction: column;
                gap: 5px;
              }
            }
          </style>
        </head>

        <body>
          <div class="email-container">
            <div class="header">
              <h1>${subject}</h1>
              <p>GP Appointment System</p>
            </div>

            <div class="content">
              <p>Dear User,</p>

              <p>
                Your ${action} has been processed successfully.
                Below are the details:
              </p>

              <div class="details">
                ${Object.entries(details)
                  .map(
                    ([key, value]) => `
                      <p>
                        <strong>
                          ${key
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, (c) => c.toUpperCase())}:
                        </strong>
                        &nbsp;${value}
                      </p>
                    `
                  )
                  .join('')}
              </div>

              <p>
                If you have any questions, please contact us at
                <a href="mailto:${process.env.SUPPORT_EMAIL}">
                  support@gpappointmentsystem.com
                </a>.
              </p>

              <a
                href="${appUrl}/appointments"
                rel="noreferrer"
                class="cta-button"
                style="color: white;"
              >
                View Appointments
              </a>

              <p>
                Thank you for using the GP Appointment System!
              </p>
            </div>

            <div class="footer">
              <p>
                GP Appointment System ©
                ${new Date().getFullYear()}
                | All Rights Reserved
              </p>

              <p>
                <a href="http://gpappointmentsystem.com">
                  Visit our Website
                </a>
                |
                <a href="mailto:support@gpappointmentsystem.com">
                  support@gpappointmentsystem.com
                </a>
              </p>

              <div class="social-icons">
                <a href="https://facebook.com/gpappointmentsystem">
                  <img
                    src="https://img.icons8.com/color/48/000000/facebook-new.png"
                    alt="Facebook"
                  >
                </a>

                <a href="https://instagram.com/gpappointmentsystem">
                  <img
                    src="https://img.icons8.com/color/48/000000/instagram-new.png"
                    alt="Instagram"
                  >
                </a>

                <a href="https://twitter.com/gpappointmentsystem">
                  <img
                    src="https://img.icons8.com/color/48/000000/twitter--v1.png"
                    alt="Twitter"
                  >
                </a>
              </div>
            </div>
          </div>
        </body>
      </html>
    `

    const mailOptions = {
      from: `${
        process.env.EMAIL_FROM_NAME || 'GPConnect'
      } <${process.env.EMAIL_FROM}>`,
      to: email,
      subject,
      html: htmlBody,
    }

    await transporter.sendMail(mailOptions)

    console.log(
      `Email sent successfully for action: ${action}`
    )

    return true
  } catch (error) {
    console.error(
      `Error sending email for user_id ${userId}:`,
      error.message
    )

    return false
  }
}

module.exports = {
  sendEmail,
}