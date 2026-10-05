const jwt = require('jsonwebtoken');
const auth = require('../src/middleware/auth');

describe('Authentication middleware', () => {
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

  function createRequest(token) {
    return {
      cookies: token ? { token } : {},
      header: jest.fn(() => undefined),
    };
  }

  test('continues as a guest when no token is provided', () => {
    const req = createRequest();
    const next = jest.fn();

    auth(req, {}, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('identifies the user when the token is valid', () => {
    const token = jwt.sign(
      { id: 123, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    const req = createRequest(token);
    const next = jest.fn();

    auth(req, {}, next);

    expect(req.user).toMatchObject({ id: 123, role: 'user' });
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('continues as a guest when the token is invalid', () => {
    const req = createRequest('invalid-token');
    const next = jest.fn();

    auth(req, {}, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('continues as a guest when the token has expired', () => {
    const token = jwt.sign(
      { id: 123, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: -1 }
    );
    const req = createRequest(token);
    const next = jest.fn();

    auth(req, {}, next);

    expect(req.user).toBeNull();
    expect(next).toHaveBeenCalledTimes(1);
  });

  test('identifies the user from a valid Bearer token', () => {
    const token = jwt.sign(
      { id: 123, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    const req = {
      cookies: {},
      header: jest.fn(name =>
        name === 'Authorization' ? `Bearer ${token}` : undefined
      ),
    };
    const next = jest.fn();

    auth(req, {}, next);

    expect(req.user).toMatchObject({ id: 123, role: 'user' });
    expect(next).toHaveBeenCalledTimes(1);
  });
});