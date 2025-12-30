import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ToastProvider } from './components/Toast';

// ==================== CRITICAL: SERVER CHECK BEFORE APP LOADS ====================

async function checkServerHealth(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('/health?_=' + Date.now(), {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache'
      }
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (e) {
    console.error('Server health check failed:', e);
    return false;
  }
}

function showServerOfflineScreen() {
  document.body.innerHTML = '';

  const container = document.createElement('div');
  container.id = 'server-offline-screen';
  container.innerHTML = `
    <style>
      #server-offline-screen {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, #0B0F19 0%, #1a1f2e 50%, #0B0F19 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        z-index: 999999;
      }
      .offline-card {
        background: rgba(30, 41, 59, 0.9);
        backdrop-filter: blur(20px);
        border: 1px solid rgba(71, 85, 105, 0.5);
        border-radius: 16px;
        padding: 32px;
        max-width: 380px;
        width: 90%;
        text-align: center;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
      }
      .offline-icon {
        width: 80px;
        height: 80px;
        margin: 0 auto 24px;
        background: rgba(239, 68, 68, 0.1);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .offline-icon.checking {
        background: rgba(0, 220, 130, 0.1);
        border-color: rgba(0, 220, 130, 0.3);
      }
      .offline-icon svg {
        width: 40px;
        height: 40px;
      }
      .offline-icon svg path, .offline-icon svg line {
        stroke: #f87171;
      }
      .offline-icon.checking svg path {
        stroke: #00DC82;
      }
      .spin {
        animation: spin 1s linear infinite;
      }
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }
      .offline-title {
        color: #fff;
        font-size: 24px;
        font-weight: 700;
        margin-bottom: 8px;
      }
      .offline-text {
        color: #94a3b8;
        font-size: 14px;
        line-height: 1.6;
        margin-bottom: 24px;
      }
      .offline-btn {
        width: 100%;
        padding: 14px 24px;
        background: #00DC82;
        color: #000;
        font-weight: 600;
        font-size: 15px;
        border: none;
        border-radius: 12px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: background 0.2s;
      }
      .offline-btn:hover {
        background: #00c974;
      }
      .offline-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .offline-footer {
        margin-top: 24px;
        padding-top: 24px;
        border-top: 1px solid rgba(71, 85, 105, 0.4);
        color: #64748b;
        font-size: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
      }
    </style>
    <div class="offline-card">
      <div class="offline-icon" id="offline-icon">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          <line x1="4" y1="4" x2="20" y2="20" stroke-linecap="round"/>
        </svg>
      </div>
      <h1 class="offline-title" id="offline-title">Сервер недоступен</h1>
      <p class="offline-text" id="offline-text">Не удалось подключиться к серверу.<br>Возможно, ведутся технические работы.</p>
      <button class="offline-btn" id="offline-btn">
        <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
        </svg>
        Повторить попытку
      </button>
      <div class="offline-footer">
        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 010-5.656m-7.072 7.072a9 9 0 010-12.728m3.536 3.536a4 4 0 010 5.656"/>
          <line x1="2" y1="2" x2="22" y2="22" stroke-linecap="round"/>
        </svg>
        Нет соединения с сервером
      </div>
    </div>
  `;

  document.body.appendChild(container);

  const btn = document.getElementById('offline-btn');
  const icon = document.getElementById('offline-icon');
  const title = document.getElementById('offline-title');
  const text = document.getElementById('offline-text');

  btn?.addEventListener('click', () => {
    retryServerCheck();
  });
}

async function retryServerCheck() {
  const btn = document.getElementById('offline-btn');
  const icon = document.getElementById('offline-icon');
  const title = document.getElementById('offline-title');
  const text = document.getElementById('offline-text');

  if (!btn) return;

  btn.setAttribute('disabled', 'true');
  btn.innerHTML = `
    <svg class="spin" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
    </svg>
    Проверка...
  `;
  icon?.classList.add('checking');
  if (title) title.textContent = 'Проверка...';
  if (text) text.textContent = 'Подключение к серверу...';

  const isOnline = await checkServerHealth();

  if (isOnline) {
    // Server is back online - restore the page and load app
    // First restore the original body content
    document.body.innerHTML = '<div id="root"></div>';

    // Re-apply body styles
    document.body.style.cssText = 'background: #0B0F19; margin: 0; padding: 0;';

    // Now initialize the app
    initTelegramWebApp();
    renderApp();
  } else {
    // Still offline - reset UI
    btn.removeAttribute('disabled');
    btn.innerHTML = `
      <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      Повторить попытку
    `;
    icon?.classList.remove('checking');
    if (title) title.textContent = 'Сервер недоступен';
    if (text) text.innerHTML = 'Не удалось подключиться к серверу.<br>Возможно, ведутся технические работы.';
  }
}

// ==================== FIX FOR RUSSIAN CHARACTERS IN BTOA ====================

const originalBtoa = window.btoa.bind(window);

window.btoa = (str: string): string => {
  try {
    return originalBtoa(str);
  } catch (err) {
    console.warn('[btoa polyfill] Handling non-Latin characters...');
    return originalBtoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_match, p1) =>
        String.fromCharCode(parseInt(p1, 16))
      )
    );
  }
};

