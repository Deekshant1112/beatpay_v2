// services/api.js
import axios from 'axios';

const api = axios.create({ baseURL: '/api', headers: { 'Content-Type': 'application/json' } });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bp_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  r => r,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('bp_token');
      localStorage.removeItem('bp_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  sendOTP: (mobile) => api.post('/auth/send-otp', { mobile }),
  verifyOTP: (mobile, otp) => api.post('/auth/verify-otp', { mobile, otp }),
  setName: (name) => api.post('/auth/set-name', { name }),
  me: () => api.get('/auth/me'),
};

export const songsAPI = {
  getOwn: () => api.get('/songs'),
  getCurrent: () => api.get('/songs/current'),
  add: (data) => api.post('/songs', data),
  remove: (id) => api.delete(`/songs/${id}`),
};

export const roundsAPI = {
  getActive: () => api.get('/rounds/active'),
  start: (duration_seconds) => api.post('/rounds/start', { duration_seconds }),
  end: (id) => api.post(`/rounds/${id}/end`),
  history: () => api.get('/rounds/history'),
};

export const bidsAPI = {
  place: (song_id, amount) => api.post('/bids', { song_id, amount }),
  getMy: () => api.get('/bids/my'),
};

export default api;
