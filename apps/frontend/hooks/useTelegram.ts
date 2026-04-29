import { useEffect, useState, useCallback } from 'react';

interface TelegramUser {
    id: number;
    first_name: string;
    last_name?: string;
    username?: string;
    language_code?: string;
}

interface TelegramWebApp {
    initData: string;
    initDataUnsafe: {
        user?: TelegramUser;
        query_id?: string;
        auth_date?: number;
        hash?: string;
    };
    version: string;
    platform: string;
    colorScheme: 'light' | 'dark';
    themeParams: any;
    isExpanded: boolean;
    viewportHeight: number;
    viewportStableHeight: number;
    headerColor: string;
    backgroundColor: string;
    BackButton: {
        isVisible: boolean;
        onClick(callback: () => void): void;
        offClick(callback: () => void): void;
        show(): void;
        hide(): void;
    };
    MainButton: {
        text: string;
        color: string;
        textColor: string;
        isVisible: boolean;
        isActive: boolean;
        isProgressVisible: boolean;
        setText(text: string): void;
        onClick(callback: () => void): void;
        offClick(callback: () => void): void;
        show(): void;
        hide(): void;
        enable(): void;
        disable(): void;
        showProgress(leaveActive?: boolean): void;
        hideProgress(): void;
    };
    ready(): void;
    expand(): void;
    close(): void;
    sendData(data: string): void;
}



export function useTelegram() {
    const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
    const [user, setUser] = useState<TelegramUser | null>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const tg = window.Telegram?.WebApp;

        if (tg) {
            tg.ready();
            tg.expand();

            setWebApp(tg);
            setUser(tg.initDataUnsafe?.user || null);
            setIsReady(true);

            console.log('Telegram WebApp initialized:', {
                version: tg.version,
                platform: tg.platform,
                user: tg.initDataUnsafe?.user
            });
        } else {
            console.warn('Telegram WebApp not available');

            // For development/testing without Telegram
            const isDev = import.meta.env.DEV;
            if (isDev) {
                const mockUser: TelegramUser = {
                    id: 691131427,
                    first_name: 'Admin',
                    username: 'admin'
                };
                setUser(mockUser);
                setIsReady(true);
            }
        }
    }, []);

    const close = useCallback(() => {
        webApp?.close();
    }, [webApp]);

    const showMainButton = useCallback((text: string, onClick: () => void) => {
        if (!webApp) return;

        webApp.MainButton.setText(text);
        webApp.MainButton.onClick(onClick);
        webApp.MainButton.show();
        webApp.MainButton.enable();
    }, [webApp]);

    const hideMainButton = useCallback(() => {
        webApp?.MainButton.hide();
    }, [webApp]);

    const showBackButton = useCallback((onClick: () => void) => {
        if (!webApp) return;

        webApp.BackButton.onClick(onClick);
        webApp.BackButton.show();
    }, [webApp]);

    const hideBackButton = useCallback(() => {
        webApp?.BackButton.hide();
    }, [webApp]);

    const setMainButtonLoading = useCallback((loading: boolean) => {
        if (!webApp) return;

        if (loading) {
            webApp.MainButton.showProgress();
            webApp.MainButton.disable();
        } else {
            webApp.MainButton.hideProgress();
            webApp.MainButton.enable();
        }
    }, [webApp]);

    return {
        webApp,
        user,
        isReady,
        initData: webApp?.initData || '',
        close,
        showMainButton,
        hideMainButton,
        showBackButton,
        hideBackButton,
        setMainButtonLoading
    };
}
