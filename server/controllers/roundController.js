// controllers/roundController.js - DJ manages bidding rounds
const db = require('../config/db');
const { ok, fail } = require('../config/response');

/**
 * POST /api/rounds/start - DJ starts a new bidding round
 */
const startRound = async (req, res) => {
  const { duration_seconds = 60 } = req.body;
  const djId = req.user.id;

  try {
    // Close any existing active round for this DJ
    await db.execute(
      "UPDATE bidding_rounds SET status = 'closed' WHERE dj_id = ? AND status = 'active'",
      [djId]
    );

    // Verify DJ has songs
    const [songs] = await db.execute(
      'SELECT id FROM songs WHERE dj_id = ?',
      [djId]
    );
    if (songs.length === 0) {
      return fail(res, 'Add at least one song before starting a round.', 400);
    }

    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + duration_seconds * 1000);

    const [result] = await db.execute(
      `INSERT INTO bidding_rounds (dj_id, status, duration_seconds, start_time, end_time) 
       VALUES (?, 'active', ?, ?, ?)`,
      [djId, duration_seconds, startTime, endTime]
    );

    const [round] = await db.execute(
      'SELECT * FROM bidding_rounds WHERE id = ?',
      [result.insertId]
    );

    return ok(res, round[0], 'Bidding round started!', 201);
  } catch (err) {
    return fail(res, 'Failed to start round.', 500, err.message);
  }
};

/**
 * POST /api/rounds/:id/end - DJ manually ends a round
 */
const endRound = async (req, res) => {
  const { id } = req.params;
  const djId = req.user.id;

  try {
    const [round] = await db.execute(
      "SELECT * FROM bidding_rounds WHERE id = ? AND dj_id = ? AND status = 'active'",
      [id, djId]
    );
    if (!round.length) return fail(res, 'Active round not found.', 404);

    // Find winner: song with highest TOTAL bid amount
    const [winner] = await db.execute(
      `SELECT b.song_id, s.title, s.artist, SUM(b.amount) AS total_amount
       FROM bids b
       JOIN songs s ON b.song_id = s.id
       WHERE b.round_id = ?
       GROUP BY b.song_id, s.title, s.artist
       ORDER BY total_amount DESC
       LIMIT 1`,
      [id]
    );

    const winnerSongId = winner.length > 0 ? winner[0].song_id : null;

    await db.execute(
      "UPDATE bidding_rounds SET status = 'closed', winner_song_id = ?, end_time = NOW() WHERE id = ?",
      [winnerSongId, id]
    );

    return ok(res, {
      round_id: id,
      winner: winner.length > 0 ? winner[0] : null,
    }, 'Round ended.');
  } catch (err) {
    return fail(res, 'Failed to end round.', 500, err.message);
  }
};

/**
 * GET /api/rounds/active - Get current active round
 */
const getActiveRound = async (req, res) => {
  try {
    const [rounds] = await db.execute(
      `SELECT br.*, u.name AS dj_name 
       FROM bidding_rounds br 
       JOIN users u ON br.dj_id = u.id
       WHERE br.status = 'active' 
       ORDER BY br.start_time DESC LIMIT 1`
    );

    if (!rounds.length) return ok(res, null, 'No active round.');

    const round = rounds[0];

    // Get songs with their total bids for this round
    const [songBids] = await db.execute(
      `SELECT s.id, s.title, s.artist,
        COALESCE(SUM(b.amount), 0) AS total_bid,
        COUNT(DISTINCT b.user_id) AS bidder_count
       FROM songs s
       LEFT JOIN bids b ON b.song_id = s.id AND b.round_id = ?
       WHERE s.dj_id = ?
       GROUP BY s.id, s.title, s.artist
       ORDER BY total_bid DESC`,
      [round.id, round.dj_id]
    );

    return ok(res, { ...round, songs: songBids });
  } catch (err) {
    return fail(res, 'Failed to fetch active round.', 500, err.message);
  }
};

/**
 * GET /api/rounds/history - DJ's past rounds with results
 */
const getRoundHistory = async (req, res) => {
  const djId = req.user.id;

  try {
    const [rounds] = await db.execute(
      `SELECT br.*, s.title AS winner_title, s.artist AS winner_artist,
        (SELECT SUM(b.amount) FROM bids b WHERE b.round_id = br.id AND b.song_id = br.winner_song_id) AS winning_amount
       FROM bidding_rounds br
       LEFT JOIN songs s ON br.winner_song_id = s.id
       WHERE br.dj_id = ?
       ORDER BY br.created_at DESC
       LIMIT 20`,
      [djId]
    );
    return ok(res, rounds);
  } catch (err) {
    return fail(res, 'Failed to fetch history.', 500, err.message);
  }
};

module.exports = { startRound, endRound, getActiveRound, getRoundHistory };
