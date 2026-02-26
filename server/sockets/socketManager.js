// sockets/socketManager.js - Real-time bidding logic + timer management
const { verifyToken } = require('../config/jwt');
const db = require('../config/db');

// Store active timers (round_id -> setTimeout reference)
const activeTimers = new Map();

/**
 * Calculate and announce winner when round ends
 */
const announceWinner = async (io, roundId) => {
  try {
    // 1. Find winning song (highest total bid)
    const [winners] = await db.execute(
      `SELECT b.song_id, s.title, s.artist, SUM(b.amount) AS total_amount
       FROM bids b
       JOIN songs s ON b.song_id = s.id
       WHERE b.round_id = ?
       GROUP BY b.song_id, s.title, s.artist
       ORDER BY total_amount DESC
       LIMIT 1`,
      [roundId]
    );

    const winner = winners.length > 0 ? winners[0] : null;

    // 2. Close round in DB
    await db.execute(
      "UPDATE bidding_rounds SET status = 'closed', winner_song_id = ? WHERE id = ?",
      [winner ? winner.song_id : null, roundId]
    );

    // 3. Get ALL individual bids for this round
    const [allBids] = await db.execute(
      `SELECT b.user_id, b.song_id, b.amount, s.title AS song_title, u.name AS user_name
       FROM bids b
       JOIN songs s ON b.song_id = s.id
       JOIN users u ON b.user_id = u.id
       WHERE b.round_id = ?`,
      [roundId]
    );

    // 4. Create refund records for ALL non-winning bidders
    //    (even if they bet on the winning song but it still lost — N/A here since winner takes all)
    //    Logic: everyone who bid on a LOSING song gets a refund
    const losingBids = winner
      ? allBids.filter(b => b.song_id !== winner.song_id)
      : allBids; // if no winner, everyone gets refunded

    if (losingBids.length > 0) {
      const refundValues = losingBids
        .map(b => `(${roundId}, ${b.user_id}, ${b.song_id}, ${b.amount})`)
        .join(', ');

      await db.execute(
        `INSERT INTO refunds (round_id, user_id, song_id, amount) VALUES ${refundValues}`
      );
      console.log(`💸 Created ${losingBids.length} refund(s) for round ${roundId}`);
    }

    // 5. Get final leaderboard
    const [finalBids] = await db.execute(
      `SELECT s.id AS song_id, s.title, s.artist,
        COALESCE(SUM(b.amount), 0) AS total_bid,
        COUNT(DISTINCT b.user_id) AS bidder_count
       FROM songs s
       LEFT JOIN bids b ON b.song_id = s.id AND b.round_id = ?
       WHERE s.dj_id = (SELECT dj_id FROM bidding_rounds WHERE id = ?)
       GROUP BY s.id, s.title, s.artist
       ORDER BY total_bid DESC`,
      [roundId, roundId]
    );

    // 6. Broadcast round_ended to ALL clients (global announcement)
    io.emit('round_ended', {
      round_id: roundId,
      winner,
      final_bids: finalBids,
      message: winner
        ? `🏆 "${winner.title}" wins with ₹${Number(winner.total_amount).toLocaleString()}!`
        : 'Round ended with no bids.',
    });

    // 7. Send PERSONAL refund notification to each losing bidder (per socket user_id)
    //    Group by user so one user gets one combined notification
    const refundsByUser = {};
    for (const bid of losingBids) {
      if (!refundsByUser[bid.user_id]) {
        refundsByUser[bid.user_id] = { total: 0, songs: [], name: bid.user_name };
      }
      refundsByUser[bid.user_id].total += Number(bid.amount);
      refundsByUser[bid.user_id].songs.push(bid.song_title);
    }

    // Emit to each socket that belongs to a refunded user
    const sockets = await io.fetchSockets();
    for (const sock of sockets) {
      const userId = sock.data?.userId;
      if (userId && refundsByUser[userId]) {
        const r = refundsByUser[userId];
        sock.emit('refund_issued', {
          amount: r.total,
          songs: r.songs,
          round_id: roundId,
          message: `💸 Sorry! Your bid didn't win. ₹${r.total.toLocaleString()} refund will be credited to your account.`,
        });
      }
    }

    activeTimers.delete(roundId);
    console.log(`✅ Round ${roundId} ended. Winner: ${winner?.title || 'None'}`);
  } catch (err) {
    console.error('Announce winner error:', err);
  }
};

