// localhost → VITE_API_URL (dev). Production → ВСЕГДА прямой URL (обход proxy, CORS настроен).
window.__API_BASE_URL__ = /^localhost$|^127\.0\.0\.1$/.test(window.location.hostname)
  ? undefined
  : 'https://money-budget-q2lk.onrender.com';
