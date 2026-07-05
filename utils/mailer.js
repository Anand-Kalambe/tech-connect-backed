const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendOTPEmail(to, otp, name = "") {
  const displayName = name || to.split("@")[0];

  try {
    await transporter.verify();
    console.log("✅ SMTP Connected");

    const info = await transporter.sendMail({
      from: `"Tech Connect" <${process.env.FROM_EMAIL}>`,
      to,
      subject: "🔐 Your Tech Connect Verification Code",
      html: `
<!DOCTYPE html>
<html>
<body style="font-family:Arial;background:#0a0e1a;padding:40px;">
<div style="max-width:520px;margin:auto;background:white;border-radius:10px;padding:30px;">
<h2>Tech Connect</h2>

<p>Hello <b>${displayName}</b>,</p>

<p>Your OTP is:</p>

<h1 style="letter-spacing:10px;color:#2563eb;">
${otp}
</h1>

<p>This OTP is valid for 10 minutes.</p>

<p>Please do not share this code.</p>

</div>
</body>
</html>
`,
    });

    console.log(info.messageId);

    return info;
  } catch (err) {
    console.error(err);
    throw err;
  }
}

module.exports = {
  sendOTPEmail,
};