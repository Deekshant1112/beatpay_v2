// controllers/songController.js - DJ manages songs playlist
const db = require('../config/db');
const { ok, fail } = require('../config/response');

/**
 * POST /api/songs - DJ adds a song
 */
const addSong = async (req, res) => {
  const { title, artist } = req.body;
  const djId = req.user.id;

  try {
    const [result] = await db.execute(
      'INSERT INTO songs (dj_id, title, artist) VALUES (?, ?, ?)',
      [djId, title.trim(), artist.trim()]
    );

    const [rows] = await db.execute('SELECT * FROM songs WHERE id = ?', [result.insertId]);
    return ok(res, rows[0], 'Song added to playlist.', 201);
  } catch (err) {
    return fail(res, 'Failed to add song.', 500, err.message);
  }
};

/**
 * GET /api/songs - Get DJ's playlist
 */
const getSongs = async (req, res) => {
  const djId = req.user.id;

  try {
    const [rows] = await db.execute(
      'SELECT * FROM songs WHERE dj_id = ? ORDER BY created_at DESC',
      [djId]
    );
    return ok(res, rows);
  } catch (err) {
    return fail(res, 'Failed to fetch songs.', 500, err.message);
  }
};

/**
 * GET /api/songs/current - Get current DJ's songs (for users)
 * Returns songs of the active DJ (most recent active round's DJ)
 */
const getCurrentSongs = async (req, res) => {
  try {
    // Get the active bidding round's DJ songs
    const [rounds] = await db.execute(
      `SELECT br.dj_id FROM bidding_rounds br 
       WHERE br.status = 'active' 
       ORDER BY br.start_time DESC LIMIT 1`
    );

    if (rounds.length === 0) {
      return ok(res, [], 'No active round.');
    }

    const [songs] = await db.execute(
      'SELECT * FROM songs WHERE dj_id = ? ORDER BY created_at ASC',
      [rounds[0].dj_id]
    );

    return ok(res, songs);
  } catch (err) {
    return fail(res, 'Failed to fetch songs.', 500, err.message);
  }
};

/**
 * DELETE /api/songs/:id - DJ removes a song
 */
const deleteSong = async (req, res) => {
  const { id } = req.params;
  const djId = req.user.id;

  try {
    const [song] = await db.execute(
      'SELECT id FROM songs WHERE id = ? AND dj_id = ?',
      [id, djId]
    );
    if (!song.length) return fail(res, 'Song not found.', 404);

    await db.execute('DELETE FROM songs WHERE id = ?', [id]);
    return ok(res, null, 'Song removed.');
  } catch (err) {
    return fail(res, 'Failed to delete song.', 500, err.message);
  }
};

module.exports = { addSong, getSongs, getCurrentSongs, deleteSong };
