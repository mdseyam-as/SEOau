import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { ToastProvider } from './components/Toast';

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

// ==================== RENDER ====================

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
