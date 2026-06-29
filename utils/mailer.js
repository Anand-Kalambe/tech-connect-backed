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
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // Required for port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    connectionTimeout: 30000,
    greetingTimeout: 30000,
    socketTimeout: 30000,
    tls: {
      servername: "smtp.gmail.com",
    },
  });

  // Verify SMTP connection
  try {
    await transporter.verify();
    console.log("✅ SMTP Server Connected");
  } catch (err) {
    console.error("❌ SMTP Verify Failed:", err);
    throw err;
  }

  const mailOptions = {
    from: `"Tech Connect" <${process.env.SMTP_USER}>`,
    to,
    subject: "🔐 Your Tech Connect Verification Code",
    html: `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
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
<h1 style="color:white;margin:0;">💼 Tech Connect</h1>
<p style="color:#dbeafe;margin-top:8px;">Earn. Grow. Succeed.</p>
</td>
</tr>

<tr>
<td style="padding:35px;">

<h2>Hello ${displayName},</h2>

<p>
Your verification code is shown below.
This OTP is valid for <strong>10 minutes</strong>.
</p>

<div style="
margin:30px 0;
padding:20px;
text-align:center;
border:2px solid #2563eb;
border-radius:12px;
background:#eff6ff;
">

<div style="
font-size:42px;
font-weight:bold;
letter-spacing:12px;
color:#2563eb;
font-family:monospace;
">
${otp}
</div>

</div>

<p>
Never share this OTP with anyone.
Tech Connect will never ask for your OTP.
</p>

</td>
</tr>

<tr>
<td style="padding:20px;text-align:center;color:#94a3b8;font-size:12px;">
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

    console.log("✅ Email Sent Successfully");
    console.log("Message ID:", info.messageId);

    return info;
  } catch (error) {
    console.error("❌ Failed to send email");
    console.error(error);
    throw error;
  }
}

module.exports = {
  sendOTPEmail,
};