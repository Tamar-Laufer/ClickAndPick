'use strict';

jest.mock('../services/emailService', () => ({
  notifyNewBookingRequest: jest.fn(),
  notifyBookingCompleted: jest.fn(),
  notifyBookingStatusChange: jest.fn(),
  sendPasswordReset: jest.fn(),
}));

const request = require('supertest');
const app = require('../app');
const { User, Booking } = require('../../database/models');
const {
  createUser, createAdmin, tokenFor, createItem,
} = require('./helpers');

const DATES = { startDate: '2030-01-01', endDate: '2030-01-03' };

async function arrangeRental(itemOverrides = {}) {
  const owner = await createUser();
  const renter = await createUser();
  const item = await createItem(owner, itemOverrides);
  return { owner, renter, item };
}

describe('Bookings auth gate', () => {
  it('rejects any booking route without a token (401)', async () => {
    const res = await request(app).post('/api/bookings').send({});
    expect(res.status).toBe(401);
  });
});

describe('POST /api/bookings (creation + money split)', () => {
  it('creates a PENDING booking and computes price + 10% fee server-side', async () => {
    const { renter, item } = await arrangeRental({ dailyRate: 100 });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(renter)}`)
      .send({ item: item.id, ...DATES });

    expect(res.status).toBe(201);
    expect(res.body.booking).toMatchObject({
      status: 'PENDING',
      totalPrice: 200,
      platformFee: 20,
      ownerEarnings: 180,
      renter: renter.id,
    });
    const { platformFee, ownerEarnings, totalPrice } = res.body.booking;
    expect(platformFee + ownerEarnings).toBe(totalPrice);
  });

  it('ignores any client-supplied price/fee and trusts the server calc', async () => {
    const { renter, item } = await arrangeRental({ dailyRate: 100 });
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(renter)}`)
      .send({ item: item.id, ...DATES, totalPrice: 1, platformFee: 0, ownerEarnings: 1 });
    expect(res.status).toBe(201);
    expect(res.body.booking.totalPrice).toBe(200);
  });

  it('rejects missing fields with 400', async () => {
    const { renter } = await arrangeRental();
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(renter)}`)
      .send({ startDate: DATES.startDate });
    expect(res.status).toBe(400);
  });

  it('rejects an end date that is not after the start (400)', async () => {
    const { renter, item } = await arrangeRental();
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(renter)}`)
      .send({ item: item.id, startDate: '2030-01-03', endDate: '2030-01-01' });
    expect(res.status).toBe(400);
  });

  it('forbids booking your own item (400)', async () => {
    const owner = await createUser();
    const item = await createItem(owner);
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ item: item.id, ...DATES });
    expect(res.status).toBe(400);
  });

  it('returns 404 for an inactive/unknown item', async () => {
    const { renter, item } = await arrangeRental({ isActive: false });
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(renter)}`)
      .send({ item: item.id, ...DATES });
    expect(res.status).toBe(404);
  });

  it('rejects an overlapping booking with 409', async () => {
    const { renter, item } = await arrangeRental();
    const other = await createUser();
    await Booking.create({
      item: item.id, renter: other.id,
      startDate: new Date('2030-01-01'), endDate: new Date('2030-01-03'),
      totalPrice: 200, platformFee: 20, ownerEarnings: 180, status: 'PENDING',
    });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenFor(renter)}`)
      .send({ item: item.id, startDate: '2030-01-02', endDate: '2030-01-04' });
    expect(res.status).toBe(409);
  });
});

describe('PATCH /api/bookings/:id/status (role-based transitions)', () => {
  async function pendingBooking(renter, item) {
    return Booking.create({
      item: item.id, renter: renter.id,
      startDate: new Date('2030-01-01'), endDate: new Date('2030-01-03'),
      totalPrice: 200, platformFee: 20, ownerEarnings: 180, status: 'PENDING',
    });
  }

  it('lets the owner APPROVE a pending request', async () => {
    const { owner, renter, item } = await arrangeRental();
    const booking = await pendingBooking(renter, item);

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ status: 'APPROVED' });
    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('APPROVED');
  });

  it('forbids the renter from APPROVING their own booking (403)', async () => {
    const { renter, item } = await arrangeRental();
    const booking = await pendingBooking(renter, item);

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${tokenFor(renter)}`)
      .send({ status: 'APPROVED' });
    expect(res.status).toBe(403);
  });

  it('lets the renter CANCEL their own booking', async () => {
    const { renter, item } = await arrangeRental();
    const booking = await pendingBooking(renter, item);

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${tokenFor(renter)}`)
      .send({ status: 'CANCELLED' });
    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('CANCELLED');
  });

  it('forbids a non-participant from touching the booking (403)', async () => {
    const { renter, item } = await arrangeRental();
    const stranger = await createUser();
    const booking = await pendingBooking(renter, item);

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${tokenFor(stranger)}`)
      .send({ status: 'CANCELLED' });
    expect(res.status).toBe(403);
  });

  it('on COMPLETED, bumps the renter’s completed count and recomputes trust score', async () => {
    const { owner, renter, item } = await arrangeRental();
    const booking = await pendingBooking(renter, item);
    const admin = await createAdmin();

    const res = await request(app)
      .patch(`/api/bookings/${booking.id}/status`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ status: 'COMPLETED' });
    expect(res.status).toBe(200);

    const fresh = await User.findById(renter.id);
    expect(fresh.completedTransactions).toBe(1);
    expect(fresh.trustScore).toBe(12);
    expect(owner.id).toBeDefined();
  });
});

describe('GET /api/bookings/mine and /incoming', () => {
  it('separates the renter’s bookings from the owner’s incoming requests', async () => {
    const { owner, renter, item } = await arrangeRental();
    await Booking.create({
      item: item.id, renter: renter.id,
      startDate: new Date('2030-01-01'), endDate: new Date('2030-01-03'),
      totalPrice: 200, platformFee: 20, ownerEarnings: 180,
    });

    const mine = await request(app)
      .get('/api/bookings/mine')
      .set('Authorization', `Bearer ${tokenFor(renter)}`);
    expect(mine.status).toBe(200);
    expect(mine.body.bookings).toHaveLength(1);

    const incoming = await request(app)
      .get('/api/bookings/incoming')
      .set('Authorization', `Bearer ${tokenFor(owner)}`);
    expect(incoming.status).toBe(200);
    expect(incoming.body.bookings).toHaveLength(1);

    const renterIncoming = await request(app)
      .get('/api/bookings/incoming')
      .set('Authorization', `Bearer ${tokenFor(renter)}`);
    expect(renterIncoming.body.bookings).toHaveLength(0);
  });
});
