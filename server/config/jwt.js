// utils/jwt.js
const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'fallback_secret';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '30d';

const generateToken = (payload) => jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN });
const verifyToken = (token) => jwt.verify(token, SECRET);

module.exports = { generateToken, verifyToken };
