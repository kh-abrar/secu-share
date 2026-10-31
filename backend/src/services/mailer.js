const nodemailer = require('nodemailer');
const config = require('../config');
const logger = require('../lib/logger');

const transporter = config.smtpConfigured
  ? nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASS } : undefined,
    })
  : null;

async function verifyMailer() {
  if (!transporter) {
    logger.warn(
      config.isProduction
        ? 'SMTP is not configured (SMTP_HOST, MAIL_FROM): verification emails cannot be sent'
        : 'SMTP is not configured: verification links will be logged instead of emailed'
    );
    return;
  }
  try {
    await transporter.verify();
  } catch (err) {
    logger.warn({ err }, 'SMTP connection check failed');
  }
}

async function sendMail({ to, subject, text, html }) {
  if (!transporter) {
    // Mail bodies contain tokens: only print them outside production
    if (!config.isProduction) logger.info(`[mail to ${to}] ${subject}\n${text}`);
    return;
  }
  await transporter.sendMail({ from: config.MAIL_FROM, to, subject, text, html });
}

const escapeHtml = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function sendVerificationEmail(to, name, verifyUrl) {
  await sendMail({
    to,
    subject: 'Verify your SecuShare email address',
    text: `Hi ${name},\n\nConfirm your email address to start receiving shared files:\n\n${verifyUrl}\n\nThis link expires in 24 hours. If you didn't create a SecuShare account, you can ignore this email.`,
    html: `<p>Hi ${escapeHtml(name)},</p>
<p>Confirm your email address to start receiving shared files:</p>
<p><a href="${escapeHtml(verifyUrl)}">Verify my email</a></p>
<p>This link expires in 24 hours. If you didn't create a SecuShare account, you can ignore this email.</p>`,
  });
}

module.exports = { verifyMailer, sendVerificationEmail };
