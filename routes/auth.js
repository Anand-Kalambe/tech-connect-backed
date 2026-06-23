const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const User = require('../models/User');
const OTP = require('../models/OTP');
const authMiddleware = require('../middleware/auth');
const { sendOTPEmail } = require('../utils/mailer');

// ─── Helper: generate a random 6-digit OTP ───────────────────────────────────
function generateOTP() {
  // Cryptographically random 6-digit number
  return String(Math.floor(100000 + crypto.randomInt(900000)));
}

// ─── Rate-limit guard: max 3 send attempts per email per 10 min window ───────
const sendCooldown = new Map(); // email → timestamp
const COOLDOWN_MS = 60_000; // 1 minute between resends

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/send-otp
//   Body: { email, username, password }
//   1. Validates the fields
//   2. Checks email/username not already taken
//   3. Hashes password
//   4. Saves OTP + pending data to DB
//   5. Sends OTP email
// ─────────────────────────────────────────────────────────────────────────────
router.post('/send-otp', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // ── Basic validation ──────────────────────────────────────────────────────
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (username.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Cooldown check ────────────────────────────────────────────────────────
    const lastSent = sendCooldown.get(normalizedEmail);
    if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
      const wait = Math.ceil((COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
      return res.status(429).json({ message: `Please wait ${wait}s before requesting another OTP` });
    }

    // ── Check for duplicate email/username ────────────────────────────────────
    const existing = await User.findOne({
      $or: [{ email: normalizedEmail }, { username }],
    });
    if (existing) {
      if (existing.email === normalizedEmail) {
        return res.status(409).json({ message: 'Email is already registered' });
      }
      return res.status(409).json({ message: 'Username is already taken' });
    }

    // ── Hash password now (so we don't store plaintext in OTP doc) ────────────
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ── Generate OTP ──────────────────────────────────────────────────────────
    const otp = generateOTP();

    // ── Upsert OTP record (replace any previous pending OTP for this email) ───
    await OTP.findOneAndReplace(
      { email: normalizedEmail },
      {
        email: normalizedEmail,
        otp,
        pendingData: { username, hashedPassword },
        attempts: 0,
        createdAt: new Date(),
      },
      { upsert: true, new: true }
    );

    // ── Send email ────────────────────────────────────────────────────────────
    await sendOTPEmail(normalizedEmail, otp, username);

    // Record cooldown
    sendCooldown.set(normalizedEmail, Date.now());

    return res.status(200).json({
      message: `OTP sent to ${normalizedEmail}. Valid for 10 minutes.`,
    });
  } catch (err) {
    console.error('send-otp error:', err);
    res.status(500).json({ message: 'Failed to send OTP. Please try again.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/verify-otp
//   Body: { email, otp }
//   1. Looks up the OTP record
//   2. Validates OTP (max 5 attempts)
//   3. Creates the User in DB
//   4. Deletes the OTP record
//   5. Returns JWT + user object
// ─────────────────────────────────────────────────────────────────────────────
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const record = await OTP.findOne({ email: normalizedEmail });

    if (!record) {
      return res.status(400).json({
        message: 'OTP expired or not found. Please request a new one.',
      });
    }

    // ── Max attempts guard (5 tries) ──────────────────────────────────────────
    if (record.attempts >= 5) {
      await OTP.deleteOne({ _id: record._id });
      return res.status(400).json({
        message: 'Too many incorrect attempts. Please request a new OTP.',
      });
    }

    // ── Verify OTP ────────────────────────────────────────────────────────────
    if (record.otp !== otp.trim()) {
      await OTP.findByIdAndUpdate(record._id, { $inc: { attempts: 1 } });
      const remaining = 4 - record.attempts;
      return res.status(400).json({
        message: `Incorrect OTP. ${remaining} ${remaining === 1 ? 'attempt' : 'attempts'} remaining.`,
      });
    }

    // ── OTP correct — create the user ─────────────────────────────────────────
    const { username, hashedPassword } = record.pendingData;

    // Double-check uniqueness (race condition guard)
    const existing = await User.findOne({
      $or: [{ email: normalizedEmail }, { username }],
    });
    if (existing) {
      await OTP.deleteOne({ _id: record._id });
      return res.status(409).json({ message: 'Account already exists. Please log in.' });
    }

    const user = new User({ username, email: normalizedEmail, password: hashedPassword });
    await user.save();

    // Delete the OTP record
    await OTP.deleteOne({ _id: record._id });
    sendCooldown.delete(normalizedEmail);

    // Issue JWT
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('verify-otp error:', err);
    res.status(500).json({ message: 'Server error during verification.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/resend-otp
//   Body: { email }
//   Resends OTP (reuses existing pending data, regenerates OTP)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/resend-otp', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const normalizedEmail = email.toLowerCase().trim();

    // Cooldown
    const lastSent = sendCooldown.get(normalizedEmail);
    if (lastSent && Date.now() - lastSent < COOLDOWN_MS) {
      const wait = Math.ceil((COOLDOWN_MS - (Date.now() - lastSent)) / 1000);
      return res.status(429).json({ message: `Please wait ${wait}s before resending` });
    }

    const record = await OTP.findOne({ email: normalizedEmail });
    if (!record) {
      return res.status(400).json({
        message: 'No pending registration found. Please start signup again.',
      });
    }

    const newOTP = generateOTP();
    record.otp = newOTP;
    record.attempts = 0;
    record.createdAt = new Date();
    await record.save();

    await sendOTPEmail(normalizedEmail, newOTP, record.pendingData?.username);
    sendCooldown.set(normalizedEmail, Date.now());

    return res.status(200).json({ message: 'OTP resent successfully.' });
  } catch (err) {
    console.error('resend-otp error:', err);
    res.status(500).json({ message: 'Failed to resend OTP.' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me  (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/signup  — Simple direct registration (no OTP)
//   Body: { username, email, password }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // ── Basic validation ──────────────────────────────────────────────────────
    if (!username || !email || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    if (username.length < 3) {
      return res.status(400).json({ message: 'Username must be at least 3 characters' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // ── Check for duplicate email/username ────────────────────────────────────
    const existing = await User.findOne({
      $or: [{ email: normalizedEmail }, { username }],
    });
    if (existing) {
      if (existing.email === normalizedEmail) {
        return res.status(409).json({ message: 'Email is already registered' });
      }
      return res.status(409).json({ message: 'Username is already taken' });
    }

    // ── Hash password ─────────────────────────────────────────────────────────
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // ── Create user ───────────────────────────────────────────────────────────
    const user = new User({ username, email: normalizedEmail, password: hashedPassword });
    await user.save();

    // ── Issue JWT ─────────────────────────────────────────────────────────────
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      token,
      user: { id: user._id, username: user.username, email: user.email },
    });
  } catch (err) {
    console.error('signup error:', err);
    res.status(500).json({ message: 'Server error during signup.' });
  }
});

module.exports = router;
