// services/otpService.js
// Mock OTP system - structured for future SMS provider integration
// Replace sendSMS() with Twilio / AWS SNS / MSG91 etc.

const db = require('../config/db');

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP to mobile number
 * In production: replace console.log with actual SMS API call
 */
const sendOTP = async (mobile) => {
  // Clean up old OTPs for this mobile
  await db.execute(
    'DELETE FROM otp_verifications WHERE mobile = ?',
    [mobile]
  );

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + (process.env.OTP_EXPIRY_MINUTES || 5) * 60 * 1000);

  // Store OTP in database
  await db.execute(
    'INSERT INTO otp_verifications (mobile, otp_code, expires_at) VALUES (?, ?, ?)',
    [mobile, otp, expiresAt]
  );

  // =====================================================
  // MOCK: Log OTP to console (replace with real SMS here)
  // =====================================================
  console.log(`\n📱 OTP for ${mobile}: ${otp} (expires in ${process.env.OTP_EXPIRY_MINUTES || 5} min)\n`);

  // Future SMS integration example:
  // await twilioClient.messages.create({
  //   body: `Your BeatPay OTP is: ${otp}`,
  //   from: process.env.TWILIO_PHONE,
  //   to: `+91${mobile}`
  // });

  return otp; // Return for dev/testing
};

/**
 * Verify OTP
 */
const verifyOTP = async (mobile, otp) => {
  const [rows] = await db.execute(
    `SELECT * FROM otp_verifications 
     WHERE mobile = ? AND otp_code = ? AND verified = 0 AND expires_at > NOW()
     ORDER BY created_at DESC LIMIT 1`,
    [mobile, otp]
  );

  if (rows.length === 0) {
    return { valid: false, message: 'Invalid or expired OTP.' };
  }

  // Mark as verified
  await db.execute(
    'UPDATE otp_verifications SET verified = 1 WHERE id = ?',
    [rows[0].id]
  );

  return { valid: true };
};

module.exports = { sendOTP, verifyOTP };
