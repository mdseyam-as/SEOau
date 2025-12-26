/**
 * useAuth Hook
 * Hook для управления авторизацией и пользователем
 */

import { useState, useEffect, useMemo } from 'react';
import { User, authService, SubscriptionPlan } from '../services/authService';
import { apiService } from '../services/apiService';

interface UseAuthReturn {
  user: User | null;
  userPlan: SubscriptionPlan | null;
  isSubscriptionActive: boolean;
  daysRemaining: number;
  dailyUsed: number;
  monthlyUsed: number;
  dailyRemaining: number | string;
  monthlyRemaining: number | string;
  handleLogin: (user: User) => void;
  handleLogout: () => void;
  loadUserPlan: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [userPlan, setUserPlan] = useState<SubscriptionPlan | null>(null);

  // Загрузка настроек при инициализации
  useEffect(() => {
    const settings = authService.getGlobalSettings();
  }, []);

  // Загрузка плана при изменении пользователя
  useEffect(() => {
    if (user && user.planId) {
      loadUserPlan();
    } else {
      setUserPlan(null);
    }
  }, [user]);

  const loadUserPlan = async () => {
    if (!user || !user.planId) return;

    try {
      const { plan } = await apiService.getPlan(user.planId);
      setUserPlan(plan);
    } catch (e) {
      console.error('Failed to load plan', e);
      const localPlan = authService.getPlanById(user.planId);
      setUserPlan(localPlan);
    }
  };

  const handleLogin = async (loggedInUser: User) => {
    setUser(loggedInUser);

    try {
      await authService.loadGlobalSettings();
    } catch (e) {
      console.error('Failed to load global settings:', e);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setUserPlan(null);
  };

  const isSubscriptionActive = useMemo(() => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.planId === 'free') return true;
    if (!user.subscriptionExpiry) return false;
    return new Date(user.subscriptionExpiry) > new Date();
  }, [user]);

  const daysRemaining = useMemo(() => {
    if (!user || !user.subscriptionExpiry) return 0;
    const diff = new Date(user.subscriptionExpiry).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [user]);

  // Расчёт использованных лимитов
  const today = new Date().toISOString().slice(0, 10);
  const dailyUsed = (user?.lastGenerationDate === today) ? (user.generationsUsedToday || 0) : 0;
  const monthlyUsed = user?.generationsUsed || 0;

  const dailyLimit = userPlan?.maxGenerationsPerDay || 0;
  const monthlyLimit = userPlan?.maxGenerationsPerMonth || 0;

  const dailyRemaining = dailyLimit === 0 ? '∞' : Math.max(0, dailyLimit - dailyUsed);
  const monthlyRemaining = monthlyLimit === 0 ? '∞' : Math.max(0, monthlyLimit - monthlyUsed);

  return {
    user,
    userPlan,
    isSubscriptionActive,
    daysRemaining,
    dailyUsed,
    monthlyUsed,
    dailyRemaining,
    monthlyRemaining,
    handleLogin,
    handleLogout,
    loadUserPlan,
  };
}
