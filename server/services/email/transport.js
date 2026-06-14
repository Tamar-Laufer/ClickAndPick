'use strict';

const nodemailer = require('nodemailer');
const logger = require('../../utils/logger');
const { stripHtml } = require('./format');

const FROM = process.env.SMTP_FROM || 'Click&Pick <no-reply@clickandpick.app>';

let _transporter;
let _warned = false;
function getTransporter() {
  if (_transporter !== undefined) return _transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    if (!_warned) {
      logger.warn('SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS) — notification emails are disabled');
      _warned = true;
    }
    _transporter = null;
    return null;
  }
  _transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: SMTP_SECURE === 'true' || Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  return _transporter;
}

async function sendMail({ to, subject, html, text }) {
  if (!to) {
    logger.warn(`Email skipped ("${subject}"): missing recipient`);
    return false;
  }
  const tx = getTransporter();
  if (!tx) return false;
  try {
    const info = await tx.sendMail({ from: FROM, to, subject, html, text: text || stripHtml(html) });
    logger.info(`Email sent: "${subject}" → ${to} (${info.messageId})`);
    return true;
  } catch (err) {
    logger.error(`Email failed: "${subject}" → ${to}: ${err.message}`);
    return false;
  }
}

module.exports = { FROM, getTransporter, sendMail };
