import { describe, expect, it, beforeEach, vi } from 'vitest';

const legacyKeys = [
  'seo_gen_users_tg',
  'seo_gen_settings',
  'seo_gen_plans',
  'seo_gen_models'
];

describe('authService localStorage hygiene', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('clears legacy backend state keys on import', async () => {
    legacyKeys.forEach((key) => localStorage.setItem(key, 'legacy'));

    await import('../../services/authService');

    legacyKeys.forEach((key) => {
      expect(localStorage.getItem(key)).toBeNull();
    });
  });

  it('does not persist users, plans, or models to localStorage', async () => {
    const { authService } = await import('../../services/authService');

    authService.saveUsers([
      { telegramId: 1, firstName: 'Test', role: 'user', planId: 'free' }
    ]);
    authService.savePlans([]);
    authService.saveModels([]);

    legacyKeys.forEach((key) => {
      expect(localStorage.getItem(key)).toBeNull();
    });
  });
});
