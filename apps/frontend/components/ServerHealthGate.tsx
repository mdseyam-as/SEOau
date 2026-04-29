import React, { useState, useEffect, useCallback } from 'react';
import { ServerCrash, RefreshCw, WifiOff } from 'lucide-react';

interface ServerHealthGateProps {
  children: React.ReactNode;
}

/**
 * ServerHealthGate - monitors server health while app is running
 * Initial check is done in index.html BEFORE React loads
 * This component handles ongoing monitoring and shows offline screen if server goes down
 */
export const ServerHealthGate: React.FC<ServerHealthGateProps> = ({ children }) => {
  const [isOffline, setIsOffline] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const checkServerHealth = useCallback(async () => {
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
      
      if (response.ok) {
        setIsOffline(false);
      } else {
        setIsOffline(true);
      }
    } catch (err) {
      console.error('Server health check failed:', err);
      setIsOffline(true);
    }
  }, []);

  // Periodic health check every 30 seconds
  useEffect(() => {
    const interval = setInterval(checkServerHealth, 30000);
    return () => clearInterval(interval);
  }, [checkServerHealth]);

  const handleRetry = async () => {
    setIsChecking(true);
    await checkServerHealth();
    setIsChecking(false);
    
    // If server is back online, reload the page to get fresh state
    if (!isOffline) {
      window.location.reload();
    }
  };

  // Server went offline while using the app
  if (isOffline) {
    return (
      <div className="min-h-screen bg-mesh-animated flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700 p-8 text-center shadow-2xl">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
              <ServerCrash className="w-10 h-10 text-red-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">Сервер недоступен</h1>
            <p className="text-slate-400 mb-6">
              Соединение с сервером потеряно.<br />
              Возможно, ведутся технические работы.
            </p>
            
            <button
              onClick={handleRetry}
              disabled={isChecking}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-green hover:bg-brand-green/90 disabled:opacity-50 text-black font-semibold rounded-xl transition-all"
            >
              <RefreshCw className={`w-5 h-5 ${isChecking ? 'animate-spin' : ''}`} />
              {isChecking ? 'Проверка...' : 'Повторить попытку'}
            </button>
            
            <div className="mt-6 pt-6 border-t border-slate-700">
              <div className="flex items-center justify-center gap-2 text-slate-500 text-sm">
                <WifiOff className="w-4 h-4" />
                <span>Нет соединения с сервером</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Server is online - render children
  return <>{children}</>;
};
