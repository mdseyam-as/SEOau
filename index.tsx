import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Initialize Telegram WebApp
if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
  const tg = (window as any).Telegram.WebApp;
  tg.ready();
  tg.expand?.();
  console.log('✅ Telegram WebApp initialized');
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);