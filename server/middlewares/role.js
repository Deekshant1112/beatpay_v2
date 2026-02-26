// middlewares/role.js - Role-based access control
const { fail } = require('../config/response');

const authorize = (...roles) => (req, res, next) => {
  if (!req.user) return fail(res, 'Authentication required.', 401);
  if (!roles.includes(req.user.role)) {
    return fail(res, `Access denied. Requires role: ${roles.join(' or ')}.`, 403);
  }
  next();
};

module.exports = { authorize };
