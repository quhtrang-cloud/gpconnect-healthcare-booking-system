jest.mock('../src/config/db', () => ({
  query: jest.fn(),
}));

jest.mock('../src/utils/googleCalendar', () => ({
  checkGoogleConflicts: jest.fn(),
}));

jest.mock('../src/utils/sendEmail', () => ({
  sendEmail: jest.fn(),
}));

const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const pool = require('../src/config/db');
const { checkGoogleConflicts } = require('../src/utils/googleCalendar');
const { sendEmail } = require('../src/utils/sendEmail');
const appointmentRoutes = require('../src/routes/appointments');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use('/api/appointments', appointmentRoutes);

function createUserToken() {
  return jwt.sign(
    { id: 123, role: 'user' },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
}

function createAppointment() {
  return {
    id: 1,
    gp_name: 'Test GP',
    city: 'Portsmouth',
    practice_name: 'Test Practice',
    start_time: '2030-01-15T10:00:00Z',
    end_time: '2030-01-15T10:15:00Z',
  };
}

describe('Appointment routes', () => {
  const originalSecret = process.env.JWT_SECRET;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-only-secret-not-for-production';
  });

  afterAll(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_SECRET;
    } else {
      process.env.JWT_SECRET = originalSecret;
    }
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('Booking', () => {
    test('redirects guests to login without accessing the database', async () => {
      const response = await request(app)
        .post('/api/appointments/book')
        .send({ appointment_id: 1 });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/login');

      expect(pool.query).not.toHaveBeenCalled();
      expect(checkGoogleConflicts).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    test('redirects users with an invalid token without accessing the database', async () => {
      const response = await request(app)
        .post('/api/appointments/book')
        .set('Cookie', 'token=invalid-token')
        .send({ appointment_id: 1 });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe('/login');

      expect(pool.query).not.toHaveBeenCalled();
      expect(checkGoogleConflicts).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    test('rejects an unavailable appointment without updating it or sending email', async () => {
      const token = createUserToken();

      pool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/appointments/book')
        .set('Cookie', `token=${token}`)
        .send({ appointment_id: 1 });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        '/success?message=Appointment%20already%20booked%20or%20invalid'
      );

      expect(pool.query).toHaveBeenCalledTimes(1);
      expect(pool.query).toHaveBeenCalledWith(
        expect.stringContaining(
          'WHERE a.id = $1 AND a.is_booked = false'
        ),
        [1]
      );

      expect(checkGoogleConflicts).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    test('books an available appointment for the authenticated user', async () => {
      const token = createUserToken();
      const appointment = createAppointment();

      pool.query
        .mockResolvedValueOnce({ rows: [appointment] })
        .mockResolvedValueOnce({
          rows: [{ google_tokens: null }],
        })
        .mockResolvedValueOnce({
          rows: [
            {
              ...appointment,
              is_booked: true,
              user_id: 123,
            },
          ],
        });

      sendEmail.mockResolvedValueOnce(true);

      const response = await request(app)
        .post('/api/appointments/book')
        .set('Cookie', `token=${token}`)
        .send({ appointment_id: 1 });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        '/success?message=Appointment%20booked%20successfully'
      );

      expect(pool.query).toHaveBeenCalledTimes(3);
      expect(pool.query).toHaveBeenNthCalledWith(
        2,
        'SELECT google_tokens FROM users WHERE id = $1',
        [123]
      );
      expect(pool.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining(
          'UPDATE appointments SET is_booked = true, user_id = $1'
        ),
        [123, 1]
      );

      expect(checkGoogleConflicts).not.toHaveBeenCalled();

      expect(sendEmail).toHaveBeenCalledTimes(1);
      expect(sendEmail).toHaveBeenCalledWith(
        123,
        'Appointment Booked',
        'appointment booking',
        expect.objectContaining({
          appointment_id: 1,
          gp_name: 'Test GP',
          city: 'Portsmouth',
          practice_name: 'Test Practice',
        })
      );
    });

    test('does not send email when the appointment becomes unavailable before update', async () => {
      const token = createUserToken();
      const appointment = createAppointment();

      pool.query
        .mockResolvedValueOnce({ rows: [appointment] })
        .mockResolvedValueOnce({
          rows: [{ google_tokens: null }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/appointments/book')
        .set('Cookie', `token=${token}`)
        .send({ appointment_id: 1 });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        '/success?message=Appointment%20already%20booked'
      );

      expect(pool.query).toHaveBeenCalledTimes(3);
      expect(pool.query).toHaveBeenNthCalledWith(
        3,
        expect.stringContaining(
          'WHERE id = $2 AND is_booked = false RETURNING'
        ),
        [123, 1]
      );

      expect(checkGoogleConflicts).not.toHaveBeenCalled();
      expect(sendEmail).not.toHaveBeenCalled();
    });

    test('rejects a calendar conflict without updating the appointment or sending email', async () => {
      const token = createUserToken();
      const appointment = createAppointment();

      const googleTokens = {
        access_token: 'test-only-access-token',
      };

      pool.query
        .mockResolvedValueOnce({ rows: [appointment] })
        .mockResolvedValueOnce({
          rows: [{ google_tokens: googleTokens }],
        });

      checkGoogleConflicts.mockResolvedValueOnce([
        {
          id: 'test-event',
          summary: 'Existing calendar event',
        },
      ]);

      const response = await request(app)
        .post('/api/appointments/book')
        .set('Cookie', `token=${token}`)
        .send({ appointment_id: 1 });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        '/success?message=Cannot%20book:%20Conflicts%20with%20existing%20calendar%20events'
      );

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(pool.query).toHaveBeenNthCalledWith(
        2,
        'SELECT google_tokens FROM users WHERE id = $1',
        [123]
      );
      expect(pool.query).not.toHaveBeenCalledWith(
        expect.stringContaining('UPDATE appointments'),
        expect.anything()
      );

      expect(checkGoogleConflicts).toHaveBeenCalledTimes(1);
      expect(checkGoogleConflicts).toHaveBeenCalledWith(
        googleTokens,
        appointment.start_time,
        appointment.end_time
      );

      expect(sendEmail).not.toHaveBeenCalled();
    });
  });

  describe('Swap requests', () => {
    test('rejects a swap request when the current appointment is not owned by the user', async () => {
      const token = createUserToken();

      pool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [
            {
              id: 2,
              user_id: 456,
              is_booked: true,
              practice_id: 10,
            },
          ],
        });

      const response = await request(app)
        .post('/api/appointments/swap')
        .set('Cookie', `token=${token}`)
        .send({
          my_appointment_id: 1,
          target_appointment_id: 2,
        });

      expect(response.status).toBe(302);
      expect(response.headers.location).toBe(
        '/success?message=Invalid%20appointments'
      );

      expect(pool.query).toHaveBeenCalledTimes(2);
      expect(pool.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining(
          'WHERE a.id = $1 AND a.user_id = $2'
        ),
        [1, 123]
      );

      expect(pool.query).not.toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO swap_requests'),
        expect.anything()
      );

      expect(sendEmail).not.toHaveBeenCalled();
    });
  });
});