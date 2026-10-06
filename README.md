# Healthcare Appointment Booking System

An individual full-stack prototype exploring more flexible and usable GP appointment booking, built with Node.js, Express, PostgreSQL and EJS.

The application combines city-wide appointment discovery, rule-based scheduling recommendations, controlled appointment swaps, Google Calendar integration, automated email notifications, and role-specific workflows in a single responsive interface.

> **Prototype status:** This application uses simulated data for research and demonstration. It is not a clinical system and must not be used with real patient data, for medical diagnosis or for emergency support. It is not affiliated with or endorsed by the NHS.

![Healthcare appointment booking system responsive interface](docs/images/healthcare-responsive.png)

## Project Context and Contribution

This project was developed independently for my MSc Information Systems dissertation at the University of Portsmouth. It uses simulated data and was evaluated locally without research participants.

I was responsible for requirements analysis, interface design, database design, frontend and backend implementation, integration work, and prototype evaluation. Following the dissertation, I continued improving the codebase and added Jest unit tests and Supertest route tests for booking and selected swap access controls, including a regression test that reproduced and helped resolve a red-flag parsing bug.

## Key Features

- **City-wide appointment discovery** - Search available appointments across practices within a selected city, with filters for practice, GP, date, and symptom category.

- **Rule-based scheduling recommendations** - Filter and rank appointment options using symptom information, urgency indicators, user preferences and previous booking history.

- **Appointment management** - Book, review, and cancel appointments through a user-focused workflow.

- **Controlled appointment swapping** - Request a swap with another user's eligible booked appointment at the same practice, subject to administrator approval.

- **Google Calendar integration** - Authorise access through OAuth 2.0, check for scheduling conflicts, and add confirmed appointments to the user's calendar.

- **Automated email notifications** - Send booking, cancellation and swap-related updates through Nodemailer and Brevo SMTP when configured and enabled.

- **User preferences** - Store preferred GP and notification selections to support a more personalised experience.

- **Post-appointment feedback** - Collect ratings and comments after an appointment has ended.

- **Role-based workflows** - Provide tailored interfaces for users, administrators, and GPs.

- **Accessible interaction** - Support responsive layouts, keyboard-compatible controls, semantic labels, and a persistent high-contrast mode.

- **Support chatbot** - Offer lightweight guidance for common application tasks.

## Core Workflows

### Appointment Discovery and Scheduling

Users can search across multiple practices within a selected city instead of being restricted to a single location. Searches can be refined by practice, GP, date, and symptom category.

When Intelligent Scheduling is enabled, the application applies rule-based urgency categories:

- **Urgent**

- **Soon**

- **Routine**

Available appointments are filtered by city, date and optional criteria such as practice, GP, symptom category and preferred time. The preferred GP is also used as a filter when no GP is explicitly selected. Matching appointments are ranked using urgency rules, preferred GP and previous booking history. The feature supports appointment selection only; it does not diagnose conditions or replace professional clinical assessment.

![Appointment search and intelligent scheduling](docs/images/healthcare-discovery.png)

### Appointment Swapping

The swap workflow provides additional flexibility while retaining administrative control:

1. A user selects one of their upcoming booked appointments.

2. The system displays eligible appointments belonging to other users at the same practice.

3. Each option identifies the GP and specialisation for user selection and administrator review.

4. The user submits a swap request.

5. An administrator reviews and approves or rejects the request.

6. When approved, appointment ownership is exchanged within a database transaction and in-app notifications are created for both affected users. Email delivery is attempted when enabled and configured.

![Appointment swap workflow](docs/images/healthcare-swap.png)

### Google Calendar

Users can connect their Google account through OAuth 2.0. Once authorised, the application can:

- Check a proposed appointment time against events in the user's primary calendar.

- Add a confirmed appointment to the user's primary calendar.

- Refresh an expired access token when a valid refresh token is available.

![Google Calendar integration](docs/images/healthcare-calendar.png)

### Notifications

