// middlewares/auth.js - JWT verification
const { verifyToken } = require('../config/jwt');
const { fail } = require('../config/response');

const authenticate = (req, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.startsWith('Bearer ')) {
      return fail(res, 'Access denied. No token provided.', 401);
    }
    const token = header.split(' ')[1];
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return fail(res, err.name === 'TokenExpiredError' ? 'Token expired.' : 'Invalid token.', 401);
  }
};

module.exports = { authenticate };
