import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import './styles/index.css';

// Register service worker for reminder notifications.
// Using relative path so it works even when the app is hosted in a subfolder.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Silently ignore if registration fails (unsupported or blocked by browser).
    });
  });
}

createRoot(document.getElementById('root')!).render(<App />);
