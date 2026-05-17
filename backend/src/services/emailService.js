const nodemailer = require("nodemailer");
const env = require("../config/env");

let transporter = null;

const isConfigured = () => Boolean(env.smtpHost && env.smtpUser && env.smtpPass);

const getTransporter = () => {
  if (!isConfigured()) {
    throw new Error("SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in backend/.env");
  }
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.smtpHost,
      port: env.smtpPort,
      secure: env.smtpSecure,
      auth: {
        user: env.smtpUser,
        pass: env.smtpPass,
      },
    });
  }
  return transporter;
};

const fromAddress = () => env.smtpFrom || `"${env.schoolName}" <${env.smtpUser}>`;

const sendMail = async ({ to, subject, text, html }) => {
  if (!isConfigured()) {
    console.warn("Email skipped (SMTP not configured):", subject, "→", to);
    return { skipped: true };
  }

  const info = await getTransporter().sendMail({
    from: fromAddress(),
    to,
    subject,
    text,
    html: html || `<p>${text.replace(/\n/g, "<br>")}</p>`,
  });

  return info;
};

const sendPasswordResetOtpEmail = async ({ to, fullName, otp, expiresMinutes }) => {
  const subject = `${env.schoolName} — password reset code`;
  const text = [
    `Hello ${fullName || "there"},`,
    "",
    `Your password reset verification code is: ${otp}`,
    "",
    `This code expires in ${expiresMinutes} minutes.`,
    "If you did not request a reset, you can ignore this email.",
    "",
    env.schoolName,
  ].join("\n");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:520px">
      <h2 style="margin:0 0 12px">${env.schoolName}</h2>
      <p>Hello ${fullName || "there"},</p>
      <p>Use this verification code to reset your password:</p>
      <p style="font-size:28px;font-weight:700;letter-spacing:6px;margin:16px 0">${otp}</p>
      <p style="color:#64748b;font-size:14px">Expires in ${expiresMinutes} minutes.</p>
      <p style="color:#64748b;font-size:14px">If you did not request this, ignore this email.</p>
    </div>
  `;

  return sendMail({ to, subject, text, html });
};

const sendAlertForwardedEmail = async ({
  to,
  parentName,
  studentName,
  alertTitle,
  alertMessage,
  teacherNote,
  alertsUrl,
}) => {
  const subject = `${env.schoolName} — update about ${studentName}`;
  const bodyLines = [
    `Hello ${parentName || "Parent"},`,
    "",
    `A teacher shared a school alert regarding ${studentName}.`,
    "",
    `Title: ${alertTitle}`,
    alertMessage,
  ];
  if (teacherNote) {
    bodyLines.push("", `Teacher note: ${teacherNote}`);
  }
  bodyLines.push("", `View details in your account: ${alertsUrl}`, "", env.schoolName);
  const text = bodyLines.join("\n");

  const html = `
    <div style="font-family:Inter,Arial,sans-serif;line-height:1.6;color:#0f172a;max-width:560px">
      <h2 style="margin:0 0 12px">${env.schoolName}</h2>
      <p>Hello ${parentName || "Parent"},</p>
      <p>A teacher shared an alert regarding <strong>${studentName}</strong>.</p>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
        <p style="margin:0 0 8px;font-weight:600">${alertTitle}</p>
        <p style="margin:0;white-space:pre-wrap">${alertMessage}</p>
        ${teacherNote ? `<p style="margin:12px 0 0"><strong>Teacher note:</strong> ${teacherNote}</p>` : ""}
      </div>
      <p><a href="${alertsUrl}" style="color:#4f46e5">Open your alerts dashboard</a></p>
    </div>
  `;

  return sendMail({ to, subject, text, html });
};

module.exports = {
  isConfigured,
  sendMail,
  sendPasswordResetOtpEmail,
  sendAlertForwardedEmail,
};
