// utils/response.js
const ok = (res, data, message = 'Success', status = 200) =>
  res.status(status).json({ success: true, message, data });

const fail = (res, message = 'Error', status = 500, details = null) => {
  const body = { success: false, message };
  if (details && process.env.NODE_ENV === 'development') body.details = details;
  return res.status(status).json(body);
};

module.exports = { ok, fail };
