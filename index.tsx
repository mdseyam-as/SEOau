import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// ==================== GLOBAL ERROR HANDLER (TEMPORARY DEBUG) ====================

// Catch unhandled errors outside React
window.onerror = function(message, source, lineno, colno, error) {
  console.error('🔴 GLOBAL ERROR:', message, source, lineno);
  
  const errorDiv = document.createElement('div');
  errorDiv.id = 'global-error-overlay';
  errorDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #1a1a2e;
    color: #ff6b6b;
    z-index: 99999;
    padding: 20px;
    overflow: auto;
    font-family: monospace;
    font-size: 12px;
  `;
  errorDiv.innerHTML = `
    <h1 style="color: #ff6b6b; margin-bottom: 10px;">💥 GLOBAL ERROR</h1>
    <p style="color: #ffd93d; margin-bottom: 5px;"><strong>Message:</strong> ${message}</p>
    <p style="color: #6bcb77; margin-bottom: 5px;"><strong>Source:</strong> ${source}</p>
    <p style="color: #4d96ff; margin-bottom: 15px;"><strong>Line:</strong> ${lineno}:${colno}</p>
    ${error?.stack ? `<pre style="background: #0f0f23; padding: 10px; border-radius: 5px; overflow: auto; color: #ff9f9f;">${error.stack}</pre>` : ''}
    <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #ff6b6b; color: white; border: none; border-radius: 5px; cursor: pointer;">
      🔄 RELOAD PAGE
    </button>
  `;
  document.body.appendChild(errorDiv);
  return true; // Prevent default error handling
};

// Catch unhandled promise rejections
window.onunhandledrejection = function(event) {
  console.error('🔴 UNHANDLED PROMISE REJECTION:', event.reason);
  
  const errorDiv = document.createElement('div');
  errorDiv.id = 'promise-error-overlay';
  errorDiv.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #1a1a2e;
    color: #ff6b6b;
    z-index: 99999;
    padding: 20px;
    overflow: auto;
    font-family: monospace;
    font-size: 12px;
  `;
  errorDiv.innerHTML = `
    <h1 style="color: #ff6b6b; margin-bottom: 10px;">💥 PROMISE REJECTION</h1>
    <p style="color: #ffd93d; margin-bottom: 15px;">${event.reason?.message || event.reason || 'Unknown error'}</p>
    ${event.reason?.stack ? `<pre style="background: #0f0f23; padding: 10px; border-radius: 5px; overflow: auto; color: #ff9f9f;">${event.reason.stack}</pre>` : ''}
    <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #ff6b6b; color: white; border: none; border-radius: 5px; cursor: pointer;">
      🔄 RELOAD PAGE
    </button>
  `;
  document.body.appendChild(errorDiv);
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
        <div style={{
          padding: 20,
          background: '#1a1a2e',
          color: '#ff6b6b',
          minHeight: '100vh',
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: 12
        }}>
          <h1 style={{ color: '#ff6b6b', marginBottom: 10 }}>💥 APP CRASHED</h1>
          
          <div style={{ background: '#0f0f23', padding: 15, borderRadius: 8, marginBottom: 15 }}>
            <h3 style={{ color: '#ffd93d', marginBottom: 10 }}>Error:</h3>
            <p style={{ color: '#ff9f9f' }}>{this.state.error?.toString()}</p>
          </div>

          {this.state.error?.stack && (
            <div style={{ background: '#0f0f23', padding: 15, borderRadius: 8, marginBottom: 15 }}>
              <h3 style={{ color: '#6bcb77', marginBottom: 10 }}>Stack Trace:</h3>
              <pre style={{ color: '#ff9f9f', overflow: 'auto', fontSize: 10 }}>
                {this.state.error.stack}
              </pre>
            </div>
          )}

          {this.state.errorInfo?.componentStack && (
            <div style={{ background: '#0f0f23', padding: 15, borderRadius: 8, marginBottom: 15 }}>
              <h3 style={{ color: '#4d96ff', marginBottom: 10 }}>Component Stack:</h3>
              <pre style={{ color: '#9f9fff', overflow: 'auto', fontSize: 10 }}>
                {this.state.errorInfo.componentStack}
              </pre>
            </div>
          )}

          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 24px',
              background: '#ff6b6b',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 'bold'
            }}
          >
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
  document.body.innerHTML = '<div style="padding:20px;color:red;font-family:monospace;">ERROR: Could not find root element</div>';
  throw new Error("Could not find root element to mount to");
}

console.log('🚀 Starting React render...');

const root = ReactDOM.createRoot(rootElement);
root.render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>
);

console.log('✅ React render initiated');
