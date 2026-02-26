// components/Navbar.jsx
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { user, logout, isDJ } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/login'); setMenuOpen(false); };
  const isActive = (path) => location.pathname === path;
  const closeMenu = () => setMenuOpen(false);

  const djLinks = [
    { to: '/dj', label: 'Dashboard' },
    { to: '/dj/playlist', label: 'Playlist' },
    { to: '/dj/history', label: 'History' },
  ];

  return (
    <>
      <nav className="navbar">
        <div className="navbar__inner container">

          {/* Logo */}
          <Link to="/" className="navbar__logo" onClick={closeMenu}>
            <span className="navbar__logo-icon">🎵</span>
            <span className="navbar__logo-text">Beat<span>Pay</span></span>
          </Link>

          {/* Desktop nav links */}
          {user && (
            <div className="navbar__links">
              {isDJ ? (
                djLinks.map(l => (
                  <Link
                    key={l.to} to={l.to}
                    className={`navbar__link${isActive(l.to) ? ' navbar__link--active' : ''}`}
                  >
                    {l.label}
                    {isActive(l.to) && <span className="navbar__link-dot" />}
                  </Link>
                ))
              ) : (
                <Link
                  to="/live"
                  className={`navbar__link${isActive('/live') ? ' navbar__link--active' : ''}`}
                >
                  <span className="live-dot" />
                  Live Bidding
                </Link>
              )}
            </div>
          )}

          {/* Right */}
          <div className="navbar__right">
            {user ? (
              <>
                {/* User pill — desktop */}
                <div className="navbar__user-pill">
                  <div className="navbar__avatar">
                    {(user.name || user.mobile)?.[0]?.toUpperCase()}
                  </div>
                  <div className="navbar__user-info">
                    <div className="navbar__user-name">{user.name || user.mobile}</div>
                    <div className="navbar__user-role">{user.role === 'dj' ? '🎧 DJ' : '👤 Club'}</div>
                  </div>
                </div>

                {/* Desktop logout */}
                <button className="btn btn-outline btn-sm navbar__logout-desktop" onClick={handleLogout}>
                  Logout
                </button>

                {/* Hamburger */}
                <button
                  className={`navbar__hamburger${menuOpen ? ' open' : ''}`}
                  onClick={() => setMenuOpen(!menuOpen)}
                  aria-label="Toggle menu"
                  aria-expanded={menuOpen}
                >
                  <span />
                  <span />
                  <span />
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm">Sign In</Link>
            )}
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && user && (
          <div className="navbar__mobile-menu">
            <div className="container navbar__mobile-inner">
              {/* User row */}
              <div className="navbar__mobile-user">
                <div className="navbar__avatar">{(user.name || user.mobile)?.[0]?.toUpperCase()}</div>
                <div>
                  <div className="navbar__user-name">{user.name || user.mobile}</div>
                  <div className="navbar__user-role">{user.role === 'dj' ? '🎧 DJ' : '👤 Club'}</div>
                </div>
              </div>

              <div className="navbar__mobile-divider" />

              {/* Nav links */}
              {isDJ ? (
                djLinks.map(l => (
                  <Link
                    key={l.to} to={l.to}
                    className={`navbar__mobile-link${isActive(l.to) ? ' active' : ''}`}
                    onClick={closeMenu}
                  >
                    {l.label}
                  </Link>
                ))
              ) : (
                <Link to="/live" className="navbar__mobile-link" onClick={closeMenu}>
                  <span className="live-dot" /> Live Bidding
                </Link>
              )}

              <div className="navbar__mobile-divider" />

              <button className="btn btn-danger btn-full btn-sm" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* Overlay behind mobile menu */}
      {menuOpen && (
        <div className="navbar__overlay" onClick={closeMenu} />
      )}

      {/* Scoped styles */}
      <style>{`
        /* ─── Shell ──────────────────────────────────── */
        .navbar {
          background: rgba(5,5,13,0.90);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          position: sticky;
          top: 0;
          z-index: 200;
        }
        .navbar__inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          height: 56px;
          gap: 12px;
        }

        /* ─── Logo ───────────────────────────────────── */
        .navbar__logo {
          display: flex;
          align-items: center;
          gap: 7px;
          text-decoration: none;
          flex-shrink: 0;
        }
        .navbar__logo-icon { font-size: 18px; }
        .navbar__logo-text {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 800;
          color: var(--text);
          letter-spacing: -0.03em;
        }
        .navbar__logo-text span { color: var(--neon); }

        /* ─── Desktop links ──────────────────────────── */
        .navbar__links {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          padding: 0 8px;
        }
        .navbar__link {
          color: var(--text2);
          font-size: 14px;
          font-weight: 500;
          padding: 6px 12px;
          border-radius: var(--r-xs);
          text-decoration: none;
          position: relative;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: color .18s;
          white-space: nowrap;
        }
        .navbar__link:hover { color: var(--text); }
        .navbar__link--active { color: var(--text); }
        .navbar__link-dot {
          position: absolute;
          bottom: 1px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px; height: 4px;
          border-radius: 50%;
          background: var(--neon);
        }
        .live-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          background: var(--neon3);
          display: inline-block;
          box-shadow: 0 0 8px var(--neon3);
          flex-shrink: 0;
          animation: pulse 2s infinite;
        }

        /* ─── Right section ──────────────────────────── */
        .navbar__right {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        /* ─── User pill ──────────────────────────────── */
        .navbar__user-pill {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--surface2);
          border: 1px solid var(--rim);
          border-radius: 40px;
          padding: 4px 12px 4px 4px;
          max-width: 160px;
          overflow: hidden;
        }
        .navbar__avatar {
          width: 28px; height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--neon), var(--neon2));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 700;
          color: #fff;
          flex-shrink: 0;
          font-family: var(--font-display);
        }
        .navbar__user-info { overflow: hidden; }
        .navbar__user-name {
          font-size: 12px;
          font-weight: 600;
          line-height: 1.2;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .navbar__user-role {
          font-size: 10px;
          color: var(--neon);
          line-height: 1;
        }

        /* ─── Desktop logout ─────────────────────────── */
        .navbar__logout-desktop { display: none; }

        /* ─── Hamburger ──────────────────────────────── */
        .navbar__hamburger {
          display: flex;
          flex-direction: column;
          justify-content: center;
          gap: 5px;
          width: 36px; height: 36px;
          background: var(--surface2);
          border: 1px solid var(--rim);
          border-radius: var(--r-xs);
          cursor: pointer;
          padding: 0 8px;
          transition: border-color .2s;
        }
        .navbar__hamburger:hover { border-color: var(--rim2); }
        .navbar__hamburger span {
          display: block;
          height: 2px;
          background: var(--text2);
          border-radius: 2px;
          transition: transform .22s ease, opacity .22s ease;
          transform-origin: center;
        }
        .navbar__hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
        .navbar__hamburger.open span:nth-child(2) { opacity: 0; transform: scaleX(0); }
        .navbar__hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

        /* ─── Mobile menu ────────────────────────────── */
        .navbar__mobile-menu {
          background: rgba(8,8,20,0.98);
          border-top: 1px solid var(--rim);
          animation: fadeIn .18s ease;
          position: relative;
          z-index: 201;
        }
        .navbar__mobile-inner {
          padding: 16px 0 20px;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .navbar__mobile-user {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 6px 4px 14px;
        }
        .navbar__mobile-divider {
          height: 1px;
          background: var(--rim);
          margin: 6px 0;
        }
        .navbar__mobile-link {
          display: flex;
          align-items: center;
          gap: 8px;
          color: var(--text2);
          font-size: 15px;
          font-weight: 500;
          padding: 11px 4px;
          text-decoration: none;
          border-radius: var(--r-xs);
          transition: color .15s;
        }
        .navbar__mobile-link:hover,
        .navbar__mobile-link.active { color: var(--text); }

        /* ─── Tap overlay ────────────────────────────── */
        .navbar__overlay {
          position: fixed;
          inset: 0;
          z-index: 199;
          background: rgba(0,0,0,0.4);
          backdrop-filter: blur(2px);
          animation: fadeIn .18s ease;
        }

        /* ─── Desktop (≥769px) ───────────────────────── */
        @media (min-width: 769px) {
          .navbar__inner { height: 62px; }
          .navbar__logo-text { font-size: 21px; }
          .navbar__user-pill { max-width: 200px; }
          .navbar__avatar { width: 30px; height: 30px; font-size: 13px; }
          .navbar__user-name { font-size: 13px; }
          .navbar__hamburger { display: none; }
          .navbar__logout-desktop { display: inline-flex; }
        }

        /* ─── Very small phones (≤360px) ────────────────*/
        @media (max-width: 360px) {
          .navbar__user-pill { max-width: 110px; }
          .navbar__user-info { display: none; }
          .navbar__user-pill { padding: 4px; }
        }
      `}</style>
    </>
  );
};

export default Navbar;