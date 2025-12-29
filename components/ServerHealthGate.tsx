import React, { useState, useEffect, useCallback } from 'react';
import { ServerCrash, RefreshCw, Wifi, WifiOff } from 'lucide-react';

interface ServerHealthGateProps {
  children: React.ReactNode;
}

type ServerStatus = 'checking' | 'online' | 'offline';

export const ServerHealthGate: React.FC<ServerHealthGateProps> = ({ children }) => {
  const [serverStatus, setServerStatus] = useState<ServerStatus>('checking');
  const [retryCount, setRetryCount] = useState(0);

  const checkServerHealth = useCallback(async () => {
    setServerStatus('checking');
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Use /health endpoint for fastest response
      const response = await fetch('/health', { 
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store' // Prevent caching
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setServerStatus('online');
      } else {
        setServerStatus('offline');
      }
    } catch (err) {
      console.error('Server health check failed:', err);
      setServerStatus('offline');
    }
  }, []);

  useEffect(() => {
    checkServerHealth();
  }, [checkServerHealth]);

  // Periodic health check every 30 seconds when online
  useEffect(() => {
    if (serverStatus === 'online') {
      const interval = setInterval(checkServerHealth, 30000);
      return () => clearInterval(interval);
    }
  }, [serverStatus, checkServerHealth]);

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    checkServerHealth();
  };

  // Server is checking
  if (serverStatus === 'checking') {
    return (
      <div className="min-h-screen bg-mesh-animated flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 relative">
            <div className="absolute inset-0 bg-brand-green/20 rounded-full animate-ping"></div>
            <div className="relative w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center border border-slate-700">
              <Wifi className="w-8 h-8 text-brand-green animate-pulse" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Подключение к серверу</h2>
          <p className="text-slate-400 text-sm">Пожалуйста, подождите...</p>
        </div>
      </div>
    );
  }

  // Server is offline
  if (serverStatus === 'offline') {
    return (
      <div className="min-h-screen bg-mesh-animated flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-slate-800/80 backdrop-blur-xl rounded-2xl border border-slate-700 p-8 text-center shadow-2xl">
            <div className="w-20 h-20 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
              <ServerCrash className="w-10 h-10 text-red-400" />
            </div>
            
            <h1 className="text-2xl font-bold text-white mb-2">Сервер недоступен</h1>
            <p className="text-slate-400 mb-6">
              Не удалось подключиться к серверу.<br />
              Возможно, ведутся технические работы.
            </p>
            
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-green hover:bg-brand-green/90 text-black font-semibold rounded-xl transition-all"
              >
                <RefreshCw className="w-5 h-5" />
                Повторить попытку
              </button>
              
              {retryCount > 2 && (
                <p className="text-xs text-slate-500">
                  Попыток: {retryCount}. Если проблема сохраняется, попробуйте позже.
                </p>
              )}
            </div>
            
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
