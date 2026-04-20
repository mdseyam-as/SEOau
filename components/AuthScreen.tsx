import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Send, Smartphone, Loader2, ServerCrash, RefreshCw } from 'lucide-react';
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
  const [serverStatus, setServerStatus] = useState<'checking' | 'online' | 'offline'>('checking');

  // Check server health on mount
  useEffect(() => {
    checkServerHealth();
  }, []);

  const checkServerHealth = async () => {
    setServerStatus('checking');
    try {
      // Simple fetch with manual timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch('/api/plans', { 
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        setServerStatus('online');
        // Only proceed with Telegram login if server is online
        if (window.Telegram?.WebApp?.initDataUnsafe?.user) {
          setIsTelegramEnv(true);
          handleTelegramLogin();
        } else {
          window.Telegram?.WebApp?.expand();
        }
      } else {
        setServerStatus('offline');
      }
    } catch (err) {
      console.error('Server health check failed:', err);
      setServerStatus('offline');
    }
  };

  const handleTelegramLogin = async () => {
    setIsLoading(true);
    try {
      const tg = window.Telegram?.WebApp;
      if (!tg?.initData) {
        throw new Error("initData пустое, Telegram WebApp не передал данные");
      }

      // Передаём initData в apiService, чтобы оно ушло в заголовке X-Telegram-Init-Data
      apiService.setInitData(tg.initData);

      // Логинимся через бэкенд (создаёт/находит юзера в PostgreSQL)
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

  const serverStatusConfig = {
    checking: {
      label: 'Проверяем backend',
      classes: 'border-amber-200 bg-amber-50 text-amber-700'
    },
    online: {
      label: 'Backend online',
      classes: 'border-emerald-200 bg-emerald-50 text-emerald-700'
    },
    offline: {
      label: 'Backend offline',
      classes: 'border-red-200 bg-red-50 text-red-600'
    }
  } as const;

  return (
    <div className="relative min-h-screen overflow-hidden bg-mesh-animated">
      <div className="absolute left-[8%] top-[14%] h-40 w-40 rounded-full bg-emerald-400/18 blur-3xl animate-pulse-slow sm:h-56 sm:w-56 lg:h-72 lg:w-72" />
      <div className="absolute bottom-[10%] right-[8%] h-40 w-40 rounded-full bg-sky-400/18 blur-3xl animate-pulse-slow delay-1000 sm:h-56 sm:w-56 lg:h-72 lg:w-72" />
      <div className="absolute inset-x-0 top-0 h-64 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.10),transparent_60%)]" />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-3 sm:p-4 lg:p-6">
        <div className="app-shell-card w-full max-w-[calc(100vw-24px)] sm:max-w-5xl p-3 sm:p-4 lg:p-5 animate-in fade-in zoom-in duration-700">
          <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
            <section className="app-dark-card relative overflow-hidden p-6 sm:p-7 lg:p-8">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.18),transparent_34%)]" />
              <div className="relative">
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] ${serverStatusConfig[serverStatus].classes}`}>
                  <span className="h-2 w-2 rounded-full bg-current opacity-80" />
                  {serverStatusConfig[serverStatus].label}
                </div>

                <div className="mt-6 flex items-start gap-4">
                  <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-[24px] border border-white/15 bg-[linear-gradient(135deg,rgba(16,185,129,0.22),rgba(56,189,248,0.18))] shadow-[0_18px_40px_rgba(16,185,129,0.18)]">
                    <div className="absolute inset-0 rounded-[24px] bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.24),transparent_58%)]" />
                    <LayoutDashboard className="relative h-7 w-7 text-white" />
                  </div>
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
                      <Send className="h-3.5 w-3.5" />
                      Telegram Mini App
                    </div>
                    <h1 className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl">
                      SEO Generator
                    </h1>
                    <p className="mt-3 max-w-lg text-sm leading-relaxed text-slate-300 sm:text-base">
                      Платформа для генерации, анализа, рерайта и SEO monitoring в одном аккуратном рабочем пространстве.
                    </p>
                  </div>
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: <Send className="h-4 w-4" />, title: 'Telegram-first', text: 'Моментальный вход и запуск внутри Mini App.' },
                    { icon: <LayoutDashboard className="h-4 w-4" />, title: 'All-in-one', text: 'Генерация, аудит, outline, SERP и monitoring.' },
                    { icon: <Smartphone className="h-4 w-4" />, title: 'Mobile-ready', text: 'Удобно пользоваться прямо с телефона.' }
                  ].map((item) => (
                    <div key={item.title} className="rounded-[22px] border border-white/10 bg-white/5 p-4 shadow-[0_12px_28px_rgba(2,6,23,0.16)] backdrop-blur-sm">
                      <div className="mb-3 inline-flex rounded-2xl border border-white/10 bg-white/10 p-2 text-emerald-300">
                        {item.icon}
                      </div>
                      <div className="text-sm font-semibold text-white">{item.title}</div>
                      <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="app-light-card p-5 sm:p-6 lg:p-8">
              <div className="app-badge mb-3">Access</div>
              <h2 className="text-2xl font-bold text-slate-900 sm:text-[2rem]">Вход в приложение</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Сначала проверяем доступность backend, затем авторизуем пользователя через Telegram или dev-вход.
              </p>

              {error && (
                <div className="mt-6 rounded-[22px] border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600 shadow-[0_12px_30px_rgba(239,68,68,0.08)] animate-in fade-in">
                  {error}
                </div>
              )}

              {serverStatus === 'offline' && (
                <div className="mt-8 text-center">
                  <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[24px] border border-red-100 bg-red-50 shadow-[0_16px_36px_rgba(239,68,68,0.10)]">
                    <ServerCrash className="h-8 w-8 text-red-500" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900">Сервер недоступен</h3>
                  <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-500">
                    Не удалось подключиться к API. Проверьте деплой или попробуйте повторить проверку через несколько секунд.
                  </p>
                  <button onClick={checkServerHealth} className="app-btn-secondary mt-6">
                    <RefreshCw className="w-4 h-4" />
                    Повторить проверку
                  </button>
                </div>
              )}

              {serverStatus === 'checking' && (
                <div className="mt-8 flex flex-col items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50/90 px-6 py-10 text-center">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-100 bg-white shadow-[0_14px_30px_rgba(16,185,129,0.10)]">
                    <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                  </div>
                  <p className="font-semibold text-slate-800">Проверяем backend…</p>
                  <p className="mt-2 text-sm text-slate-500">Это занимает несколько секунд перед авторизацией.</p>
                </div>
              )}

              {serverStatus === 'online' && (
                <>
                  {isLoading ? (
                    <div className="mt-8 flex flex-col items-center justify-center rounded-[24px] border border-slate-200 bg-slate-50/90 px-6 py-10 text-center">
                      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-100 bg-white shadow-[0_14px_30px_rgba(16,185,129,0.10)]">
                        <Loader2 className="h-6 w-6 animate-spin text-emerald-600" />
                      </div>
                      <p className="font-semibold text-slate-800">Авторизация…</p>
                      <p className="mt-2 text-sm text-slate-500">Подтверждаем доступ и загружаем ваш workspace.</p>
                    </div>
                  ) : isTelegramEnv ? (
                    <div className="mt-8 rounded-[24px] border border-emerald-100 bg-[linear-gradient(135deg,rgba(16,185,129,0.08),rgba(56,189,248,0.08))] px-6 py-10 text-center shadow-[0_18px_40px_rgba(16,185,129,0.10)]">
                      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-200 bg-white">
                        <Send className="h-6 w-6 text-emerald-600" />
                      </div>
                      <p className="font-semibold text-slate-800">Подключаем Telegram-профиль…</p>
                      <p className="mt-2 text-sm text-slate-500">Если вход не завершится автоматически, обновите Mini App.</p>
                    </div>
                  ) : (
                    <div className="mt-8 space-y-6">
                      <div className="rounded-[24px] border border-slate-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,250,252,0.88))] p-5">
                        <div className="inline-flex rounded-full border border-sky-100 bg-sky-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-sky-700">
                          Dev access
                        </div>
                        <h3 className="mt-3 text-xl font-bold text-slate-900">Вход вне Telegram</h3>
                        <p className="mt-2 text-sm leading-relaxed text-slate-500">
                          Приложение открыто не внутри Telegram. Используйте тестовый Telegram ID для dev-входа.
                        </p>
                      </div>

                      <form onSubmit={handleDevLogin} className="space-y-5">
                        <div className="space-y-2">
                          <label className="ml-1 block text-sm font-bold text-slate-700">Telegram ID</label>
                          <div className="relative">
                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                              <Smartphone className="h-5 w-5 text-slate-400" />
                            </div>
                            <input
                              type="number"
                              value={devId}
                              onChange={(e) => setDevId(e.target.value)}
                              className="app-input-light pl-12"
                              placeholder="Например: 123456789"
                              required
                            />
                          </div>
                        </div>

                        <button type="submit" disabled={isLoading} className="app-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60">
                          {isLoading ? (
                            <>
                              <Loader2 className="h-5 w-5 animate-spin" />
                              Вход...
                            </>
                          ) : (
                            <>
                              <Send className="h-4 w-4" />
                              Войти в dev-режиме
                            </>
                          )}
                        </button>
                      </form>

                      <p className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-4 py-3 text-xs leading-relaxed text-slate-500">
                        Для прав администратора добавьте Telegram ID в массив `ADMIN_IDS` в коде или выдайте роль через backend.
                      </p>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};