Email notifications are sent through Nodemailer and Brevo SMTP when configured and enabled by the user.

In-app swap notifications are stored in `src/notifications.json`. This is appropriate for a local prototype; a production implementation should move notification records and delivery state into PostgreSQL.

The SMS checkbox currently stores the user's preference only. SMS delivery is not implemented.

## User Roles

| Role | Capabilities |
| --- | --- |
| User | Register, sign in, search appointments, receive recommendations, book or cancel appointments, request swaps, manage preferences, connect Google Calendar, synchronise appointments, and submit feedback |
| Administrator | Manage GP profiles and appointment slots, review swap requests, approve or reject swaps, and review feedback |
| GP | View appointments and feedback associated with the GP profile linked to the authenticated account |

GP login accounts are linked to GP profiles through `users.gp_id`, which references `gps.id`.

## Technology Stack

| Area | Technologies |
| --- | --- |
| Frontend | EJS, HTML5, CSS3, JavaScript, Bootstrap 5 |
| Backend | Node.js, Express.js |
| Database | PostgreSQL, `pg` |
| Authentication | JWT, HTTP-only cookies, bcrypt password hashing |
| Calendar | Google Calendar API, OAuth 2.0 |
| Email | Nodemailer, Brevo SMTP |
| Testing | Jest, Supertest |
| Development | npm, Git, GitHub |

## Project Structure

```text
.
├── server.js
├── package.json
├── tests
│   ├── admin.test.js
│   ├── auth.test.js
│   ├── appointments.test.js
│   └── triageUrgency.test.js
├── .env.example
└── src
    ├── config
    │   ├── db.js
    │   └── initDb.js
    ├── middleware
    │   └── auth.js
    ├── public
    │   ├── css
    │   ├── images
    │   └── js
    ├── routes
    │   ├── admin.js
    │   ├── appointments.js
    │   ├── calendar.js
    │   └── users.js
    ├── utils
    │   ├── googleCalendar.js
    │   ├── sendEmail.js
    │   └── triageUrgency.js
    ├── views
    │   ├── partials
    │   └── *.ejs
    └── notifications.json
```

## Local Setup

### Prerequisites

- A current Node.js LTS release

- npm

- PostgreSQL

- Google Cloud OAuth credentials for calendar functionality (optional)

- Brevo SMTP credentials for email delivery (optional)

### 1. Clone the repository

```bash
git clone https://github.com/quhtrang-cloud/gpconnect-healthcare-booking-system.git
cd gpconnect-healthcare-booking-system
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the database

Using PostgreSQL CLI:

```bash
createdb appointment_system
```

Alternatively, create a database named `appointment_system` through pgAdmin.

The application runs `initDb()` during startup to initialise the required database structure. Ensure PostgreSQL is running and `DATABASE_URL` points to the correct database before starting the server.

### 4. Configure environment variables

Create `.env` from `.env.example`.

macOS or Linux:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Configure the following values:

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/appointment_system
JWT_SECRET=REPLACE_WITH_A_LONG_RANDOM_SECRET
PORT=3000
NODE_ENV=development
APP_URL=http://localhost:3000
APP_TIMEZONE=Europe/London
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/calendar/callback
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
EMAIL_FROM=
EMAIL_FROM_NAME=GPConnect
SUPPORT_EMAIL=
```

Generate a secure development JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Google and SMTP values may remain empty when their integrations are not being tested. Never commit `.env`, passwords, API credentials, OAuth tokens, or SMTP keys.

### 5. Start the application

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000).

## Local Accounts and Test Data

Accounts created through the registration page are assigned the `user` role. The repository does not publish default administrator or GP passwords, and `initDb()` does not create privileged accounts automatically.

For local testing, first register each account through the application. This ensures that its password is processed by bcrypt rather than stored as plain text. You can then assign the required role in PostgreSQL.

### Create an administrator account

Register an account, then run:

```sql
UPDATE users
SET role = 'admin',
    gp_id = NULL
WHERE email = 'your-admin@example.com';
```

