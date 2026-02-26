// services/socket.js
import { io } from 'socket.io-client';

let socket = null;
const readyCallbacks = [];

export const initSocket = (token) => {
  if (socket) return socket;

  // Connect directly to backend port — avoids Vite proxy WebSocket issues
  const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 20,
    reconnectionDelay: 1000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id);
    readyCallbacks.forEach(cb => cb(socket));
    readyCallbacks.length = 0;
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 Socket disconnected:', reason);
  });

  socket.on('connect_error', (e) => {
    console.error('Socket error:', e.message);
  });

  return socket;
};

export const getSocket = () => socket;

// Call cb when socket is connected. If already connected, calls immediately.
export const whenConnected = (cb) => {
  if (socket?.connected) {
    cb(socket);
  } else if (socket) {
    socket.once('connect', () => cb(socket));
  } else {
    readyCallbacks.push(cb);
  }
};

export const disconnectSocket = () => {
  socket?.disconnect();
  socket = null;
  readyCallbacks.length = 0;
};