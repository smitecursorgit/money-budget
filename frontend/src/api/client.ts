import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || '/api';

let loggingOut = false;

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
    // 401 — token expired or invalid, force re-auth (guard against multiple parallel 401s)
    if (err.response?.status === 401 && !loggingOut) {
      loggingOut = true;
      localStorage.removeItem('token');
      window.location.reload();
      return Promise.reject(err);
    }

    // Normalize network / timeout errors to human-readable Russian messages
    if (!err.response) {
      if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
        err.message = 'Сервер не отвечает. Проверьте интернет.';
      } else {
        err.message = 'Нет соединения с сервером.';
      }
    }

    return Promise.reject(err);
  }
);

export const authApi = {
  login: (initData: string) => api.post('/auth', { initData }),
};

export const voiceApi = {
  parseAudio: (blob: Blob) => {
    const t = (blob.type || '').toLowerCase().split(';')[0].trim();
    let ext = 'mp4'; // safe default for mobile (iOS always produces MPEG-4)
    if (t.includes('webm')) ext = 'webm';
    else if (t.includes('ogg')) ext = 'ogg';
    else if (t.includes('wav')) ext = 'wav';
    else if (t.includes('mpeg') || t.includes('mp3')) ext = 'mp3';
    else if (t.includes('mp4') || t.includes('m4a') || t === '' || t.includes('video')) ext = 'mp4';
    const form = new FormData();
    // Re-create blob with audio/mp4 type when original is video/* or empty (iOS quirk)
    const fixedBlob = (t.startsWith('video/') || t === '')
      ? new Blob([blob], { type: 'audio/mp4' })
      : blob;
    form.append('audio', fixedBlob, `recording.${ext}`);
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

export const budgetsApi = {
  list: () => api.get<import('../types').Budget[]>('/budgets'),
  create: (data: { name: string }) => api.post('/budgets', data),
  update: (id: string, data: Partial<{ name: string; initialBalance: number }>) =>
    api.patch(`/budgets/${id}`, data),
  select: (id: string) => api.post(`/budgets/${id}/select`),
  remove: (id: string) => api.delete(`/budgets/${id}`),
};
