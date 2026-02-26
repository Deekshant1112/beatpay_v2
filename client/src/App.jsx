// App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import DJDashboard from './pages/DJDashboard';
import DJPlaylist from './pages/DJPlaylist';
import DJHistory from './pages/DJHistory';
import LiveBidding from './pages/LiveBidding';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to={user.role === 'dj' ? '/dj' : '/live'} replace /> : <Login />} />

          {/* DJ Routes */}
          <Route path="/dj" element={<ProtectedRoute role="dj"><DJDashboard /></ProtectedRoute>} />
          <Route path="/dj/playlist" element={<ProtectedRoute role="dj"><DJPlaylist /></ProtectedRoute>} />
          <Route path="/dj/history" element={<ProtectedRoute role="dj"><DJHistory /></ProtectedRoute>} />

          {/* User Routes */}
          <Route path="/live" element={<ProtectedRoute role="user"><LiveBidding /></ProtectedRoute>} />

          {/* Default */}
          <Route path="/" element={user ? <Navigate to={user.role === 'dj' ? '/dj' : '/live'} replace /> : <Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
