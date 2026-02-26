// pages/LiveBidding.jsx
import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { bidsAPI } from '../services/api';
import { whenConnected } from '../services/socket';
import CountdownTimer from '../components/CountdownTimer';

const sortByBid = (arr) => [...arr].sort((a, b) => Number(b.total_bid) - Number(a.total_bid));

// ── Refund Modal ──────────────────────────────────────────────────────────────
const RefundModal = ({ refund, onClose }) => (
  <div style={rm.overlay} onClick={onClose}>
    <div style={rm.modal} onClick={e => e.stopPropagation()}>
      <div style={rm.icon}>💸</div>
      <h2 style={rm.title}>Refund Initiated!</h2>
      <p style={rm.sub}>Your song didn't win this round. No worries — your money is coming back.</p>

      <div style={rm.amountBox}>
        <div style={rm.amountLabel}>Refund Amount</div>
        <div style={rm.amount}>₹{Number(refund.amount).toLocaleString()}</div>
      </div>

      <div style={rm.detail}>
        <div style={rm.detailRow}>
          <span style={rm.detailKey}>Songs Bid On</span>
          <span style={rm.detailVal}>{refund.songs.join(', ')}</span>
        </div>
        <div style={rm.detailRow}>
          <span style={rm.detailKey}>Status</span>
          <span style={{ ...rm.detailVal, color: 'var(--neon3)', fontWeight: 600 }}>✅ Processed</span>
        </div>
        <div style={rm.detailRow}>
          <span style={rm.detailKey}>Credit Timeline</span>
          <span style={rm.detailVal}>3–5 business days*</span>
        </div>
      </div>

      <div style={rm.note}>
        * Payment gateway integration coming soon. Refunds are tracked and will be credited automatically once payments are live.
      </div>

      <button className="btn btn-primary btn-full btn-lg" onClick={onClose} style={{ marginTop: 20 }}>
        Got it! 👍
      </button>
    </div>
  </div>
);

