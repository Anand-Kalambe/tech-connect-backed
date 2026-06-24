const nodemailer = require('nodemailer');

/**
 * Nodemailer transporter.
 * Explicitly using the SMTP host and port to prevent Render ETIMEDOUT errors.
 */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com', // Explicitly define the host
  port: 465,              // Use port 465 for secure connection
  secure: true,           // true for port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS, 
  },
});

/**
 * Send an OTP email to the given address.
 * @param {string} to     - Recipient email
 * @param {string} otp    - 6-digit OTP code
 * @param {string} name   - Recipient's name/username (optional)
 */
async function sendOTPEmail(to, otp, name = '') {
  const displayName = name || to.split('@')[0];

  const mailOptions = {
    from: `"Tech Connect" <${process.env.SMTP_USER}>`,
    to,
    subject: '🔐 Your Tech Connect Verification Code',
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>OTP Verification</title>
</head>
<body style="margin:0;padding:0;background:#0a0e1a;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0e1a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;background:#0f1422;border:1px solid rgba(37,99,235,0.25);border-radius:20px;overflow:hidden;">

          <tr>
            <td style="background:linear-gradient(135deg,#1d4ed8,#2563eb,#3b82f6);padding:32px;text-align:center;">
              <div style="font-size:40px;margin-bottom:8px;">💼</div>
              <h1 style="margin:0;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.03em;">Tech Connect</h1>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">Earn. Grow. Succeed.</p>
            </td>
          </tr>

          <tr>
            <td style="padding:32px 32px 24px;">
              <p style="margin:0 0 8px;font-size:15px;color:#94a3b8;">Hello, <strong style="color:#f0f4ff;">${displayName}</strong> 👋</p>
              <p style="margin:0 0 28px;font-size:14px;color:#64748b;line-height:1.6;">
                You requested a verification code to complete your Tech Connect registration.
                Use the code below — it's valid for <strong style="color:#f0f4ff;">10 minutes</strong>.
              </p>

              <div style="background:rgba(37,99,235,0.1);border:2px solid rgba(37,99,235,0.4);border-radius:16px;padding:28px;text-align:center;margin-bottom:28px;">
                <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:0.1em;color:#64748b;text-transform:uppercase;">Your Verification Code</p>
                <div style="font-size:44px;font-weight:900;letter-spacing:12px;color:#3b82f6;font-family:monospace;">${otp}</div>
                <p style="margin:10px 0 0;font-size:11px;color:#64748b;">Expires in 10 minutes</p>
              </div>

              <div style="background:rgba(245,158,11,0.08);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:14px 16px;">
                <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                  🔒 <strong style="color:#fbbf24;">Security tip:</strong> Never share this code with anyone.
                  Tech Connect will never ask for your OTP via phone or chat.
                </p>
              </div>
            </td>
          </tr>

          <tr>
            <td style="padding:16px 32px 28px;border-top:1px solid rgba(255,255,255,0.06);">
              <p style="margin:0;font-size:12px;color:#475569;text-align:center;">
                If you didn't request this, please ignore this email.<br/>
                &copy; ${new Date().getFullYear()} Tech Connect. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`OTP Email successfully sent to ${to}`);
  } catch (error) {
    console.error(`Failed to send OTP to ${to}:`, error);
    throw error; // Rethrow if you want your route handler to catch it and send a 500 status to the frontend
  }
}

module.exports = { sendOTPEmail };