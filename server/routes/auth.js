// routes/auth.js
const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { sendOTPHandler, verifyOTPHandler, setName, getMe } = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const { validateMobile, validateOTP } = require('../middlewares/validate');

// Rate limit OTP requests: max 5 per 15 minutes per IP
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many OTP requests. Please wait 15 minutes.' },
});

router.post('/send-otp', otpLimiter, validateMobile, sendOTPHandler);
router.post('/verify-otp', validateOTP, verifyOTPHandler);
router.post('/set-name', authenticate, setName);
router.get('/me', authenticate, getMe);

module.exports = router;
