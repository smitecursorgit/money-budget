// localhost → VITE_API_URL (dev). Vercel/Netlify → /api (proxy, same-origin, без CORS).
// Остальные хосты → прямой URL (Render static и т.д.).
var h = window.location.hostname;
if (!/^localhost$|^127\.0\.0\.1$/.test(h) && !/vercel\.app|netlify\.app|netlify\.com/.test(h)) {
  window.__API_BASE_URL__ = 'https://money-budget-q2lk.onrender.com';
}
