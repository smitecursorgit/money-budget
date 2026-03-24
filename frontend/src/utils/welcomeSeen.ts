const WELCOME_SEEN_KEY = 'money-budget-welcome-seen-v2';

export function isWelcomeSeen(): boolean {
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

export function markWelcomeSeen(): void {
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, '1');
  } catch {
    /* ignore */
  }
}
