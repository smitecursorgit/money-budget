// На localhost используем VITE_API_URL (dev backend). Production — прямой URL бэкенда.
if (!/^localhost$|^127\.0\.0\.1$/.test(window.location.hostname)) {
  window.__API_BASE_URL__ = 'https://money-budget-q2lk.onrender.com';
}
