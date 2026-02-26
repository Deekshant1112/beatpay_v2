// pages/DJPlaylist.jsx
import { useState, useEffect } from 'react';
import { songsAPI } from '../services/api';
import { useToast } from '../context/ToastContext';

export default function DJPlaylist() {
  const [songs, setSongs] = useState([]);
  const [form, setForm] = useState({ title: '', artist: '' });
  const [loading, setLoading] = useState(false);
  const { success, error } = useToast();

  const fetch = async () => {
    try { const { data } = await songsAPI.getOwn(); setSongs(data.data); } catch {}
  };

  useEffect(() => { fetch(); }, []);

  const add = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await songsAPI.add(form);
      success('Song added!'); setForm({ title: '', artist: '' }); fetch();
    } catch (err) { error(err.response?.data?.message || 'Failed.'); }
    finally { setLoading(false); }
  };

  const remove = async (id) => {
    try { await songsAPI.remove(id); success('Removed.'); fetch(); }
    catch { error('Failed to remove.'); }
  };

  return (
    <div className="container" style={s.page}>
      <div style={s.header}>
        <h1 style={s.title}>🎵 My Playlist</h1>
        <span className="badge badge-purple">{songs.length} songs</span>
      </div>

      {/* Add form */}
      <div className="card" style={s.formCard}>
        <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 18, color: 'var(--text2)' }}>ADD SONG</h2>
        <form onSubmit={add} style={s.form}>
          <div className="grid2">
            <div className="form-group">
              <label className="label" htmlFor="song-title">Song Title</label>
              <input id="song-title" name="song-title" className="input"
                type="text" placeholder="Blinding Lights"
                value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} required />
            </div>
            <div className="form-group">
              <label className="label" htmlFor="song-artist">Artist</label>
              <input id="song-artist" name="song-artist" className="input"
                type="text" placeholder="The Weeknd"
                value={form.artist} onChange={e => setForm(p => ({...p, artist: e.target.value}))} required />
            </div>
          </div>
          <div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? '...' : '+ Add Song'}
            </button>
          </div>
        </form>
      </div>

      {/* Songs */}
      {songs.length === 0 ? (
        <div className="empty">
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎶</div>
          <p>No songs yet. Add your first one above!</p>
        </div>
      ) : (
        <div style={s.list}>
          {songs.map((song, i) => (
            <div key={song.id} className="card card-hover" style={s.row}>
              <div style={s.num}>{i + 1}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{song.title}</div>
                <div style={{ fontSize: 13, color: 'var(--text2)' }}>{song.artist}</div>
              </div>
              <button className="btn btn-danger btn-sm" onClick={() => remove(song.id)}>Remove</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const s = {
  page: { paddingTop: 32, paddingBottom: 60, display: 'flex', flexDirection: 'column', gap: 24 },
  header: { display: 'flex', alignItems: 'center', gap: 14 },
  title: { fontSize: 30, fontWeight: 800 },
  formCard: { padding: 24 },
  form: { display: 'flex', flexDirection: 'column', gap: 14 },
  list: { display: 'flex', flexDirection: 'column', gap: 8 },
  row: { display: 'flex', alignItems: 'center', gap: 14, padding: '14px 18px' },
  num: { width: 32, height: 32, borderRadius: '50%', background: 'var(--surface3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: 'var(--text3)', flexShrink: 0 },
};
