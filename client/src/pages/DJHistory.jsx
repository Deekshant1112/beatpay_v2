// pages/DJHistory.jsx
import { useState, useEffect } from 'react';
import { roundsAPI } from '../services/api';

export default function DJHistory() {
  const [rounds, setRounds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    roundsAPI.history()
      .then(({ data }) => setRounds(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const fmt = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });

  return (
    <div className="container" style={s.page}>
      <h1 style={s.title}>📜 Round History</h1>

      {loading ? (
        <div className="loading"><span className="spinner spinner-lg" /></div>
      ) : rounds.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
          <p>No rounds yet. Start your first bidding round!</p>
        </div>
      ) : (
        <div style={s.list}>
          {rounds.map(r => (
            <div key={r.id} className="card card-hover" style={s.roundCard}>
              <div style={s.top}>
                <div>
                  <span className="badge badge-purple" style={{ marginBottom: 6 }}>Round #{r.id}</span>
                  <div style={{ fontSize: 13, color: 'var(--text3)' }}>{fmt(r.start_time)}</div>
                </div>
                <span className={`badge ${r.status === 'active' ? 'badge-live' : 'badge-red'}`}>{r.status}</span>
              </div>
              {r.winner_title ? (
                <div style={s.winner}>
                  <span style={{ fontSize: 22 }}>🏆</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{r.winner_title}</div>
                    <div style={{ fontSize: 13, color: 'var(--text2)' }}>{r.winner_artist}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: 'var(--gold)', fontFamily: 'var(--font-display)', fontSize: 20 }}>
                    ₹{Number(r.winning_amount || 0).toLocaleString()}
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text3)', fontSize: 13, marginTop: 10 }}>No bids placed.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { paddingTop: 32, paddingBottom: 60, display: 'flex', flexDirection: 'column', gap: 20 },
  title: { fontSize: 30, fontWeight: 800 },
  list: { display: 'flex', flexDirection: 'column', gap: 10 },
  roundCard: { padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
  top: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  winner: { display: 'flex', alignItems: 'center', gap: 12, background: 'rgba(255,201,74,0.07)', border: '1px solid rgba(255,201,74,0.15)', borderRadius: 'var(--r-sm)', padding: '12px 16px' },
};
