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
    if (!webApp) return;

    const params = webApp.themeParams || {};
    const root = document.documentElement;
    const appBg = '#0B0F19';
    const appSecondaryBg = '#151925';
    const appTertiaryBg = '#1A1F2E';

    // Apply theme params to CSS variables
    root.style.setProperty('--tg-theme-bg-color', appBg);
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
    root.style.setProperty('--tg-theme-secondary-bg-color', appSecondaryBg);
    root.style.background = appBg;
    root.style.colorScheme = 'dark';

    // Match Telegram shell colors to the app palette
    webApp.setBackgroundColor?.(appBg);
    webApp.setHeaderColor?.(appBg);
    webApp.setBottomBarColor?.(appSecondaryBg || appTertiaryBg);

    // Keep browser fallback consistent too
    document.body.style.background = appBg;
    document.body.style.colorScheme = 'dark';
    document.body.style.backgroundColor = appBg;

    // Request fullscreen on supported clients to remove the white Telegram chrome
    if (webApp.isVersionAtLeast?.('8.0') && webApp.requestFullscreen && !webApp.isFullscreen) {
      try {
        webApp.requestFullscreen();
      } catch (e) {
        console.warn('Fullscreen request failed:', e);
      }
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
