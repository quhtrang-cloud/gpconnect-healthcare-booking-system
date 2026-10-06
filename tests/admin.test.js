jest.mock('../src/config/db', () => ({
  query: jest.fn(),
  connect: jest.fn(),
}));

jest.mock('../src/utils/sendEmail', () => ({
  sendEmail: jest.fn(),
}));

jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
  },
}));

const express = require('express');
const cookieParser = require('cookie-parser');
const request = require('supertest');
const jwt = require('jsonwebtoken');

const pool = require('../src/config/db');
const { sendEmail } = require('../src/utils/sendEmail');
const fs = require('fs').promises;
const adminRoutes = require('../src/routes/admin');

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use('/api/admin', adminRoutes);

describe('Admin swap approval', () => {
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

  test('blocks a non-admin user from approving a swap without accessing the database', async () => {
    const token = jwt.sign(
      { id: 123, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const response = await request(app)
      .post('/api/admin/approve-swap')
      .set('Cookie', `token=${token}`)
      .send({ request_id: 1 });

    expect(response.status).toBe(302);
    expect(response.headers.location).toBe('/login');

    expect(pool.connect).not.toHaveBeenCalled();
    expect(pool.query).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();

    expect(fs.access).not.toHaveBeenCalled();
    expect(fs.readFile).not.toHaveBeenCalled();
    expect(fs.writeFile).not.toHaveBeenCalled();
  });
});