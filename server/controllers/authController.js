// controllers/authController.js - OTP-based mobile authentication
const db = require('../config/db');
const { generateToken } = require('../config/jwt');
const { sendOTP, verifyOTP } = require('../services/otpService');
const { ok, fail } = require('../config/response');

/**
 * POST /api/auth/send-otp
 * Send OTP to mobile number (both DJ and user)
 */
const sendOTPHandler = async (req, res) => {
  const { mobile } = req.body;

  try {
    const otp = await sendOTP(mobile);

    return ok(res, {
      mobile,
      // Only expose OTP in development for testing
      ...(process.env.NODE_ENV === 'development' && { otp }),
    }, 'OTP sent successfully.');
  } catch (err) {
    console.error('Send OTP error:', err);
    return fail(res, 'Failed to send OTP. Please try again.', 500, err.message);
  }
};

/**
 * POST /api/auth/verify-otp
 * Verify OTP and login/register user
 */
const verifyOTPHandler = async (req, res) => {
  const { mobile, otp, name } = req.body;

  try {
    // Verify the OTP
    const result = await verifyOTP(mobile, otp);
    if (!result.valid) {
      return fail(res, result.message, 400);
    }

    // Check if user exists
    const [existing] = await db.execute(
      'SELECT id, mobile, name, role FROM users WHERE mobile = ?',
      [mobile]
    );

    let user;

    if (existing.length > 0) {
      user = existing[0];

      // Update name if provided and not set
      if (name && !user.name) {
        await db.execute('UPDATE users SET name = ? WHERE id = ?', [name.trim(), user.id]);
        user.name = name.trim();
      }
    } else {
      // New user registration
      const [result] = await db.execute(
        'INSERT INTO users (mobile, name, role) VALUES (?, ?, ?)',
        [mobile, name ? name.trim() : null, 'user']
      );

      const [newUser] = await db.execute(
        'SELECT id, mobile, name, role FROM users WHERE id = ?',
        [result.insertId]
      );
      user = newUser[0];
    }

    // Generate JWT
    const token = generateToken({ id: user.id, mobile: user.mobile, role: user.role, name: user.name });

    return ok(res, {
      token,
      user,
      isNewUser: !user.name,
    }, 'Login successful.');
  } catch (err) {
    console.error('Verify OTP error:', err);
    return fail(res, 'Verification failed.', 500, err.message);
  }
};

/**
 * POST /api/auth/set-name
 * Set name for first-time users
 */
const setName = async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  if (!name || name.trim().length < 2) {
    return fail(res, 'Name must be at least 2 characters.', 400);
  }

  try {
    await db.execute('UPDATE users SET name = ? WHERE id = ?', [name.trim(), userId]);

    // Return new token with updated name
    const [rows] = await db.execute('SELECT id, mobile, name, role FROM users WHERE id = ?', [userId]);
    const user = rows[0];
    const token = generateToken({ id: user.id, mobile: user.mobile, role: user.role, name: user.name });

    return ok(res, { token, user }, 'Name updated successfully.');
  } catch (err) {
    return fail(res, 'Failed to update name.', 500, err.message);
  }
};

/**
 * GET /api/auth/me
 */
const getMe = async (req, res) => {
  try {
    const [rows] = await db.execute(
      'SELECT id, mobile, name, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (!rows.length) return fail(res, 'User not found.', 404);
    return ok(res, rows[0]);
  } catch (err) {
    return fail(res, 'Failed to fetch profile.', 500, err.message);
  }
};



module.exports = { sendOTPHandler, verifyOTPHandler, setName, getMe };
