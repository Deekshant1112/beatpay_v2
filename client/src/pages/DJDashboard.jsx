// pages/DJDashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { roundsAPI, songsAPI } from '../services/api';
import { whenConnected, getSocket } from '../services/socket';
import CountdownTimer from '../components/CountdownTimer';

const DURATIONS = [{ v: 30, l: '30s' }, { v: 60, l: '1 min' }, { v: 90, l: '90s' }, { v: 120, l: '2 min' }];
const sortByBid = (arr) => [...arr].sort((a, b) => Number(b.total_bid) - Number(a.total_bid));

export default function DJDashboard() {
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const [activeRound, setActiveRound] = useState(null);
  const [songs, setSongs] = useState([]);
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);
  const [roundEnded, setRoundEnded] = useState(null);
  const [flashSong, setFlashSong] = useState(null);
  const flashRef = useRef(null);

  const fetchState = async () => {
    try {
      const { data } = await roundsAPI.getActive();
      if (data.data) { setActiveRound(data.data); setSongs(sortByBid(data.data.songs || [])); }
    } catch {}
  };

  useEffect(() => {
    fetchState();
    songsAPI.getOwn().then(({ data }) => setSongs(sortByBid(data.data))).catch(() => {});

    whenConnected((socket) => {
      socket.on('bids_updated', ({ songs: s, latest_bid }) => {
        setSongs(sortByBid(s));
        if (latest_bid?.song_id) {
          setFlashSong(latest_bid.song_id);
          clearTimeout(flashRef.current);
          flashRef.current = setTimeout(() => setFlashSong(null), 1200);
        }
      });
      socket.on('round_ended', ({ winner, final_bids, message }) => {
        setActiveRound(null);
        setRoundEnded({ winner, final_bids });
        setSongs(sortByBid(final_bids || []));
        info(message);
      });
    });

    return () => {
      const s = getSocket();
      s?.off('bids_updated'); s?.off('round_ended');
      clearTimeout(flashRef.current);
    };
  }, []);

  const startRound = async () => {
    if (!songs.length) { error('Add songs to your playlist first!'); return; }
    setLoading(true); setRoundEnded(null);
    try {
      const { data } = await roundsAPI.start(duration);
      const round = data.data;
      setActiveRound(round);
      whenConnected(s => s.emit('start_round', { round_id: round.id, duration_seconds: duration }));
      success(`🔴 Round started! ${duration}s to bid.`);
      fetchState();
    } catch (err) { error(err.response?.data?.message || 'Failed.'); }
    finally { setLoading(false); }
  };

  const endRound = async () => {
    if (!activeRound) return;
    setLoading(true);
    whenConnected(s => s.emit('end_round', { round_id: activeRound.id }));
    setActiveRound(null);
    success('Round ended.');
    setLoading(false);
  };

  const maxBid = Math.max(...songs.map(s => Number(s.total_bid) || 0), 1);
  const topSong = songs[0];
  const isLive = !!activeRound;

  return (
    <div className="dj-page">
      <div className="container dj-inner">

        {/* ── Header ── */}
        <div className="dj-header">
          <div className="dj-header__left">
            <div className="dj-greeting">Welcome back</div>
            <h1 className="dj-title">{user?.name || 'DJ'} 🎧</h1>
          </div>

          <div className="dj-controls">
            {!isLive ? (
              <div className="dj-start-row">
                <div className="dj-duration-pills">
                  {DURATIONS.map(d => (
                    <button
                      key={d.v}
                      className={`btn btn-sm ${duration === d.v ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setDuration(d.v)}
                    >
                      {d.l}
                    </button>
                  ))}
                </div>
                <button className="btn btn-primary btn-lg" onClick={startRound} disabled={loading}>
                  {loading
                    ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
                    : <span>▶</span>}
                  Start Round
                </button>
              </div>
            ) : (
              <button className="btn btn-danger" onClick={endRound} disabled={loading}>
                ⏹ End Now
              </button>
            )}
          </div>
        </div>

        {/* ── Live Round Panel ── */}
        {isLive && (
          <div className="dj-live-panel">
            <div className="dj-live-panel__left">
              <span className="badge badge-live dj-live-badge">
                <span className="dj-live-dot" />
                LIVE
              </span>
              <h3 className="dj-live-title">Round #{activeRound.id} in progress</h3>
              {topSong && Number(topSong.total_bid) > 0 && (
                <div className="dj-live-ticker">
                  🔥 Leading —{' '}
                  <strong style={{ color: 'var(--gold)' }}>"{topSong.title}"</strong>
                  <span style={{ color: 'var(--gold)', fontWeight: 800 }}>
                    {' '}₹{Number(topSong.total_bid).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
            <div className="dj-timer-wrap">
              <CountdownTimer
                endTime={activeRound.end_time}
                onExpire={() => { setActiveRound(null); fetchState(); }}
                size={120}
              />
            </div>
          </div>
        )}

        {/* ── Winner Banner ── */}
        {roundEnded?.winner && (
          <div className="winner-banner">
            <div className="dj-winner-trophy">🏆</div>
            <h2 className="dj-winner-title">"{roundEnded.winner.title}"</h2>
            <p className="dj-winner-artist">by {roundEnded.winner.artist}</p>
            <div className="dj-winner-amount">
              ₹{Number(roundEnded.winner.total_amount).toLocaleString()}
            </div>
          </div>
        )}

        {/* ── Leaderboard ── */}
        <div>
          <div className="dj-section-head">
            <h2 className="dj-section-title">
              {isLive ? '📊 Live Leaderboard' : '🎵 Playlist'}
            </h2>
            <div className="dj-section-meta">
              {isLive && <span className="dj-sort-hint">Auto-sorting by bid ↕</span>}
              <span className="badge badge-purple">{songs.length} songs</span>
            </div>
          </div>

          {songs.length === 0 ? (
            <div className="empty">
              <div style={{ fontSize: 48, marginBottom: 12 }}>🎵</div>
              <p>No songs yet. <a href="/dj/playlist" style={{ color: 'var(--neon)' }}>Add songs →</a></p>
            </div>
          ) : (
            <div className="dj-song-list">
              {songs.map((song, idx) => {
                const isTop = idx === 0 && Number(song.total_bid) > 0 && isLive;
                const isFlash = flashSong === song.id;
                const isWinner = roundEnded?.winner?.song_id === song.id;
                const bid = Number(song.total_bid) || 0;
                const pct = bid > 0 ? (bid / maxBid) * 100 : 0;
                const medals = ['🥇', '🥈', '🥉'];
                const rankBg = isTop ? 'var(--gold)' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#cd7f32' : 'var(--surface3)';
                const rankColor = idx < 3 ? '#000' : 'var(--text2)';

                return (
                  <div
                    key={song.id}
                    className={`song-card${isTop ? ' top-song' : ''}${isFlash ? ' flash' : ''}${isWinner ? ' winner-card' : ''}`}
                    style={{ cursor: 'default' }}
                  >
                    <div className="dj-song-row">
                      {/* Rank badge */}
                      <div
                        className="dj-rank"
                        style={{
                          background: rankBg,
                          color: rankColor,
                          fontSize: idx < 3 ? 18 : 12,
                          boxShadow: isTop ? 'var(--glow-gold)' : 'none',
                        }}
                      >
                        {idx < 3 ? medals[idx] : `#${idx + 1}`}
                      </div>

                      {/* Song info */}
                      <div className="dj-song-info">
                        <div className="dj-song-title-row">
                          <span className="dj-song-name" style={{ color: isTop ? 'var(--gold)' : 'var(--text)' }}>
                            {song.title}
                          </span>
                          <div className="dj-song-badges">
                            {isTop && <span className="badge badge-gold" style={{ fontSize: 10 }}>👑 LEADING</span>}
                            {isFlash && <span className="badge badge-pink" style={{ fontSize: 10 }}>⚡ BID!</span>}
                            {isWinner && <span className="badge badge-gold">🏆 WINNER</span>}
                          </div>
                        </div>
                        <div className="dj-song-artist">{song.artist}</div>
                      </div>

                      {/* Bid amount */}
                      <div className="dj-bid-right">
                        <div
                          className="dj-bid-amount"
                          style={{
                            fontSize: isTop ? 'clamp(18px,5vw,24px)' : 'clamp(14px,4vw,18px)',
                            color: isTop ? 'var(--gold)' : 'var(--text)',
                          }}
                        >
                          ₹{bid.toLocaleString()}
                        </div>
                        <div className="dj-bid-count">
                          {song.bidder_count} bid{song.bidder_count !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>

                    {bid > 0 && (
                      <div className="bid-bar">
                        <div className={`bid-bar-fill${isTop ? ' gold' : ''}`} style={{ width: `${pct}%` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <style>{`
        /* ── Page ─────────────────────────────────────── */
        .dj-page {
          flex: 1;
          padding-bottom: 60px;
        }
        .dj-inner {
          padding-top: clamp(20px, 5vw, 36px);
          display: flex;
          flex-direction: column;
          gap: clamp(16px, 4vw, 26px);
        }

        /* ── Header ───────────────────────────────────── */
        .dj-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 16px;
          flex-wrap: wrap;
        }
        .dj-greeting {
          font-size: 11px;
          color: var(--text3);
          text-transform: uppercase;
          letter-spacing: .09em;
          margin-bottom: 4px;
        }
        .dj-title {
          font-size: clamp(22px, 6vw, 34px);
          font-weight: 800;
          letter-spacing: -0.03em;
          line-height: 1.1;
        }
        .dj-controls {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .dj-start-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          justify-content: flex-end;
        }
        .dj-duration-pills {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        /* On very small screens, stack header vertically */
        @media (max-width: 480px) {
          .dj-header { flex-direction: column; }
          .dj-controls { width: 100%; justify-content: flex-start; }
          .dj-start-row { width: 100%; }
          .dj-start-row .btn-lg { flex: 1; }
        }

        /* ── Live panel ───────────────────────────────── */
        .dj-live-panel {
          background: linear-gradient(135deg, rgba(79,240,184,0.06), rgba(176,111,255,0.04));
          border: 1px solid rgba(79,240,184,0.2);
          border-radius: var(--r);
          padding: clamp(14px, 4vw, 22px);
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 16px;
          flex-wrap: wrap;
          box-shadow: var(--glow-green);
        }
        .dj-live-panel__left {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
          flex: 1;
        }
        .dj-live-badge {
          font-size: 12px !important;
          padding: 4px 12px !important;
          align-self: flex-start;
        }
        .dj-live-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--neon3);
          display: inline-block;
          box-shadow: 0 0 8px var(--neon3);
          animation: pulse 1.5s infinite;
          flex-shrink: 0;
        }
        .dj-live-title {
          font-size: clamp(14px, 4vw, 17px);
          font-weight: 600;
          color: var(--text);
        }
        .dj-live-ticker {
          font-size: clamp(12px, 3.5vw, 14px);
          color: var(--text2);
          white-space: normal;
          word-break: break-word;
        }
        .dj-timer-wrap {
          flex-shrink: 0;
        }
        /* On tiny phones, center timer below info */
        @media (max-width: 420px) {
          .dj-live-panel { flex-direction: column; align-items: flex-start; }
          .dj-timer-wrap { align-self: center; }
        }

        /* ── Winner banner extras ─────────────────────── */
        .dj-winner-trophy { font-size: 44px; margin-bottom: 8px; }
        .dj-winner-title {
          font-size: clamp(16px, 5vw, 22px);
          color: var(--gold);
          margin-bottom: 4px;
        }
        .dj-winner-artist { color: var(--text2); margin-bottom: 12px; font-size: 14px; }
        .dj-winner-amount {
          font-size: clamp(28px, 8vw, 38px);
          font-weight: 800;
          color: var(--gold);
          font-family: var(--font-display);
          letter-spacing: -0.03em;
        }

        /* ── Section head ─────────────────────────────── */
        .dj-section-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 14px;
          flex-wrap: wrap;
          gap: 8px;
        }
        .dj-section-title {
          font-size: clamp(15px, 4.5vw, 19px);
          font-weight: 600;
        }
        .dj-section-meta {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .dj-sort-hint {
          font-size: 11px;
          color: var(--text3);
        }

        /* ── Song list ────────────────────────────────── */
        .dj-song-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }
        .dj-song-row {
          display: flex;
          align-items: center;
          gap: clamp(10px, 3vw, 16px);
        }
        .dj-rank {
          width: clamp(30px, 8vw, 38px);
          height: clamp(30px, 8vw, 38px);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          flex-shrink: 0;
          transition: all .3s;
        }
        .dj-song-info {
          flex: 1;
          min-width: 0;
        }
        .dj-song-title-row {
          display: flex;
          align-items: center;
          gap: 6px;
          flex-wrap: wrap;
          margin-bottom: 2px;
        }
        .dj-song-name {
          font-weight: 600;
          font-size: clamp(13px, 3.5vw, 15px);
          line-height: 1.2;
          word-break: break-word;
        }
        .dj-song-badges {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }
        .dj-song-artist {
          font-size: clamp(11px, 3vw, 13px);
          color: var(--text2);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .dj-bid-right {
          text-align: right;
          flex-shrink: 0;
          min-width: clamp(56px, 16vw, 88px);
        }
        .dj-bid-amount {
          font-weight: 800;
          font-family: var(--font-display);
          letter-spacing: -0.02em;
          line-height: 1.1;
          transition: all .3s;
        }
        .dj-bid-count {
          font-size: clamp(9px, 2.5vw, 11px);
          color: var(--text3);
          margin-top: 2px;
        }

        /* Hide leading/winner badges on very small phones to avoid overflow */
        @media (max-width: 360px) {
          .dj-song-badges { display: none; }
          .dj-bid-right { min-width: 52px; }
        }
      `}</style>
    </div>
  );
}