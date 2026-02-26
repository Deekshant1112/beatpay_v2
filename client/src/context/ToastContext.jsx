// context/ToastContext.jsx
import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(p => [...p, { id, msg, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000);
  }, []);

  const icons = { success: '✅', error: '❌', info: '🔔' };

  return (
    <ToastContext.Provider value={{ success: m => add(m,'success'), error: m => add(m,'error'), info: m => add(m,'info') }}>
      {children}
      <div className="toasts">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>{icons[t.type]} {t.msg}</div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
