// pages/Login.jsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const STEPS = { MOBILE: 'mobile', OTP: 'otp', NAME: 'name' };

export default function Login() {
  const [step, setStep] = useState(STEPS.MOBILE);
  const [mobile, setMobile] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [devOTP, setDevOTP] = useState('');
  const otpRefs = useRef([]);
  const { loginSuccess } = useAuth();
  const { success, error } = useToast();
  const navigate = useNavigate();

  const handleSendOTP = async (e) => {
    e.preventDefault();
    if (!/^\d{10}$/.test(mobile)) { error('Enter a valid 10-digit number.'); return; }
    setLoading(true);
    try {
      const { data } = await authAPI.sendOTP(mobile);
      if (data.data?.otp) setDevOTP(data.data.otp);
      success('OTP sent!');
      setStep(STEPS.OTP);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err) {
      error(err.response?.data?.message || 'Failed to send OTP.');
    } finally { setLoading(false); }
  };

  const handleOTPChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...otp]; next[i] = val.slice(-1); setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
    const full = [...next].join('');
    if (full.length === 6) setTimeout(() => handleVerifyOTP(null, full), 50);
  };

  const handleOTPKey = (i, e) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleVerifyOTP = async (e, autoCode) => {
    e?.preventDefault();
    const code = autoCode || otp.join('');
    if (code.length !== 6) { error('Enter all 6 digits.'); return; }
    setLoading(true);
    try {
      const { data } = await authAPI.verifyOTP(mobile, code);
      const { token, user, isNewUser } = data.data;
      if (isNewUser) {
        localStorage.setItem('bp_token', token);
        localStorage.setItem('bp_user', JSON.stringify(user));
        setStep(STEPS.NAME);
      } else {
        loginSuccess(token, user);
        success(`Welcome back, ${user.name || user.mobile}!`);
        navigate(user.role === 'dj' ? '/dj' : '/live');
      }
    } catch (err) {
      error(err.response?.data?.message || 'Invalid OTP.');
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
    } finally { setLoading(false); }
  };

  const handleSetName = async (e) => {
    e.preventDefault();
    if (name.trim().length < 2) { error('At least 2 characters.'); return; }
    setLoading(true);
    try {
      const { data } = await authAPI.setName(name);
      loginSuccess(data.data.token, data.data.user);
      success(`Welcome to BeatPay, ${data.data.user.name}! 🎵`);
      navigate('/live');
    } catch { error('Failed to save name.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="login-page">
      {/* Ambient background blobs */}
      <div className="login-blob login-blob--purple" />
      <div className="login-blob login-blob--pink" />

      <div className="login-wrap">
        {/* Brand header */}
        <div className="login-brand">
          <span className="login-brand__icon">🎵</span>
          <h1 className="login-brand__name">Beat<span>Pay</span></h1>
          <p className="login-brand__sub">Live Club Song Bidding</p>
        </div>

        {/* ── STEP: Mobile ── */}
        {step === STEPS.MOBILE && (
          <div className="login-card">
            <div className="login-card__header">
              <h2 className="login-card__title">Sign in</h2>
              <p className="login-card__sub">We'll send you a one-time code</p>
            </div>

            <form onSubmit={handleSendOTP} className="login-form">
              <div className="form-group">
                <label className="label" htmlFor="mobile">Mobile Number</label>
                <div className="phone-row">
                  <span className="phone-cc">+91</span>
                  <input
                    id="mobile" name="mobile" className="input phone-input"
                    type="tel" placeholder="9876543210"
                    value={mobile}
                    onChange={e => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    maxLength={10} autoFocus autoComplete="tel"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full btn-xl"
                disabled={loading || mobile.length < 10}
              >
                {loading
                  ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Sending…</>
                  : 'Get OTP →'}
              </button>
            </form>

            <p className="login-hint">
              🎧 DJ demo: <strong style={{ color: 'var(--neon)' }}>9999999999</strong>
            </p>
          </div>
        )}

        {/* ── STEP: OTP ── */}
        {step === STEPS.OTP && (
          <div className="login-card">
            <div className="login-card__header">
              <h2 className="login-card__title">Enter the code</h2>
              <p className="login-card__sub">Sent to +91 {mobile}</p>
            </div>

            {devOTP && (
              <div className="dev-box">
                <span className="dev-box__label">DEV MODE — OTP</span>
                <strong className="dev-box__code">{devOTP}</strong>
              </div>
            )}

            <form onSubmit={handleVerifyOTP} className="login-form">
              <div className="otp-row">
                {otp.map((d, i) => (
                  <input
                    key={i}
                    ref={el => otpRefs.current[i] = el}
                    className="otp-box"
                    type="tel" maxLength={1} value={d}
                    onChange={e => handleOTPChange(i, e.target.value)}
                    onKeyDown={e => handleOTPKey(i, e)}
                    name={`otp-${i}`} id={`otp-${i}`}
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-full btn-xl"
                disabled={loading || otp.join('').length < 6}
              >
                {loading
                  ? <><span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Verifying…</>
                  : 'Verify ✓'}
              </button>

              <button
                type="button"
                className="btn btn-ghost btn-full"
                onClick={() => { setStep(STEPS.MOBILE); setOtp(['', '', '', '', '', '']); }}
              >
                ← Change number
              </button>
            </form>
          </div>
        )}

        {/* ── STEP: Name ── */}
        {step === STEPS.NAME && (
          <div className="login-card">
            <div className="login-card__header">
              <span className="login-card__emoji">👋</span>
              <h2 className="login-card__title">What's your name?</h2>
              <p className="login-card__sub">So others can see who's bidding!</p>
            </div>

            <form onSubmit={handleSetName} className="login-form">
              <div className="form-group">
                <label className="label" htmlFor="displayname">Display Name</label>
                <input
                  id="displayname" name="displayname" className="input"
                  type="text" placeholder="e.g. Rahul, Priya…"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  autoFocus autoComplete="name"
                />
              </div>

              <button
                type="submit"
                className="btn btn-pink btn-full btn-xl"
                disabled={loading || name.trim().length < 2}
              >
                {loading ? 'Saving…' : "Let's go! 🎵"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Scoped styles */}
      <style>{`
        /* ─── Page shell ─────────────────────────────── */
        .login-page {
          min-height: 100dvh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px 16px;
          position: relative;
          overflow: hidden;
          background:
            radial-gradient(circle at 20% 20%, rgba(176,111,255,0.13), transparent 45%),
            radial-gradient(circle at 80% 75%, rgba(255,79,173,0.10), transparent 45%),
            var(--ink);
        }

        /* ─── Ambient blobs ──────────────────────────── */
        .login-blob {
          position: fixed;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          z-index: 0;
        }
        .login-blob--purple {
          top: -15%;
          left: -15%;
          width: min(500px, 80vw);
          height: min(500px, 80vw);
          background: radial-gradient(circle, rgba(176,111,255,0.22) 0%, transparent 70%);
          animation: float1 14s ease-in-out infinite alternate;
        }
        .login-blob--pink {
          bottom: -15%;
          right: -15%;
          width: min(450px, 75vw);
          height: min(450px, 75vw);
          background: radial-gradient(circle, rgba(255,79,173,0.20) 0%, transparent 70%);
          animation: float2 16s ease-in-out infinite alternate;
        }

        /* ─── Content wrapper ────────────────────────── */
        .login-wrap {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
          z-index: 2;
          animation: fadeUp .35s ease both;
        }

        /* ─── Brand ──────────────────────────────────── */
        .login-brand {
          text-align: center;
        }
        .login-brand__icon {
          display: block;
          font-size: clamp(36px, 9vw, 52px);
          margin-bottom: 8px;
          filter: drop-shadow(0 0 14px rgba(176,111,255,0.55));
        }
        .login-brand__name {
          font-family: var(--font-display);
          font-size: clamp(26px, 7vw, 36px);
          font-weight: 800;
          letter-spacing: -0.04em;
          color: var(--text);
        }
        .login-brand__name span { color: var(--neon); }
        .login-brand__sub {
          color: var(--text2);
          font-size: 11px;
          letter-spacing: .14em;
          text-transform: uppercase;
          font-weight: 500;
          margin-top: 5px;
        }

        /* ─── Card ───────────────────────────────────── */
        .login-card {
          background: rgba(15,15,32,0.85);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 18px;
          padding: clamp(20px, 5vw, 28px);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          box-shadow:
            0 0 0 1px rgba(176,111,255,0.06),
            0 20px 60px rgba(0,0,0,0.55);
          animation: scaleIn .28s ease both;
        }

        .login-card__header {
          margin-bottom: 22px;
        }
        .login-card__emoji {
          display: block;
          font-size: 36px;
          margin-bottom: 8px;
        }
        .login-card__title {
          font-family: var(--font-display);
          font-size: clamp(17px, 4.5vw, 21px);
          font-weight: 700;
          color: var(--text);
          margin-bottom: 4px;
        }
        .login-card__sub {
          font-size: 13px;
          color: var(--text2);
          line-height: 1.5;
        }

        /* ─── Form ───────────────────────────────────── */
        .login-form {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        /* ─── Phone row ──────────────────────────────── */
        .phone-row {
          display: flex;
          width: 100%;
        }
        .phone-cc {
          display: flex;
          align-items: center;
          padding: 0 13px;
          background: var(--surface2);
          border: 1px solid var(--rim);
          border-right: none;
          border-radius: var(--r-sm) 0 0 var(--r-sm);
          color: var(--text2);
          font-size: 14px;
          white-space: nowrap;
          flex-shrink: 0;
        }
        .phone-input {
          border-radius: 0 var(--r-sm) var(--r-sm) 0 !important;
          border-left: none !important;
          flex: 1;
          min-width: 0;
        }

        /* ─── OTP row ────────────────────────────────── */
        .otp-row {
          display: flex;
          gap: clamp(6px, 2vw, 10px);
          justify-content: center;
        }
        .otp-box {
          width: clamp(40px, 12vw, 52px);
          height: clamp(50px, 14vw, 60px);
          text-align: center;
          font-size: clamp(20px, 5vw, 24px);
          font-weight: 700;
          background: var(--ink2);
          border: 1.5px solid var(--rim);
          border-radius: var(--r-sm);
          color: var(--text);
          transition: border-color .2s, box-shadow .2s;
          font-family: var(--font-display);
        }
        .otp-box:focus {
          outline: none;
          border-color: var(--neon);
          box-shadow: 0 0 0 3px rgba(176,111,255,0.18);
        }

        /* ─── Dev OTP box ────────────────────────────── */
        .dev-box {
          background: rgba(255,201,74,0.07);
          border: 1px dashed rgba(255,201,74,0.35);
          border-radius: 10px;
          padding: 12px 16px;
          margin-bottom: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
        }
        .dev-box__label {
          font-size: 10px;
          color: var(--text3);
          text-transform: uppercase;
          letter-spacing: .08em;
        }
        .dev-box__code {
          color: var(--gold);
          font-size: 26px;
          letter-spacing: .12em;
          font-family: var(--font-display);
          font-weight: 700;
        }

        /* ─── Hint ───────────────────────────────────── */
        .login-hint {
          text-align: center;
          font-size: 12px;
          color: var(--text3);
          margin-top: 10px;
        }

        /* ─── Tight mobile fix (≤360px) ──────────────── */
        @media (max-width: 360px) {
          .login-page { padding: 16px 12px; }
          .otp-row { gap: 5px; }
          .otp-box {
            width: 38px;
            height: 46px;
            font-size: 18px;
          }
          .login-card {
            padding: 18px 16px;
          }
        }

        /* ─── Landscape phone ─────────────────────────── */
        @media (max-height: 600px) and (orientation: landscape) {
          .login-page { align-items: flex-start; padding-top: 16px; }
          .login-blob { display: none; }
          .login-brand { margin-bottom: 0; }
          .login-brand__icon { font-size: 28px; margin-bottom: 4px; }
          .login-wrap { gap: 12px; }
        }
      `}</style>
    </div>
  );
}