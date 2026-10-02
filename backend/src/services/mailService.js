// Sends email with Nodemailer.
// - If SMTP_HOST is set in .env, real SMTP is used.
// - Otherwise (development) emails are not sent; they are printed to the console.
const nodemailer = require('nodemailer');

const smtpConfigured = Boolean(process.env.SMTP_HOST);

const transporter = smtpConfigured
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : nodemailer.createTransport({ jsonTransport: true }); // builds the message but doesn't send it

const from = process.env.MAIL_FROM || 'Service Desk <service@example.com>';

async function sendMail({ to, cc, subject, text }) {
  const info = await transporter.sendMail({ from, to, cc, subject, text });
  if (!smtpConfigured && process.env.NODE_ENV !== 'test') {
    console.log(`[mail:dev] to=${to}${cc ? ` cc=${cc}` : ''} subject="${subject}"\n${text}\n`);
  }
  return info;
}

module.exports = { sendMail };