const rm = {
  overlay: {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: 20, backdropFilter: 'blur(8px)',
    animation: 'fadeIn .2s ease',
  },
  modal: {
    background: 'var(--surface)',
    border: '1px solid rgba(79,240,184,0.25)',
    borderRadius: 20, padding: '32px 28px',
    maxWidth: 400, width: '100%',
    boxShadow: '0 0 60px rgba(79,240,184,0.15), 0 20px 60px rgba(0,0,0,0.6)',
    animation: 'scaleIn .25s ease',
    textAlign: 'center',
  },
  icon: { fontSize: 56, marginBottom: 12, filter: 'drop-shadow(0 0 20px rgba(79,240,184,0.5))' },
  title: { fontSize: 24, fontWeight: 800, marginBottom: 8, color: 'var(--text)' },
  sub: { fontSize: 14, color: 'var(--text2)', marginBottom: 24, lineHeight: 1.6 },
  amountBox: {
    background: 'rgba(79,240,184,0.08)',
    border: '1px solid rgba(79,240,184,0.2)',
    borderRadius: 14, padding: '16px 20px', marginBottom: 20,
  },
  amountLabel: { fontSize: 11, color: 'var(--neon3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: 6 },
  amount: { fontSize: 38, fontWeight: 800, color: 'var(--neon3)', fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' },
  detail: {
    background: 'var(--surface2)', border: '1px solid var(--rim)',
    borderRadius: 12, overflow: 'hidden', marginBottom: 16, textAlign: 'left',
  },
  detailRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--rim)' },
  detailKey: { fontSize: 12, color: 'var(--text3)', flexShrink: 0 },
  detailVal: { fontSize: 13, color: 'var(--text)', textAlign: 'right' },
  note: { fontSize: 12, color: 'var(--text3)', lineHeight: 1.5, fontStyle: 'italic' },
};

export default function LiveBidding() {
  const { user } = useAuth();
  const { success, error, info } = useToast();
  const [round, setRound] = useState(null);
  const [songs, setSongs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [bidAmt, setBidAmt] = useState('');
  const [myBids, setMyBids] = useState({});
  const [loading, setLoading] = useState(false);
  const [winner, setWinner] = useState(null);
  const [status, setStatus] = useState('connecting');
  const [flashSong, setFlashSong] = useState(null);
  const [showBidPanel, setShowBidPanel] = useState(false);
  const [refundModal, setRefundModal] = useState(null); // { amount, songs, round_id }
  const flashRef = useRef(null);

  useEffect(() => {
    whenConnected((socket) => {
      const onState = ({ round: r, songs: s }) => {
        setRound(r); setSongs(sortByBid(s)); setWinner(null); setStatus('live');
      };
      const onNoRound = () => { setRound(null); setStatus('waiting'); };
      const onStarted = ({ round_id, end_time, duration_seconds, songs: s, message }) => {
        setRound({ id: round_id, end_time, duration_seconds });
        setSongs(sortByBid(s)); setWinner(null);
        setMyBids({}); setSelected(null); setBidAmt('');
        setStatus('live'); setShowBidPanel(false);
        info(message);
      };
      const onBids = ({ songs: s, latest_bid }) => {
        setSongs(sortByBid(s));
        if (latest_bid?.song_id) {
          setFlashSong(latest_bid.song_id);
          clearTimeout(flashRef.current);
          flashRef.current = setTimeout(() => setFlashSong(null), 1200);
        }
        if (latest_bid?.user_name && latest_bid.user_name !== user?.name) {
          info(`⚡ ${latest_bid.user_name} bid ₹${latest_bid.amount}`);
        }
      };
      const onEnded = ({ winner: w, final_bids, message }) => {
        setRound(null); setWinner(w);
        setSongs(sortByBid(final_bids || []));
        setStatus('ended'); info(message);
      };
      // Personal refund notification
      const onRefund = ({ amount, songs: refundSongs, round_id, message }) => {
        setRefundModal({ amount, songs: refundSongs, round_id });
        // Also show a toast
        info(message);
      };

      socket.on('current_state', onState);
      socket.on('no_active_round', onNoRound);
      socket.on('round_started', onStarted);
      socket.on('bids_updated', onBids);
      socket.on('round_ended', onEnded);
      socket.on('refund_issued', onRefund);
      socket.emit('get_state');

      return () => {
        socket.off('current_state', onState);
        socket.off('no_active_round', onNoRound);
        socket.off('round_started', onStarted);
        socket.off('bids_updated', onBids);
        socket.off('round_ended', onEnded);
        socket.off('refund_issued', onRefund);
      };
    });
    return () => clearTimeout(flashRef.current);
  }, []);

  const placeBid = async (e) => {
    e.preventDefault();
    if (!selected) { error('Select a song!'); return; }
    if (!bidAmt || Number(bidAmt) <= 0) { error('Enter a valid amount.'); return; }
    const cur = myBids[selected] || 0;
    if (Number(bidAmt) <= cur) { error(`Must be more than ₹${cur}`); return; }
    setLoading(true);
    try {
      await bidsAPI.place(selected, bidAmt);
      setMyBids(p => ({ ...p, [selected]: Number(bidAmt) }));
      success(`₹${bidAmt} bid placed! 🎵`);
      setBidAmt('');
      setShowBidPanel(false);
    } catch (err) {
      error(err.response?.data?.message || 'Failed to bid.');
    } finally { setLoading(false); }
  };

  const selectSong = (id) => {
    setSelected(id); setBidAmt(''); setShowBidPanel(true);
  };

  const maxBid = Math.max(...songs.map(s => Number(s.total_bid) || 0), 1);
  const selSong = songs.find(s => s.id === selected);
  const medals = ['🥇','🥈','🥉'];

  // ── CONNECTING ────────────────────────────────────────────
  if (status === 'connecting') return (
    <div style={s.fullCenter}>
      <span className="spinner spinner-lg" />
      <p style={{ marginTop: 18, color: 'var(--text2)' }}>Connecting to live session...</p>
    </div>
  );

  // ── WAITING ───────────────────────────────────────────────
  if (status === 'waiting') return (
    <div style={s.fullCenter}>
      <div style={s.waitRings}>
        <div style={{ ...s.ring, animationDelay: '0s' }} />
        <div style={{ ...s.ring, animationDelay: '.5s' }} />
        <div style={{ ...s.ring, animationDelay: '1s' }} />
        <div style={{ fontSize: 52, position: 'relative', zIndex: 1, filter: 'drop-shadow(0 0 20px rgba(176,111,255,0.5))' }}>🎧</div>
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, marginTop: 24 }}>Waiting for DJ to start...</h2>
      <p style={{ color: 'var(--text2)', marginTop: 8, maxWidth: 300, textAlign: 'center' }}>
        The DJ will kick off a bidding round soon. Get ready!
      </p>
    </div>
  );

  // ── ENDED ─────────────────────────────────────────────────
  if (status === 'ended') return (
    <div className="container" style={s.page}>
      {refundModal && <RefundModal refund={refundModal} onClose={() => setRefundModal(null)} />}
      {winner && (
        <div className="winner-banner" style={{ animation: 'scaleIn .4s ease' }}>
          <div style={{ fontSize: 52 }}>🏆</div>
          <h2 style={{ fontSize: 26, color: 'var(--gold)', margin: '10px 0 4px' }}>Round Winner!</h2>
          <h3 style={{ fontSize: 20, marginBottom: 4 }}>"{winner.title}"</h3>
          <p style={{ color: 'var(--text2)', marginBottom: 14 }}>by {winner.artist}</p>
          <div style={{ fontSize: 34, fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-display)' }}>
            ₹{Number(winner.total_amount).toLocaleString()}
          </div>
        </div>
      )}
      {songs.length > 0 && (
        <div>
          <h3 style={{ fontSize: 16, color: 'var(--text2)', marginBottom: 12 }}>Final Leaderboard</h3>
          {songs.map((song, i) => (
            <div key={song.id} className={`song-card ${winner?.song_id === song.id ? 'winner-card' : ''}`}
              style={{ cursor: 'default', marginBottom: 8 }}>
              <div style={s.songRow}>
                <div style={{ ...s.rank, background: i === 0 ? 'var(--gold)' : i === 1 ? 'silver' : i === 2 ? '#cd7f32' : 'var(--surface3)', color: i < 3 ? '#000' : 'var(--text2)', fontSize: i < 3 ? 18 : 12 }}>
                  {i < 3 ? medals[i] : `#${i+1}`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{song.title} {winner?.song_id === song.id && '🏆'}</div>
                  <div style={{ fontSize: 13, color: 'var(--text2)' }}>{song.artist}</div>
                </div>
                <div style={{ fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: 18 }}>
                  ₹{Number(song.total_bid).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: 13 }}>⏳ Waiting for next round...</p>
    </div>
  );

  // ── LIVE ──────────────────────────────────────────────────
  return (
    <div style={s.page}>
      {/* Refund Modal — shows to losing bidders */}
      {refundModal && <RefundModal refund={refundModal} onClose={() => setRefundModal(null)} />}
      <div className="container" style={s.inner}>

        {/* Header */}
        <div style={s.header}>
          <div>
            <span className="badge badge-live" style={{ marginBottom: 8 }}>
              <span style={{ width:6,height:6,borderRadius:'50%',background:'var(--neon3)',display:'inline-block',animation:'pulse 1.5s infinite' }} />
              LIVE NOW
            </span>
            <h1 style={s.pageTitle}>Bid on a Song 🎵</h1>
            <p style={{ color: 'var(--text2)', fontSize: 14, marginTop: 4 }}>Hey {user?.name}! Tap a song, then place your bid.</p>
          </div>
          {round && (
            <CountdownTimer endTime={round.end_time} onExpire={() => setStatus('waiting')} size={110} />
          )}
        </div>

        {/* Leading ticker */}
        {songs[0] && Number(songs[0].total_bid) > 0 && (
          <div style={s.ticker}>
            <span style={{ color: 'var(--neon3)' }}>🔥</span>
            Leading right now —
            <strong style={{ color: 'var(--gold)', margin: '0 4px' }}>"{songs[0].title}"</strong>
            <strong style={{ color: 'var(--gold)' }}>₹{Number(songs[0].total_bid).toLocaleString()}</strong>
          </div>
        )}

        {/* Desktop: 2-col. Mobile: stacked */}
        <div style={s.layout}>
          {/* Songs list */}
          <div style={s.songsCol}>
            {songs.map((song, idx) => {
              const bid = Number(song.total_bid) || 0;
              const pct = bid > 0 ? (bid / maxBid) * 100 : 0;
              const myBid = myBids[song.id];
              const isSel = selected === song.id;
              const isTop = idx === 0 && bid > 0;
              const isFlash = flashSong === song.id;

              return (
                <div key={song.id}
                  className={`song-card ${isSel ? 'selected' : isTop ? 'top-song' : ''} ${isFlash ? 'flash' : ''}`}
                  onClick={() => selectSong(song.id)}>
                  <div style={s.songRow}>
                    <div style={{ ...s.rank,
                      background: isTop ? 'var(--gold)' : idx === 1 ? 'silver' : idx === 2 ? '#cd7f32' : 'var(--surface3)',
                      color: idx < 3 ? '#000' : 'var(--text2)', fontSize: idx < 3 ? 17 : 12,
                    }}>
                      {idx < 3 ? medals[idx] : `#${idx+1}`}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, fontSize: 15, color: isTop ? 'var(--gold)' : 'var(--text)' }}>
                          {song.title}
                        </span>
                        {isTop && <span className="badge badge-gold" style={{ fontSize: 10 }}>👑 TOP</span>}
                        {isFlash && <span className="badge badge-pink" style={{ fontSize: 10 }}>⚡</span>}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text2)' }}>{song.artist}</div>
                      {myBid && (
                        <span className="badge badge-purple" style={{ marginTop: 6, fontSize: 11 }}>
                          Your bid: ₹{myBid}
                        </span>
                      )}
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 800, fontFamily: 'var(--font-display)', fontSize: isTop ? 20 : 16, color: isTop ? 'var(--gold)' : 'var(--text)', transition: 'all .3s' }}>
                        ₹{bid.toLocaleString()}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{song.bidder_count} bid{song.bidder_count !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  {bid > 0 && (
                    <div className="bid-bar">
                      <div className={`bid-bar-fill ${isTop ? 'gold' : ''}`} style={{ width: `${pct}%` }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Bid panel — sticky desktop, slide-up mobile */}
          <div style={{ ...s.bidCol, ...(showBidPanel ? s.bidColVisible : {}) }}>
            {/* Mobile close */}
            <button style={s.mobileClose} onClick={() => setShowBidPanel(false)}>✕</button>

            <div className="card" style={s.bidCard}>
              {!selected ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text3)' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>👆</div>
                  <p>Tap a song to place your bid</p>
                </div>
              ) : (
                <>
                  <div style={s.selSongBox}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.07em' }}>Bidding on</div>
                    <div style={{ fontWeight: 700, fontSize: 17 }}>{selSong?.title}</div>
                    <div style={{ color: 'var(--text2)', fontSize: 13, marginBottom: 8 }}>{selSong?.artist}</div>
                    <div style={{ color: 'var(--gold)', fontWeight: 700 }}>
                      Pool: ₹{Number(selSong?.total_bid || 0).toLocaleString()}
                    </div>
                  </div>

                  {myBids[selected] && (
                    <div style={s.myBidNote}>
                      Your current bid: <strong style={{ color: 'var(--neon)' }}>₹{myBids[selected]}</strong>
                    </div>
                  )}

                  <form onSubmit={placeBid} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div className="form-group">
                      <label className="label" htmlFor="bidamount">Bid Amount (₹)</label>
                      <input id="bidamount" name="bidamount" className="input"
                        type="number"
                        placeholder={myBids[selected] ? `More than ₹${myBids[selected]}` : 'e.g. 500'}
                        value={bidAmt}
                        onChange={e => setBidAmt(e.target.value)}
                        min={myBids[selected] ? myBids[selected] + 1 : 1}
                        autoComplete="off"
                        required
                      />
                    </div>
                    <button type="submit" className="btn btn-gold btn-full btn-lg" disabled={loading}>
                      {loading
                        ? <><span className="spinner" style={{ width:18,height:18,borderWidth:2,borderTopColor:'#000' }} /> Placing...</>
                        : myBids[selected] ? '⬆ Increase Bid' : '💰 Place Bid'}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile bid button */}
        {selected && !showBidPanel && (
          <div style={s.floatingBidBtn}>
            <button className="btn btn-gold btn-lg" style={{ width: '100%', maxWidth: 400 }}
              onClick={() => setShowBidPanel(true)}>
              💰 Bid on "{selSong?.title}"
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const s = {
  page: { flex: 1, paddingBottom: 100 },
  inner: { paddingTop: 24, display: 'flex', flexDirection: 'column', gap: 18 },
  fullCenter: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: '80vh', gap: 8, textAlign: 'center', padding: 24,
  },
  waitRings: { position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 120, height: 120 },
  ring: {
    position: 'absolute', borderRadius: '50%',
    border: '1px solid rgba(176,111,255,0.3)',
    animation: 'ping 2.5s ease-out infinite',
    width: '100%', height: '100%',
  },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, flexWrap: 'wrap' },
  pageTitle: { fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' },
  ticker: {
    background: 'rgba(255,201,74,0.07)', border: '1px solid rgba(255,201,74,0.15)',
    borderRadius: 'var(--r-sm)', padding: '10px 16px',
    fontSize: 14, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '1fr 300px',
    gap: 20, alignItems: 'start',
  },
  songsCol: { display: 'flex', flexDirection: 'column', gap: 10 },
  bidCol: { position: 'sticky', top: 76 },
  bidColVisible: {},
  bidCard: { padding: 20 },
  mobileClose: {
    display: 'none',
    position: 'absolute', top: 12, right: 12,
    background: 'var(--surface3)', border: '1px solid var(--rim)',
    borderRadius: '50%', width: 30, height: 30,
    color: 'var(--text2)', fontSize: 14, cursor: 'pointer',
    alignItems: 'center', justifyContent: 'center',
  },
  selSongBox: {
    background: 'var(--surface2)', borderRadius: 'var(--r-sm)',
    padding: '14px 16px', marginBottom: 14, border: '1px solid var(--rim)',
  },
  myBidNote: {
    fontSize: 13, color: 'var(--text2)',
    background: 'rgba(176,111,255,0.08)', border: '1px solid rgba(176,111,255,0.2)',
    borderRadius: 'var(--r-xs)', padding: '8px 12px', marginBottom: 12,
  },
  songRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 },
  rank: { width: 34, height: 34, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0, transition: 'all .3s' },
  floatingBidBtn: {
    display: 'none',
    position: 'fixed', bottom: 20, left: 0, right: 0,
    padding: '0 20px', zIndex: 100, justifyContent: 'center',
  },
};

// Responsive overrides
if (typeof document !== 'undefined') {
  const st = document.createElement('style');
  st.textContent = `
    @media(max-width: 768px) {
      .live-layout { grid-template-columns: 1fr !important; }
    }
    @media(max-width: 768px) {
      [data-bid-col] {
        position: fixed !important;
        bottom: 0 !important; left: 0 !important; right: 0 !important;
        top: auto !important;
        background: var(--surface) !important;
        border-top: 1px solid var(--rim2) !important;
        border-radius: 20px 20px 0 0 !important;
        padding: 20px !important;
        z-index: 100 !important;
        transform: translateY(100%);
        transition: transform .3s ease;
        max-height: 80vh;
        overflow-y: auto;
      }
      [data-bid-col].visible { transform: translateY(0) !important; }
      [data-floating-btn] { display: flex !important; }
      [data-mobile-close] { display: flex !important; }
    }
  `;
  document.head.appendChild(st);
}