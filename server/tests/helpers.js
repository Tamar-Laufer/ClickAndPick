'use strict';

const jwt = require('jsonwebtoken');
const { User, Item, Category } = require('../../database/models');

let seq = 0;
const uniqueEmail = () => `user${Date.now()}_${seq++}@example.com`;

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
  user._plainPassword = password;
  return user;
}

const createAdmin = (overrides = {}) => createUser({ role: 'ADMIN', ...overrides });

function tokenFor(user, opts = {}) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: opts.expiresIn || '7d' },
  );
}

const expiredTokenFor = (user) => tokenFor(user, { expiresIn: '-10s' });

const seedCategory = (value = 'tools', label = 'כלים') =>
  Category.create({ value, label, color: 'coral' });

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
