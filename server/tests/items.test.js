'use strict';

const request = require('supertest');
const app = require('../app');
const { Booking } = require('../../database/models');
const {
  createUser, createAdmin, tokenFor, seedCategory, createItem,
} = require('./helpers');

describe('GET /api/items (public catalog)', () => {
  it('returns active, non-deleted items in the { items, pagination } shape', async () => {
    const owner = await createUser();
    await createItem(owner, { title: 'Visible drill' });
    await createItem(owner, { title: 'Hidden drill', isActive: false });
    await createItem(owner, { title: 'Deleted drill', isDeleted: true });

    const res = await request(app).get('/api/items');

    expect(res.status).toBe(200);
    expect(res.body.pagination).toMatchObject({ totalItems: 1, currentPage: 1 });
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe('Visible drill');
    // privacy: raw pickup coordinates must never be exposed
    expect(res.body.items[0].location).toBeUndefined();
  });

  it('filters by category', async () => {
    const owner = await createUser();
    await createItem(owner, { title: 'Item A', category: 'tools' });
    await createItem(owner, { title: 'Item B', category: 'camping' });

    const res = await request(app).get('/api/items').query({ category: 'camping' });
    expect(res.status).toBe(200);
    expect(res.body.items.map((i) => i.title)).toEqual(['Item B']);
  });
});

describe('POST /api/items (auth + validation)', () => {
  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(app).post('/api/items').send({ title: 'x' });
    expect(res.status).toBe(401);
  });

  it('creates an item for a logged-in owner', async () => {
    const owner = await createUser();
    await seedCategory('tools');

    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ title: 'New Drill', description: 'cordless', category: 'tools', dailyRate: 80 });

    expect(res.status).toBe(201);
    expect(res.body.item).toMatchObject({ title: 'New Drill', dailyRate: 80, owner: owner.id });
  });

  it('rejects an unknown category with 400', async () => {
    const owner = await createUser();
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ title: 'New Drill', category: 'does-not-exist', dailyRate: 80 });
    expect(res.status).toBe(400);
  });

  it('rejects a missing required field (title) with 400 via the Mongoose handler', async () => {
    const owner = await createUser();
    await seedCategory('tools');
    const res = await request(app)
      .post('/api/items')
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ category: 'tools', dailyRate: 80 });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/items/:id', () => {
  it('returns an existing item', async () => {
    const owner = await createUser();
    const item = await createItem(owner);
    const res = await request(app).get(`/api/items/${item.id}`);
    expect(res.status).toBe(200);
    expect(res.body.item.id).toBe(item.id);
  });

  it('returns 404 for a well-formed but unknown id', async () => {
    const res = await request(app).get('/api/items/5f9f1b9b9b9b9b9b9b9b9b9b');
    expect(res.status).toBe(404);
  });

  it('returns 400 (CastError) for a malformed id', async () => {
    const res = await request(app).get('/api/items/not-an-objectid');
    expect(res.status).toBe(400);
  });

  it('treats a soft-deleted item as 404', async () => {
    const owner = await createUser();
    const item = await createItem(owner, { isDeleted: true });
    const res = await request(app).get(`/api/items/${item.id}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /api/items/:id (ownership enforcement)', () => {
  it('lets the owner update their item', async () => {
    const owner = await createUser();
    await seedCategory('tools');
    const item = await createItem(owner);

    const res = await request(app)
      .patch(`/api/items/${item.id}`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`)
      .send({ title: 'Renamed Drill' });
    expect(res.status).toBe(200);
    expect(res.body.item.title).toBe('Renamed Drill');
  });

  it('forbids a different user from updating it (403)', async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const item = await createItem(owner);

    const res = await request(app)
      .patch(`/api/items/${item.id}`)
      .set('Authorization', `Bearer ${tokenFor(stranger)}`)
      .send({ title: 'Hijacked' });
    expect(res.status).toBe(403);
  });

  it('lets an ADMIN update any item (200)', async () => {
    const owner = await createUser();
    const admin = await createAdmin();
    await seedCategory('tools');
    const item = await createItem(owner);

    const res = await request(app)
      .patch(`/api/items/${item.id}`)
      .set('Authorization', `Bearer ${tokenFor(admin)}`)
      .send({ title: 'Moderated' });
    expect(res.status).toBe(200);
  });
});

describe('DELETE /api/items/:id (soft delete + guards)', () => {
  it('soft-deletes the owner’s item', async () => {
    const owner = await createUser();
    const item = await createItem(owner);

    const res = await request(app)
      .delete(`/api/items/${item.id}`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`);
    expect(res.status).toBe(200);

    // it disappears from the public catalog
    const list = await request(app).get('/api/items');
    expect(list.body.items).toHaveLength(0);
  });

  it('refuses deletion while an active booking exists (400)', async () => {
    const owner = await createUser();
    const renter = await createUser();
    const item = await createItem(owner);
    await Booking.create({
      item: item.id, renter: renter.id,
      startDate: new Date('2030-01-01'), endDate: new Date('2030-01-03'),
      totalPrice: 200, platformFee: 20, ownerEarnings: 180, status: 'APPROVED',
    });

    const res = await request(app)
      .delete(`/api/items/${item.id}`)
      .set('Authorization', `Bearer ${tokenFor(owner)}`);
    expect(res.status).toBe(400);
  });

  it('forbids a non-owner from deleting (403)', async () => {
    const owner = await createUser();
    const stranger = await createUser();
    const item = await createItem(owner);
    const res = await request(app)
      .delete(`/api/items/${item.id}`)
      .set('Authorization', `Bearer ${tokenFor(stranger)}`);
    expect(res.status).toBe(403);
  });
});

describe('GET /api/items/mine', () => {
  it('returns only the authenticated owner’s non-deleted items', async () => {
    const owner = await createUser();
    const other = await createUser();
    await createItem(owner, { title: 'Mine 1' });
    await createItem(owner, { title: 'Mine 2', isDeleted: true });
    await createItem(other, { title: 'Theirs' });

    const res = await request(app)
      .get('/api/items/mine')
      .set('Authorization', `Bearer ${tokenFor(owner)}`);
    expect(res.status).toBe(200);
    expect(res.body.items.map((i) => i.title)).toEqual(['Mine 1']);
  });

  it('requires authentication (401)', async () => {
    const res = await request(app).get('/api/items/mine');
    expect(res.status).toBe(401);
  });
});
