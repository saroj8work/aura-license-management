// Theme Management: Default is LIGHT, with toggle for DARK

export function getInitialTheme() {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('aura_theme');
  if (saved === 'dark' || saved === 'light') {
    return saved;
  }
  // User explicitly requested default light theme
  return 'light';
}

export function applyTheme(theme) {
  if (typeof document === 'undefined') return theme;
  const root = document.documentElement;
  const body = document.body;

  if (theme === 'dark') {
    root.classList.add('dark');
    if (body) {
      body.classList.add('dark');
      body.style.backgroundColor = '#020617';
      body.style.color = '#f8fafc';
    }
  } else {
    root.classList.remove('dark');
    if (body) {
      body.classList.remove('dark');
      body.style.backgroundColor = '#f8fafc';
      body.style.color = '#0f172a';
    }
  }
  try {
    localStorage.setItem('aura_theme', theme);
  } catch (e) {
    // Ignore storage quota
  }
  window.dispatchEvent(new CustomEvent('aura_theme_changed', { detail: theme }));
  return theme;
}
