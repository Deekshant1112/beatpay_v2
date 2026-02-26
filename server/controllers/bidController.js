// controllers/bidController.js - Users place bids on songs
const db = require('../config/db');
const { ok, fail } = require('../config/response');

/**
 * POST /api/bids - User places or increases a bid
 */
const placeBid = async (req, res) => {
  const { song_id, amount } = req.body;
  const userId = req.user.id;

  try {
    // Get active round
    const [rounds] = await db.execute(
      "SELECT * FROM bidding_rounds WHERE status = 'active' ORDER BY start_time DESC LIMIT 1"
    );

    if (!rounds.length) {
      return fail(res, 'No active bidding round right now.', 400);
    }

    const round = rounds[0];

    // Check round hasn't expired
    if (new Date() > new Date(round.end_time)) {
      return fail(res, 'Bidding round has ended.', 400);
    }

    // Verify song belongs to this round's DJ
    const [song] = await db.execute(
      'SELECT * FROM songs WHERE id = ? AND dj_id = ?',
      [song_id, round.dj_id]
    );
    if (!song.length) return fail(res, 'Song not found in current playlist.', 404);

    // Check if user already bid on this song in this round
    const [existing] = await db.execute(
      'SELECT * FROM bids WHERE round_id = ? AND song_id = ? AND user_id = ?',
      [round.id, song_id, userId]
    );

    if (existing.length > 0) {
      // Must bid higher than current amount
      if (Number(amount) <= Number(existing[0].amount)) {
        return fail(res, `New bid must be higher than your current bid of $${existing[0].amount}.`, 400);
      }
      // Update existing bid
      await db.execute(
        'UPDATE bids SET amount = ? WHERE id = ?',
        [Number(amount), existing[0].id]
      );
    } else {
      // Insert new bid
      await db.execute(
        'INSERT INTO bids (round_id, song_id, user_id, amount) VALUES (?, ?, ?, ?)',
        [round.id, song_id, userId, Number(amount)]
      );
    }

    // Get updated song totals for this round
    const [songTotals] = await db.execute(
      `SELECT s.id AS song_id, s.title, s.artist,
        COALESCE(SUM(b.amount), 0) AS total_bid,
        COUNT(DISTINCT b.user_id) AS bidder_count
       FROM songs s
       LEFT JOIN bids b ON b.song_id = s.id AND b.round_id = ?
       WHERE s.dj_id = ?
       GROUP BY s.id, s.title, s.artist
       ORDER BY total_bid DESC`,
      [round.id, round.dj_id]
    );

    // Emit real-time update via socket (attached to app)
    const io = req.app.get('io');
    if (io) {
      io.emit('bids_updated', {
        round_id: round.id,
        songs: songTotals,
        latest_bid: {
          song_id,
          user_name: req.user.name,
          amount: Number(amount),
        },
      });
    }

    return ok(res, { songs: songTotals }, 'Bid placed successfully!');
  } catch (err) {
    console.error('Bid error:', err);
    return fail(res, 'Failed to place bid.', 500, err.message);
  }
};

/**
 * GET /api/bids/round/:roundId - Get all bids for a round
 */
const getRoundBids = async (req, res) => {
  const { roundId } = req.params;

  try {
    const [bids] = await db.execute(
      `SELECT b.*, s.title, s.artist, u.name AS user_name
       FROM bids b
       JOIN songs s ON b.song_id = s.id
       JOIN users u ON b.user_id = u.id
       WHERE b.round_id = ?
       ORDER BY b.amount DESC`,
      [roundId]
    );
    return ok(res, bids);
  } catch (err) {
    return fail(res, 'Failed to fetch bids.', 500, err.message);
  }
};

/**
 * GET /api/bids/my - User's bids in current active round
 */
const getMyBids = async (req, res) => {
  const userId = req.user.id;

  try {
    const [bids] = await db.execute(
      `SELECT b.*, s.title, s.artist
       FROM bids b
       JOIN songs s ON b.song_id = s.id
       JOIN bidding_rounds br ON b.round_id = br.id
       WHERE b.user_id = ? AND br.status = 'active'
       ORDER BY b.created_at DESC`,
      [userId]
    );
    return ok(res, bids);
  } catch (err) {
    return fail(res, 'Failed to fetch your bids.', 500, err.message);
  }
};

module.exports = { placeBid, getRoundBids, getMyBids };
