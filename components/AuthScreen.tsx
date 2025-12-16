import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Send, Smartphone, Loader2 } from 'lucide-react';
import { apiService } from '../services/apiService';

interface AuthScreenProps {
  onLogin: (user: any) => void;
}

declare global {
  interface Window {
    Telegram: any;
  }
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [devId, setDevId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isTelegramEnv, setIsTelegramEnv] = useState(false);

  useEffect(() => {
    // Check if running inside Telegram
    if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
      setIsTelegramEnv(true);
      handleTelegramLogin();
    } else {
      // Expand WebApp just in case, though mostly for mobile
      window.Telegram?.WebApp?.expand();
    }
  }, []);

  const handleTelegramLogin = async () => {
    setIsLoading(true);
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg?.initData) {
        throw new Error("initData пустое, Telegram WebApp не передал данные");
      }

      // Передаём initData в apiService, чтобы оно ушло в заголовке X-Telegram-Init-Data
      apiService.setInitData(tg.initData);

      // Логинимся через бэкенд (создаёт/находит юзера в Mongo)
      const { user } = await apiService.login();
      onLogin(user);
    } catch (err: any) {
      setError("Ошибка авторизации через Telegram: " + (err.message || ""));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devId) return;

    setIsLoading(true);
    setError(null);

    try {
      const numericId = parseInt(devId, 10);
      if (isNaN(numericId)) {
        throw new Error('ID должен быть числом');
      }

      // Сообщаем apiService, что в dev-режиме нужно подставлять этот ID
      apiService.setDevTelegramId(numericId);

      // Логинимся через БЭКЕНД как обычно — он примет X-Dev-Telegram-Id
      const { user } = await apiService.login();
      onLogin(user);
    } catch (err: any) {
      setError(err.message || 'Ошибка dev-логина');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-mesh-animated flex items-center justify-center p-3 sm:p-4 relative overflow-hidden">
      {/* Decorative Elements - Responsive */}
      <div className="absolute top-1/4 left-1/4 w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 bg-brand-green/20 rounded-full blur-3xl animate-pulse-slow"></div>
      <div className="absolute bottom-1/4 right-1/4 w-32 h-32 sm:w-48 sm:h-48 lg:w-64 lg:h-64 bg-brand-purple/20 rounded-full blur-3xl animate-pulse-slow delay-1000"></div>

      <div className="w-full max-w-[calc(100vw-24px)] sm:max-w-md glass-card rounded-xl sm:rounded-2xl shadow-glass overflow-hidden animate-in fade-in zoom-in duration-700 relative z-10">

        {/* Header Area */}
        <div className="bg-gradient-to-br from-brand-green/90 to-emerald-600/90 p-4 sm:p-6 lg:p-8 text-center relative overflow-hidden backdrop-blur-sm">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 animate-gradient-x"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 bg-white/10 backdrop-blur-md rounded-xl sm:rounded-2xl flex items-center justify-center mb-3 sm:mb-4 shadow-glow border border-white/20 animate-float">
              <LayoutDashboard className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 text-white drop-shadow-md" />
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-white tracking-tight drop-shadow-sm">SEO Generator</h1>
            <p className="text-green-50 text-[10px] sm:text-xs lg:text-sm mt-1.5 sm:mt-2 font-medium bg-white/10 px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border border-white/10">Telegram Mini App v2.1</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-4 sm:p-6 lg:p-8 bg-white/60 backdrop-blur-md">

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center animate-in fade-in">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="w-10 h-10 border-4 border-brand-green border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-slate-600 font-medium">Авторизация...</p>
            </div>
          ) : isTelegramEnv ? (
            <div className="text-center py-8">
              <p className="text-slate-600">Подождите, идет вход через Telegram...</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-bold text-slate-800 mb-2">Вход в систему</h2>
                <p className="text-slate-500 text-sm">
                  Приложение не запущено внутри Telegram. <br />
                  Используйте симуляцию ID для входа.
                </p>
              </div>

              <form onSubmit={handleDevLogin} className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-slate-700 ml-1">Telegram ID (Dev Mode)</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Smartphone className="h-5 w-5 text-slate-400 group-focus-within:text-brand-green transition-colors" />
                    </div>
                    <input
                      type="number"
                      value={devId}
                      onChange={(e) => setDevId(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 bg-white/80 border border-slate-200 rounded-xl text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-green/50 focus:border-brand-green transition-all shadow-sm group-hover:shadow-md"
                      placeholder="Например: 123456789"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg text-sm font-bold text-white bg-gradient-to-r from-brand-green to-emerald-600 hover:from-emerald-500 hover:to-brand-green focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-green disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-glow"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                      Вход...
                    </>
                  ) : (
                    'Войти (Dev Mode)'
                  )}
                </button>
              </form>    <p className="text-xs text-gray-400">
                Для добавления администратора, добавьте ID в массив ADMIN_IDS в коде.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};