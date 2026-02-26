// controllers/refundController.js
const db = require('../config/db');
const { ok, fail } = require('../config/response');

/**
 * GET /api/refunds/my — user's refund history
 */
const getMyRefunds = async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await db.execute(
      `SELECT r.*, s.title AS song_title, s.artist,
        br.id AS round_id, br.start_time AS round_date
       FROM refunds r
       JOIN songs s ON r.song_id = s.id
       JOIN bidding_rounds br ON r.round_id = br.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC
       LIMIT 50`,
      [userId]
    );
    const total = rows.reduce((sum, r) => sum + Number(r.amount), 0);
    return ok(res, { refunds: rows, total_refunded: total });
  } catch (err) {
    return fail(res, 'Failed to fetch refunds.', 500, err.message);
  }
};

module.exports = { getMyRefunds };