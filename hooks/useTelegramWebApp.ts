import { useEffect, useCallback } from 'react';

interface TelegramWebAppHookReturn {
  isTelegramWebApp: boolean;
  themeParams: any;
  hapticNotification: (type: 'error' | 'success' | 'warning') => void;
  hapticImpact: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
  hapticSelection: () => void;
  expandWebApp: () => void;
  ready: () => void;
  applyTheme: () => void;
}

export const useTelegramWebApp = (): TelegramWebAppHookReturn => {
  const isTelegramWebApp = !!(window as any).Telegram?.WebApp;
  const themeParams = (window as any).Telegram?.WebApp?.themeParams || {};

  // Haptic feedback - notification
  const hapticNotification = useCallback((type: 'error' | 'success' | 'warning') => {
    (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred(type);
  }, []);

  // Haptic feedback - impact
  const hapticImpact = useCallback((style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => {
    (window as any).Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
  }, []);

  // Haptic feedback - selection change
  const hapticSelection = useCallback(() => {
    (window as any).Telegram?.WebApp?.HapticFeedback?.selectionChanged();
  }, []);

  // Expand WebApp to full height
  const expandWebApp = useCallback(() => {
    (window as any).Telegram?.WebApp?.expand();
  }, []);

  // Mark WebApp as ready
  const ready = useCallback(() => {
    (window as any).Telegram?.WebApp?.ready();
  }, []);

  // Apply Telegram theme to CSS variables
  const applyTheme = useCallback(() => {
    const webApp = (window as any).Telegram?.WebApp;
    if (!webApp?.themeParams) return;

    const params = webApp.themeParams;
    const root = document.documentElement;

    // Apply theme params to CSS variables
    if (params.bg_color) {
      root.style.setProperty('--tg-theme-bg-color', params.bg_color);
    }
    if (params.text_color) {
      root.style.setProperty('--tg-theme-text-color', params.text_color);
    }
    if (params.hint_color) {
      root.style.setProperty('--tg-theme-hint-color', params.hint_color);
    }
    if (params.link_color) {
      root.style.setProperty('--tg-theme-link-color', params.link_color);
    }
    if (params.button_color) {
      root.style.setProperty('--tg-theme-button-color', params.button_color);
    }
    if (params.button_text_color) {
      root.style.setProperty('--tg-theme-button-text-color', params.button_text_color);
    }
    if (params.secondary_bg_color) {
      root.style.setProperty('--tg-theme-secondary-bg-color', params.secondary_bg_color);
    }
  }, []);

  // Initialize on mount
  useEffect(() => {
    if (isTelegramWebApp) {
      ready();
      expandWebApp();
      applyTheme();
    }
  }, [isTelegramWebApp, ready, expandWebApp, applyTheme]);

  return {
    isTelegramWebApp,
    themeParams,
    hapticNotification,
    hapticImpact,
    hapticSelection,
    expandWebApp,
    ready,
    applyTheme,
  };
};

// Utility function for easy haptic feedback
export const triggerHapticFeedback = (
  type: 'success' | 'error' | 'warning' | 'light' | 'medium' | 'heavy'
) => {
  const webApp = (window as any).Telegram?.WebApp;
  if (!webApp?.HapticFeedback) return;

  if (['success', 'error', 'warning'].includes(type)) {
    webApp.HapticFeedback.notificationOccurred(type as 'error' | 'success' | 'warning');
  } else {
    webApp.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy');
  }
};
