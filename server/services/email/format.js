'use strict';

const CLIENT_URL = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');

const loginLink = (path) => `${CLIENT_URL}/login?next=${encodeURIComponent(path)}`;
const fullName = (u) => (u ? [u.firstName, u.lastName].filter(Boolean).join(' ').trim() : '') || 'שכן/ה';
const fmtDate = (d) => new Date(d).toLocaleDateString('he-IL', { day: 'numeric', month: 'long', year: 'numeric' });
const fmtMoney = (n) => `₪${Number(n || 0).toLocaleString('he-IL', { maximumFractionDigits: 2 })}`;
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const stripHtml = (html) => String(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

module.exports = { CLIENT_URL, loginLink, fullName, fmtDate, fmtMoney, esc, stripHtml };