/**
 * Start a countdown timer for a round
 */
const startRoundTimer = (io, roundId, durationSeconds) => {
  // Clear existing timer if any
  if (activeTimers.has(roundId)) {
    clearTimeout(activeTimers.get(roundId));
  }

  console.log(`⏱️  Timer started for round ${roundId}: ${durationSeconds}s`);

  const timer = setTimeout(async () => {
    await announceWinner(io, roundId);
  }, durationSeconds * 1000);

  activeTimers.set(roundId, timer);
};

/**
 * Initialize Socket.IO
 */
const initSocket = (io) => {
  // Authenticate socket connections with JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token provided.'));
    try {
      socket.user = verifyToken(token);
      next();
    } catch {
      next(new Error('Invalid token.'));
    }
  });

  // Helper: fetch current active round state from DB
  const getCurrentState = async () => {
    const [rounds] = await db.execute(
      "SELECT * FROM bidding_rounds WHERE status = 'active' ORDER BY start_time DESC LIMIT 1"
    );
    if (!rounds.length) return null;

    const round = rounds[0];
    const [songs] = await db.execute(
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
    return { round, songs, server_time: new Date().toISOString() };
  };

  io.on('connection', async (socket) => {
    const { id, role, name } = socket.user;
    // Store userId on socket.data so announceWinner can target this socket
    socket.data.userId = id;
    console.log(`🔌 Connected: ${name || 'User'} (${role}) [${socket.id}]`);

    // ── AUTO PUSH current state on every connect ──────────────────
    // This means clients NEVER need to refresh — they get state immediately
    try {
      const state = await getCurrentState();
      if (state) {
        socket.emit('current_state', state);
      } else {
        socket.emit('no_active_round', {});
      }
    } catch (err) {
      console.error('Auto state push error:', err);
    }

    // ======================================
    // DJ EVENTS
    // ======================================

    socket.on('start_round', async ({ round_id, duration_seconds }) => {
      if (role !== 'dj') return;

      try {
        const [round] = await db.execute(
          'SELECT * FROM bidding_rounds WHERE id = ?',
          [round_id]
        );
        if (!round.length) return;

        const [songs] = await db.execute(
          `SELECT s.id, s.title, s.artist, 0 AS total_bid, 0 AS bidder_count
           FROM songs s WHERE s.dj_id = ?`,
          [round[0].dj_id]
        );

        // Broadcast to ALL connected clients immediately
        io.emit('round_started', {
          round_id,
          duration_seconds,
          end_time: round[0].end_time,
          songs,
          dj_name: name,
          message: `🎵 Bidding round started! You have ${duration_seconds} seconds to bid!`,
        });

        startRoundTimer(io, round_id, duration_seconds);
        console.log(`🎵 Round ${round_id} started by DJ ${name}`);
      } catch (err) {
        console.error('start_round error:', err);
      }
    });

    // DJ manually ends round
    socket.on('end_round', async ({ round_id }) => {
      if (role !== 'dj') return;
      if (activeTimers.has(round_id)) clearTimeout(activeTimers.get(round_id));
      await announceWinner(io, round_id);
    });

    // ======================================
    // ANY CLIENT — manual state request
    // ======================================
    socket.on('get_state', async () => {
      try {
        const state = await getCurrentState();
        if (state) {
          socket.emit('current_state', state);
        } else {
          socket.emit('no_active_round', {});
        }
      } catch (err) {
        console.error('get_state error:', err);
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 Disconnected: ${name || 'User'} [${socket.id}]`);
    });
  });

  console.log('✅ Socket.IO initialized');

  // Expose startRoundTimer so HTTP controllers can use it
  return { startRoundTimer };
};

module.exports = { initSocket, activeTimers };