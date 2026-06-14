'use strict';

jest.mock('../services/emailService', () => ({
  sendPasswordReset: jest.fn().mockResolvedValue(undefined),
  notifyNewBookingRequest: jest.fn(),
  notifyBookingCompleted: jest.fn(),
  notifyBookingStatusChange: jest.fn(),
}));

const request = require('supertest');
const app = require('../app');
const { createUser, tokenFor, expiredTokenFor } = require('./helpers');

const VALID_REGISTRATION = {
  firstName: 'Dana',
  lastName: 'Cohen',
  email: 'dana@example.com',
  password: 'secret123',
  phone: '050-1112222',
};

describe('POST /api/auth/register', () => {
  it('creates a user and returns a token, never leaking the password hash', async () => {
    const res = await request(app).post('/api/auth/register').send(VALID_REGISTRATION);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user).toMatchObject({
      firstName: 'Dana',
      email: 'dana@example.com',
      role: 'USER',
    });
    expect(res.body.user.passwordHash).toBeUndefined();
    expect(res.body.user.id).toEqual(expect.any(String));
  });

  it.each([
    ['first name too short', { ...VALID_REGISTRATION, firstName: 'A' }],
    ['invalid email', { ...VALID_REGISTRATION, email: 'not-an-email' }],
    ['password too short', { ...VALID_REGISTRATION, password: '123' }],
  ])('rejects %s with 400', async (_label, body) => {
    const res = await request(app).post('/api/auth/register').send(body);
    expect(res.status).toBe(400);
    expect(res.body.message).toEqual(expect.any(String));
  });

  it('rejects a duplicate email with 409', async () => {
    await request(app).post('/api/auth/register').send(VALID_REGISTRATION);
    const res = await request(app).post('/api/auth/register').send(VALID_REGISTRATION);
    expect(res.status).toBe(409);
  });

  it('ignores a client-supplied role and still creates a USER', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ ...VALID_REGISTRATION, role: 'ADMIN' });
    expect(res.status).toBe(201);
    expect(res.body.user.role).toBe('USER');
  });
});

describe('POST /api/auth/login', () => {
  it('logs in with correct credentials', async () => {
    const user = await createUser({ email: 'login@example.com', password: 'secret123' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe('login@example.com');
  });

  it('rejects a wrong password with 401', async () => {
    const user = await createUser({ password: 'secret123' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrong-password' });
    expect(res.status).toBe(401);
  });

  it('rejects an unknown email with 401', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'secret123' });
    expect(res.status).toBe(401);
  });

  it('rejects a disabled account with 403', async () => {
    const user = await createUser({ password: 'secret123', isActive: false });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'secret123' });
    expect(res.status).toBe(403);
  });

  it('rejects missing fields with 400', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'x@y.com' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me — JWT boundary cases', () => {
  it('returns the current user with a valid token', async () => {
    const user = await createUser();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenFor(user)}`);

    expect(res.status).toBe(200);
    expect(res.body.user.id).toBe(user.id);
  });

  it('rejects a missing token with 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed token with 403', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer not.a.real.token');
    expect(res.status).toBe(403);
  });

  it('rejects an expired token with 403', async () => {
    const user = await createUser();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredTokenFor(user)}`);
    expect(res.status).toBe(403);
  });
});

describe('PUT /api/auth/password', () => {
  it('changes the password when the current one is correct', async () => {
    const user = await createUser({ password: 'secret123' });
    const token = tokenFor(user);

    const change = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${token}`)
      .send({ currentPassword: 'secret123', newPassword: 'brandnew456' });
    expect(change.status).toBe(200);

    const oldLogin = await request(app)
      .post('/api/auth/login').send({ email: user.email, password: 'secret123' });
    expect(oldLogin.status).toBe(401);

    const newLogin = await request(app)
      .post('/api/auth/login').send({ email: user.email, password: 'brandnew456' });
    expect(newLogin.status).toBe(200);
  });

  it('rejects a wrong current password with 400', async () => {
    const user = await createUser({ password: 'secret123' });
    const res = await request(app)
      .put('/api/auth/password')
      .set('Authorization', `Bearer ${tokenFor(user)}`)
      .send({ currentPassword: 'WRONG', newPassword: 'brandnew456' });
    expect(res.status).toBe(400);
  });
});
