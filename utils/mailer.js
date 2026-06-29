const nodemailer = require("nodemailer");

/**
 * Send OTP Email
 * @param {string} to
 * @param {string} otp
 * @param {string} name
 */
async function sendOTPEmail(to, otp, name = "") {
  const displayName = name || to.split("@")[0];

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.SMTP_USER, // or EMAIL_USER if that's what you're using
      pass: process.env.SMTP_PASS, // or EMAIL_PASS
    },
  });

  const mailOptions = {
    from: `"Tech Connect" <${process.env.SMTP_USER}>`,
    to,
    subject: "🔐 Your Tech Connect Verification Code",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>OTP Verification</title>
</head>

<body style="margin:0;padding:0;background:#0a0e1a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px;background:#0a0e1a;">
<tr>
<td align="center">

<table width="520" cellpadding="0" cellspacing="0"
style="background:#0f172a;border-radius:16px;overflow:hidden;">

<tr>
<td style="background:#2563eb;padding:30px;text-align:center;">
<h1 style="margin:0;color:white;">💼 Tech Connect</h1>
<p style="margin-top:8px;color:#dbeafe;">Earn. Grow. Succeed.</p>
</td>
</tr>

<tr>
<td style="padding:35px;">

<p>Hello <strong>${displayName}</strong>,</p>

<p>Your verification code is:</p>

<div style="margin:30px 0;padding:20px;border:2px solid #2563eb;border-radius:12px;text-align:center;background:#eff6ff;">
<div style="font-size:42px;font-weight:bold;letter-spacing:10px;color:#2563eb;font-family:monospace;">
${otp}
</div>
</div>

<p>This OTP is valid for <strong>10 minutes</strong>.</p>

<p>Never share this OTP with anyone.</p>

</td>
</tr>

<tr>
<td style="padding:20px;text-align:center;font-size:12px;color:#94a3b8;">
© ${new Date().getFullYear()} Tech Connect
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
    const info = await transporter.sendMail(mailOptions);

    console.log("✅ Email sent successfully");
    console.log(info.response);

    return info;
  } catch (err) {
    console.error("❌ Email sending failed");
    console.error(err);
    throw err;
  }
}

module.exports = {
  sendOTPEmail,
};