// ==================== GLOBAL ERROR HANDLER ====================

function createErrorOverlay(id: string, title: string, details: { label: string; value: string; color: string }[], stack?: string) {
  const errorDiv = document.createElement('div');
  errorDiv.id = id;
  errorDiv.style.cssText = `
    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
    background: #1a1a2e; color: #ff6b6b; z-index: 99999;
    padding: 20px; overflow: auto; font-family: monospace; font-size: 12px;
  `;

  const h1 = document.createElement('h1');
  h1.style.cssText = 'color: #ff6b6b; margin-bottom: 10px;';
  h1.textContent = title;
  errorDiv.appendChild(h1);

  details.forEach(({ label, value, color }) => {
    const p = document.createElement('p');
    p.style.cssText = `color: ${color}; margin-bottom: 5px;`;
    const strong = document.createElement('strong');
    strong.textContent = `${label}: `;
    p.appendChild(strong);
    p.appendChild(document.createTextNode(String(value)));
    errorDiv.appendChild(p);
  });

  if (stack) {
    const pre = document.createElement('pre');
    pre.style.cssText = 'background: #0f0f23; padding: 10px; border-radius: 5px; overflow: auto; color: #ff9f9f; margin-top: 15px;';
    pre.textContent = stack;
    errorDiv.appendChild(pre);
  }

  const button = document.createElement('button');
  button.style.cssText = 'margin-top: 20px; padding: 10px 20px; background: #ff6b6b; color: white; border: none; border-radius: 5px; cursor: pointer;';
  button.textContent = 'RELOAD PAGE';
  button.onclick = () => window.location.reload();
  errorDiv.appendChild(button);

  document.body.appendChild(errorDiv);
}

window.onerror = function(message, source, lineno, colno, error) {
  console.error('GLOBAL ERROR:', message, source, lineno);
  createErrorOverlay('global-error-overlay', 'GLOBAL ERROR', [
    { label: 'Message', value: String(message), color: '#ffd93d' },
    { label: 'Source', value: String(source), color: '#6bcb77' },
    { label: 'Line', value: `${lineno}:${colno}`, color: '#4d96ff' }
  ], error?.stack);
  return true;
};

window.onunhandledrejection = function(event) {
  console.error('UNHANDLED PROMISE REJECTION:', event.reason);
  createErrorOverlay('promise-error-overlay', 'PROMISE REJECTION', [
    { label: 'Error', value: event.reason?.message || String(event.reason) || 'Unknown error', color: '#ffd93d' }
  ], event.reason?.stack);
};

// ==================== REACT ERROR BOUNDARY ====================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    this.setState({ error, errorInfo });
    console.error('🔴 REACT ERROR BOUNDARY CAUGHT:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 20, background: '#1a1a2e', color: '#ff6b6b', minHeight: '100vh', overflow: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
          <h1 style={{ color: '#ff6b6b', marginBottom: 10 }}>💥 APP CRASHED</h1>
          <div style={{ background: '#0f0f23', padding: 15, borderRadius: 8, marginBottom: 15 }}>
            <h3 style={{ color: '#ffd93d', marginBottom: 10 }}>Error:</h3>
            <p style={{ color: '#ff9f9f' }}>{this.state.error?.toString()}</p>
          </div>
          {this.state.error?.stack && (
            <div style={{ background: '#0f0f23', padding: 15, borderRadius: 8, marginBottom: 15 }}>
              <h3 style={{ color: '#6bcb77', marginBottom: 10 }}>Stack Trace:</h3>
              <pre style={{ color: '#ff9f9f', overflow: 'auto', fontSize: 10 }}>{this.state.error.stack}</pre>
            </div>
          )}
          <button onClick={() => window.location.reload()} style={{ padding: '12px 24px', background: '#ff6b6b', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 'bold' }}>
            🔄 RELOAD PAGE
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ==================== TELEGRAM WEBAPP INIT ====================

function initTelegramWebApp() {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    try {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand?.();
      console.log('✅ Telegram WebApp initialized');
    } catch (e) {
      console.error('❌ Telegram WebApp init failed:', e);
    }
  }
}

// ==================== RENDER REACT APP ====================

function renderApp() {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'padding:20px;color:red;font-family:monospace;';
    errorDiv.textContent = 'ERROR: Could not find root element';
    document.body.appendChild(errorDiv);
    throw new Error("Could not find root element to mount to");
  }

  console.log('🚀 Starting React render...');

  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <GlobalErrorBoundary>
      <ToastProvider>
        <App />
      </ToastProvider>
    </GlobalErrorBoundary>
  );

  console.log('✅ React render initiated');
}

// ==================== MAIN BOOTSTRAP ====================

async function bootstrap() {
  console.log('🔍 Checking server availability...');

  const isServerOnline = await checkServerHealth();

  if (!isServerOnline) {
    console.error('❌ Server is offline - blocking app load');
    showServerOfflineScreen();
    return;
  }

  console.log('✅ Server is online - loading app...');
  initTelegramWebApp();
  renderApp();
}

// Start the app
bootstrap();
