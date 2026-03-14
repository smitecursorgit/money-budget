import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.reload();
    }
    return Promise.reject(err);
  }
);

export const authApi = {
  login: (initData: string) => api.post('/auth', { initData }),
};

export const voiceApi = {
  parseAudio: (blob: Blob) => {
    const extMap: Record<string, string> = {
      'audio/webm': 'webm',
      'audio/webm;codecs=opus': 'webm',
      'audio/ogg': 'ogg',
      'audio/ogg;codecs=opus': 'ogg',
      'audio/mp4': 'mp4',
      'audio/mpeg': 'mp3',
      'audio/wav': 'wav',
      'audio/m4a': 'm4a',
    };
    const ext = extMap[blob.type] || extMap[blob.type.split(';')[0]] || 'webm';
    const form = new FormData();
    form.append('audio', blob, `recording.${ext}`);
    return api.post('/voice/parse', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  parseText: (text: string) => api.post('/voice/parse-text', { text }),
};

export const transactionsApi = {
  list: (params?: Record<string, string | number>) => api.get('/transactions', { params }),
  create: (data: { amount: number; type: 'income' | 'expense'; categoryId?: string; date?: string; note?: string }) =>
    api.post('/transactions', data),
  update: (id: string, data: Partial<{ amount: number; type: string; categoryId: string; date: string; note: string }>) =>
    api.put(`/transactions/${id}`, data),
  remove: (id: string) => api.delete(`/transactions/${id}`),
};

export const categoriesApi = {
  list: () => api.get('/categories'),
  create: (data: { name: string; type: 'income' | 'expense'; keywords: string[]; icon: string; color: string }) =>
    api.post('/categories', data),
  update: (id: string, data: Partial<{ name: string; type: string; keywords: string[]; icon: string; color: string }>) =>
    api.put(`/categories/${id}`, data),
  remove: (id: string) => api.delete(`/categories/${id}`),
};

export const statsApi = {
  summary: (params?: { from?: string; to?: string }) => api.get('/stats/summary', { params }),
  byCategory: (params?: { from?: string; to?: string; type?: string }) =>
    api.get('/stats/by-category', { params }),
  monthly: (months?: number) => api.get('/stats/monthly', { params: { months } }),
};

export const remindersApi = {
  list: () => api.get('/reminders'),
  upcoming: (days?: number) => api.get('/reminders/upcoming', { params: { days } }),
  create: (data: { title: string; amount?: number; recurrence: string; nextDate: string }) =>
    api.post('/reminders', data),
  update: (id: string, data: Partial<{ title: string; amount: number; recurrence: string; nextDate: string; isActive: boolean }>) =>
    api.put(`/reminders/${id}`, data),
  remove: (id: string) => api.delete(`/reminders/${id}`),
};

export const settingsApi = {
  get: () => api.get('/settings'),
  update: (data: Partial<{ currency: string; timezone: string; periodStart: number }>) =>
    api.patch('/settings', data),
};