### Create a GP login

A GP login consists of two related records:

- A clinical profile in `gps`, used by appointments and feedback.

- A login account in `users`, linked to that profile through `users.gp_id`.

Create the GP profile through the administrator dashboard, register the GP's login account, and then link the two records using their IDs:

```sql
UPDATE users
SET role = 'gp',
    gp_id = 3
WHERE email = 'your-gp@example.com';
```

Replace `3` with the correct value from `gps.id`. Confirm the relationship before signing in:

```sql
SELECT
  u.id AS user_id,
  u.email,
  u.role,
  u.gp_id,
  g.name AS gp_name,
  g.specialization
FROM users u
LEFT JOIN gps g ON g.id = u.gp_id
WHERE u.email = 'your-gp@example.com';
```

The relationship is ID-based; the name in `users` does not need to match `gps.name`. A GP profile can be linked to only one login account.

After changing an account's role or GP relationship directly in PostgreSQL, sign out and sign in again so the application issues a new JWT containing the updated role and GP ID.

Use the administrator dashboard to add GP profiles and future appointment slots before testing booking. Each appointment must end after it starts.

Testing appointment swaps requires:

- At least two registered users.

- One future booked appointment for each user.

- Both appointments assigned to GPs at the same practice.

- No existing pending request for the same appointment pair.

## Integration Setup

### Google Calendar

1. Create or select a project in Google Cloud Console.

2. Enable the Google Calendar API.

3. Configure the OAuth consent screen.

4. Create an OAuth 2.0 Web application client.

5. Add the following authorised redirect URI:

```text
http://localhost:3000/api/calendar/callback
```

6. Add the client ID and client secret to `.env`.

7. Add the Google account as a test user when the OAuth application is in testing mode.

8. Start the application, sign in as a user, and select **Link Google Calendar** from Preferences.

Google access and refresh tokens may be revoked or expire. Reconnect the calendar if token refresh fails.

### Email

1. Create Brevo SMTP credentials.

2. Verify the sender address configured in `EMAIL_FROM`.

3. Add the SMTP credentials and sender details to `.env`.

4. Enable **Email Notifications** in the user's Preferences page.

## Security and Privacy

- Passwords are hashed using bcrypt.

- JWTs are signed using `JWT_SECRET` and stored in HTTP-only cookies.

- Authentication cookies use `SameSite=Lax` and the `Secure` flag in production mode.

- Database operations use parameterised queries for user-supplied values.

- Application secrets are loaded from `.env` and excluded from version control.

- Swap approval updates appointment ownership within a database transaction.

- Google OAuth tokens are stored as JSONB for the prototype.

- Real patient, medical, or personally identifiable healthcare data must not be entered into the application.

Before production use, the platform would require additional controls including CSRF protection, rate limiting, security headers, comprehensive input validation, encrypted OAuth-token storage, audit logging, monitoring, and formal security testing.

## Automated Testing

The project includes 27 automated test cases across four test suites using Jest and Supertest.

| Test file | Scope | Cases |
| --- | --- | --- |
| `tests/auth.test.js` | Authentication middleware | 5 |
| `tests/triageUrgency.test.js` | Rule-based scheduling urgency | 14 |
| `tests/appointments.test.js` | Booking routes and swap-request ownership guard | 7 |
| `tests/admin.test.js` | Non-admin access to swap approval | 1 |
| **Total** | **Four test suites** | **27** |

Run all tests:

```bash
npm test
```

### Authentication Middleware

Five unit tests cover:

- Requests without a token

- Valid JWTs supplied through cookies

- Invalid tokens

- Expired tokens

- Valid JWTs supplied through the Authorization Bearer header

### Scheduling Urgency

Fourteen unit test cases cover:

- String `'false'` flags do not trigger the red-flag urgency rule

- Boolean `false` flags do not trigger the red-flag urgency rule

- Omitted red flags are handled without an error

- Each of the four red flags triggers `Urgent` when supplied as boolean `true` or string `'true'`

