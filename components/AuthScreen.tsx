import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Send, Smartphone } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-500">

        {/* Header Area */}
        <div className="bg-brand-green p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center mb-4 shadow-inner">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">SEO Generator</h1>
            <p className="text-green-100 text-sm mt-1">Telegram Mini App v2.1</p>
          </div>
        </div>

        {/* Content Area */}
        <div className="p-8">

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

              <form onSubmit={handleDevLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telegram ID (Simulated)</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Smartphone className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      value={devId}
                      onChange={(e) => setDevId(e.target.value)}
                      placeholder="Например: 123456789"
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green focus:border-transparent outline-none text-sm"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#2AABEE] hover:bg-[#229ED9] text-white font-bold py-3 rounded-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg"
                >
                  <Send className="w-4 h-4" />
                  Войти (Dev Mode)
                </button>
              </form>

              <div className="pt-4 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  Для добавления администратора, добавьте ID в массив ADMIN_IDS в коде.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};