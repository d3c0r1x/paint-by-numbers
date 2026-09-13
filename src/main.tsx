import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { A11yProvider } from './a11y/A11yContext';

// Suppress the long-press context menu (SPEC Task 11, app container rules).
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Safari < 13-style gestures (and iOS Safari page pinch) would fight the
// app's own two-pointer zoom. Block them globally; drawing handles pointers.
document.addEventListener('gesturestart', (e) => e.preventDefault());
document.addEventListener('gesturechange', (e) => e.preventDefault());
document.addEventListener('gestureend', (e) => e.preventDefault());
// Block double-tap zoom on iOS (pointer events with detail !== 1).
document.addEventListener('dblclick', (e) => e.preventDefault());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('SW registered:', reg.scope))
      .catch((err) => console.warn('SW registration failed:', err));
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <A11yProvider>
      <App />
    </A11yProvider>
  </StrictMode>,
);
