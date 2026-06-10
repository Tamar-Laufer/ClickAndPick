'use strict';

/** Shared fixtures + token factories for the integration tests. */
const jwt = require('jsonwebtoken');
const { User, Item, Category } = require('../models');

let seq = 0;
const uniqueEmail = () => `user${Date.now()}_${seq++}@example.com`;

/** Persist a USER (or any overrides) with a hashed password. */
async function createUser(overrides = {}) {
  const password = overrides.password || 'secret123';
  const doc = {
    firstName: 'Test',
    lastName: 'User',
    email: uniqueEmail(),
    phone: '050-1234567',
    ...overrides,
  };
  delete doc.password;
  const user = new User(doc);
  await user.setPassword(password);
  await user.save();
  user._plainPassword = password; // convenience for login tests
  return user;
}

/** Persist an ADMIN. */
const createAdmin = (overrides = {}) => createUser({ role: 'ADMIN', ...overrides });

/** A valid signed JWT for a user (matches the shape verifyToken expects). */
function tokenFor(user, opts = {}) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: opts.expiresIn || '7d' },
  );
}

/** A JWT that is already expired — verifyToken should reject it with 403. */
const expiredTokenFor = (user) => tokenFor(user, { expiresIn: '-10s' });

/** Seed a Category so itemsService.assertExists() passes for that value. */
const seedCategory = (value = 'tools', label = 'כלים') =>
  Category.create({ value, label, color: 'coral' });

/** Persist an Item directly (bypasses the category-existence service check). */
const createItem = (owner, overrides = {}) =>
  Item.create({
    owner: owner.id,
    title: 'Power Drill',
    description: 'A cordless power drill',
    category: 'tools',
    dailyRate: 100,
    imageUrl: '',
    ...overrides,
  });

module.exports = {
  createUser,
  createAdmin,
  tokenFor,
  expiredTokenFor,
  seedCategory,
  createItem,
};
