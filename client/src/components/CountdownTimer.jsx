// components/CountdownTimer.jsx
import { useState, useEffect, useRef } from 'react';

const CountdownTimer = ({ endTime, onExpire, size: sizeProp = 120 }) => {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [total, setTotal] = useState(60);
  const [size, setSize] = useState(sizeProp);
  const expiredRef = useRef(false);
  const containerRef = useRef(null);

  // Responsive: shrink timer on tiny screens
  useEffect(() => {
    const update = () => {
      if (window.innerWidth <= 360) setSize(Math.min(sizeProp, 90));
      else if (window.innerWidth <= 480) setSize(Math.min(sizeProp, 104));
      else setSize(sizeProp);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [sizeProp]);

  useEffect(() => {
    if (!endTime) return;
    expiredRef.current = false;

    const end = new Date(endTime).getTime();

    const tick = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((end - now) / 1000));
      setSecondsLeft(remaining);
      if (remaining === 0 && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }
    };

    const initialRemaining = Math.ceil((end - Date.now()) / 1000);
    setTotal(Math.max(initialRemaining, 1));

    tick();
    const id = setInterval(tick, 500);
    return () => clearInterval(id);
  }, [endTime]);

  const radius = (size - 14) / 2;
  const circ = 2 * Math.PI * radius;
  const progress = total > 0 ? secondsLeft / total : 0;
  const offset = circ * (1 - progress);

  const isUrgent = secondsLeft <= 10 && secondsLeft > 0;
  const isDone = secondsLeft === 0;

  const strokeColor = isDone
    ? 'var(--text3)'
    : isUrgent
      ? 'var(--danger)'
      : 'var(--neon)';

  const glowFilter = isDone
    ? 'none'
    : isUrgent
      ? 'drop-shadow(0 0 8px rgba(255,79,79,0.7))'
      : 'drop-shadow(0 0 8px rgba(176,111,255,0.5))';

  const fmt = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2, '0')}` : `${s}`;
  };

  const labelSize = size > 100 ? 26 : size > 80 ? 20 : 16;

  return (
    <div
      ref={containerRef}
      className={`timer-wrap${isUrgent ? ' timer-wrap--urgent' : ''}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)', filter: glowFilter, display: 'block' }}
        aria-hidden="true"
      >
        {/* Track */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={6}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset .5s ease, stroke .3s' }}
        />
      </svg>

      <div
        className={`timer-label${isUrgent ? ' timer-urgent' : ''}`}
        style={{
          fontSize: labelSize,
          color: strokeColor,
          transition: 'color .3s, font-size .2s',
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {isDone ? '⏰' : fmt(secondsLeft)}
      </div>
    </div>
  );
};

export default CountdownTimer;