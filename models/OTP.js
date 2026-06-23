const mongoose = require('mongoose');

/**
 * Stores a temporary OTP tied to an email address.
 * The record auto-expires after 10 minutes via MongoDB TTL index.
 */
const OTPSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  otp: {
    type: String,
    required: true,
  },
  // Pending registration data — saved so user doesn't re-enter on verify step
  pendingData: {
    username: String,
    hashedPassword: String,
  },
  attempts: {
    type: Number,
    default: 0,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    // MongoDB TTL: auto-delete document 10 minutes after createdAt
    expires: 600, // seconds
  },
});

module.exports = mongoose.model('OTP', OTPSchema);
