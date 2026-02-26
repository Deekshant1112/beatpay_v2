// middlewares/validate.js - Input validation
const { fail } = require('../config/response');

const validateMobile = (req, res, next) => {
  const { mobile } = req.body;
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return fail(res, 'Please provide a valid 10-digit mobile number.', 400);
  }
  next();
};

const validateOTP = (req, res, next) => {
  const { mobile, otp } = req.body;
  if (!mobile || !/^\d{10}$/.test(mobile)) {
    return fail(res, 'Valid mobile number required.', 400);
  }
  if (!otp || !/^\d{6}$/.test(otp)) {
    return fail(res, 'Please provide a valid 6-digit OTP.', 400);
  }
  next();
};

const validateSong = (req, res, next) => {
  const { title, artist } = req.body;
  if (!title || title.trim().length < 1) return fail(res, 'Song title is required.', 400);
  if (!artist || artist.trim().length < 1) return fail(res, 'Artist name is required.', 400);
  next();
};

const validateBid = (req, res, next) => {
  const { song_id, amount } = req.body;
  if (!song_id || isNaN(song_id)) return fail(res, 'Valid song_id is required.', 400);
  if (!amount || isNaN(amount) || Number(amount) <= 0) {
    return fail(res, 'Bid amount must be a positive number.', 400);
  }
  next();
};

module.exports = { validateMobile, validateOTP, validateSong, validateBid };