- Fever lasting less than one day returns `Urgent`

- Pain lasting one to three days returns `Soon`

- Red flags take priority over symptom rules that would otherwise return `Soon`

A regression test reproduced a bug where non-empty `'false'` strings were treated as active red flags. The helper now recognises only boolean `true` or string `'true'` as selected flags. Both the application route and tests import the helper from `src/utils/triageUrgency.js`.

These tests check the prototype's software rules, not the clinical validity of its scheduling categories.

### Appointment Routes

Seven tests use Supertest to send HTTP requests to the Express routes with real authentication middleware and mocked database, Google Calendar and email services.

Six booking tests cover:

- Guests are redirected to login without accessing the database or calling external services.

- Requests with invalid tokens are redirected to login without accessing the database or calling external services.

- Appointments unavailable at the initial lookup are rejected without an update or email call.

- Successful booking passes the authenticated user's ID to the update query, calls the email function and redirects to the success message.

- An empty result from the conditional booking update produces an unavailable message without calling the email function.

- A mocked Google Calendar conflict blocks booking before an update or email call.

One swap-request test checks that an empty ownership-filtered appointment lookup causes rejection without inserting a swap request or calling the email function. It also checks that the lookup includes the signed-in user's ID and the ownership condition.

### Admin Swap Approval

One route test supplies a valid JWT with the `user` role and checks that the approval endpoint redirects to login before connecting to the database, querying data, accessing notification files or calling the email function.

### Test Isolation and Scope

Tests that use JWTs temporarily set a test-only secret and restore the original environment value afterward. Route mocks are reset before each test. The admin test also mocks notification-file access.

The test suites do not require a running PostgreSQL database, Google Calendar credentials or SMTP configuration.

Mocked route tests verify application behaviour against controlled service responses and check selected query arguments. They do not execute SQL or verify PostgreSQL persistence, actual email delivery, live Calendar integration or concurrent database transactions.

The swap tests cover selected access controls only. Successful swap approval, ownership exchange, rollback, same-practice eligibility and rejection workflows are not yet covered by automated tests. Registration, login/logout routes, cancellation, browser interactions and remaining scheduling rules also require further testing. Passing these tests does not establish complete coverage or production readiness.

## Verification Checklist

Automated tests cover authentication middleware, selected scheduling urgency rules, six booking scenarios and two swap access-control scenarios with mocked services. The following checklist covers workflows and integrations that still require manual verification, including real database behaviour:

- Registration, login, logout, and role-based redirects

- Standard appointment search and rule-based recommendations

- Booking protection when two users attempt to reserve the same slot

- Appointment booking and cancellation

- Swap eligibility within the same practice

- Swap submission, approval, rejection, and transactional ownership exchange

- Notifications for both users affected by an approved swap

- Google OAuth connection, token refresh, conflict checking, and event creation

- Feedback availability only after an appointment has ended

- Keyboard navigation, responsive layouts, and high-contrast mode

## Limitations and Next Steps

- Swap eligibility is restricted to appointments at the same practice. GP specialisation is displayed for informed selection and administrator review rather than enforced automatically.

- The swap workflow uses administrator approval; a future version could add direct confirmation from the owner of the target appointment.

- In-app notifications are stored locally in JSON. A production implementation would use persistent database-backed notification and delivery records.

- Google Calendar events can be created, but their event IDs are not retained for subsequent update or deletion.

- SMS preferences are recorded, but SMS delivery is not currently implemented.

- Further development would include automated tests for cancellation and additional swap workflows, integration tests against an isolated PostgreSQL test database, concurrent booking checks, formal accessibility evaluation, encrypted OAuth-token storage, CSRF protection, rate limiting, audit logging, monitoring, and production deployment controls.

## Author

**Quynh Trang Nguyen**

- [Portfolio](https://my-portfolio-ivory-ten-46.vercel.app/)

- [LinkedIn](https://www.linkedin.com/in/quynh-trang-nguyen-21a559334/)
