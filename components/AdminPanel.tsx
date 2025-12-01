

import React, { useState, useEffect } from 'react';
import { Shield, Plus, Check, Clock, User as UserIcon, Calendar, Settings, Save, Key, FileText, RotateCcw, Users, Edit2, X, Search, Layers, Trash2, UserPlus, CreditCard, Zap, Database, AlertOctagon, Cpu, Box, TrendingUp } from 'lucide-react';
import { authService, User, SubscriptionPlan } from '../services/authService';
import { DEFAULT_PROMPT_TEMPLATE } from '../services/geminiService';
import { AIModel, ModelConfig } from '../types';
import { apiService } from '../services/apiService';

type TabType = 'users' | 'settings' | 'plans' | 'models';

export const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [models, setModels] = useState<ModelConfig[]>([]);

  // Manual Subscription State
  const [manualTgId, setManualTgId] = useState('');
  const [manualPlanId, setManualPlanId] = useState('');
  const [manualDays, setManualDays] = useState(30);
  const [manualSuccess, setManualSuccess] = useState(false);

  // User Management State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newUserPlanId, setNewUserPlanId] = useState('');
  const [userSearch, setUserSearch] = useState('');

  // Plan Management State
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  // Model Management State
  const [isCreatingModel, setIsCreatingModel] = useState(false);
  const [newModel, setNewModel] = useState<ModelConfig>({ id: '', name: '', provider: 'Custom' });
  const [editingModelId, setEditingModelId] = useState<string | null>(null); // For inline editing

  // Settings State
  const [telegramLink, setTelegramLink] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => {
    loadData();
    const settings = authService.getGlobalSettings();
    setTelegramLink(settings.telegramLink);
    setApiKey(settings.openRouterApiKey || '');
    setSystemPrompt(settings.systemPrompt || DEFAULT_PROMPT_TEMPLATE);
  }, []);

  const loadData = async () => {
    try {
      // Load Plans (Public API)
      const { plans: loadedPlans } = await apiService.getPlans();
      setPlans(loadedPlans);

      // Load Users (Admin API)
      const { users: loadedUsers } = await apiService.getAllUsers();
      setUsers(loadedUsers);

      // Load Models (Local for now, or add API later)
      setModels(authService.getModels());

      // Set default selected plan for manual assignment
      if (!manualPlanId && loadedPlans.length > 0) {
        const defaultPlan = loadedPlans.find(p => p.isDefault) || loadedPlans[0];
        setManualPlanId(defaultPlan.id);
      }
    } catch (error) {
      console.error('Failed to load admin data:', error);
      // Fallback to local if API fails (e.g. not admin)
      // setUsers(authService.getUsers()); 
    }
  };

  const handleManualSubscription = async () => {
    if (!manualTgId) return alert('Введите Telegram ID');
    if (!manualPlanId) return alert('Выберите тариф');

    try {
      const tgId = parseInt(manualTgId.trim());
      if (isNaN(tgId)) return alert('Telegram ID должен быть числом');

      // Try to get user first
      try {
        await apiService.getUser(tgId);
        // If exists, update
        await apiService.updateUser(tgId, {
          planId: manualPlanId,
          subscriptionExpiry: new Date(Date.now() + manualDays * 86400000).toISOString()
        });
      } catch (e) {
        // If not found (404), create
        await apiService.createUser({
          telegramId: tgId,
          firstName: `User ${tgId}`,
          planId: manualPlanId,
          subscriptionExpiry: new Date(Date.now() + manualDays * 86400000).toISOString()
        });
      }

      setManualSuccess(true);
      setManualTgId('');
      loadData();

      setTimeout(() => setManualSuccess(false), 3000);
    } catch (e) {
      console.error(e);
      alert('Ошибка при выдаче подписки: ' + (e as Error).message);
    }
  };

  const handleSaveSettings = () => {
    authService.saveGlobalSettings({
      telegramLink,
      openRouterApiKey: apiKey,
      systemPrompt: systemPrompt
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2000);
  };

  const handleResetPrompt = () => {
    if (confirm('Сбросить промпт к стандартному значению?')) {
      setSystemPrompt(DEFAULT_PROMPT_TEMPLATE);
    }
  };

  // User Editing Logic
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setNewUserPlanId(user.planId || plans[0].id);
    if (user.subscriptionExpiry) {
      setNewExpiryDate(new Date(user.subscriptionExpiry).toISOString().split('T')[0]);
    } else {
      setNewExpiryDate('');
    }
  };

  const handleSaveUserSubscription = async () => {
    if (!editingUser) return;

    let updatedUser = { ...editingUser, planId: newUserPlanId };

    if (newExpiryDate) {
      const expiry = new Date(newExpiryDate);
      expiry.setHours(23, 59, 59, 999);
      updatedUser.subscriptionExpiry = expiry.toISOString();
    }

    // И ОБЯЗАТЕЛЬНО — обновляем запись в Mongo через API
    try {
      await apiService.updateUser(updatedUser.telegramId, {
        planId: updatedUser.planId,
        subscriptionExpiry: updatedUser.subscriptionExpiry,
      });

      // Reload data to reflect changes
      await loadData();
    } catch (e) {
      console.error('Failed to update user on backend', e);
      alert('Не удалось обновить пользователя в БД: ' + (e as Error).message);
    }

    setEditingUser(null);
  };

  // Plan Editing Logic
  const handleCreatePlan = () => {
    const newPlan: SubscriptionPlan = {
      id: 'plan_' + Math.random().toString(36).substr(2, 6),
      name: 'Новый тариф',
      maxChars: 5000,
      allowedModels: [models[0]?.id || AIModel.GEMINI_2_0_FLASH],
      isDefault: false,
      maxGenerationsPerMonth: 0, // 0 = Unlimited
      maxGenerationsPerDay: 0, // 0 = Unlimited
      maxKeywords: 0, // 0 = Unlimited
      canCheckSpam: false,
      canOptimizeRelevance: false
    };
    setEditingPlan(newPlan);
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;

    try {
      const existingIndex = plans.findIndex(p => p.id === editingPlan.id);

      if (existingIndex >= 0) {
        await apiService.updatePlan(editingPlan.id, editingPlan);
      } else {
        await apiService.createPlan(editingPlan);
      }

      setEditingPlan(null);
      loadData();
    } catch (e) {
      console.error(e);
      alert('Ошибка при сохранении тарифа');
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Вы уверены? Пользователи с этим тарифом могут потерять доступ.')) return;
    try {
      await apiService.deletePlan(id);
      loadData();
    } catch (e) {
      console.error(e);
      alert('Ошибка при удалении тарифа');
    }
  };

  const toggleModelInPlan = (modelId: string) => {
    if (!editingPlan) return;
    const currentModels = editingPlan.allowedModels;
    if (currentModels.includes(modelId)) {
      setEditingPlan({ ...editingPlan, allowedModels: currentModels.filter(m => m !== modelId) });
    } else {
      setEditingPlan({ ...editingPlan, allowedModels: [...currentModels, modelId] });
    }
  };

  // --- MODEL MANAGEMENT LOGIC ---

  const handleSaveModel = () => {
    if (!newModel.id || !newModel.name || !newModel.provider) {
      return alert("Все поля обязательны");
    }

    if (isCreatingModel) {
      // Check for duplicate ID
      if (models.some(m => m.id === newModel.id)) {
        return alert("Модель с таким ID уже существует");
      }
      authService.addModel(newModel);
    } else {
      authService.updateModel(newModel);
    }

    setModels(authService.getModels());
    setIsCreatingModel(false);
    setEditingModelId(null);
    setNewModel({ id: '', name: '', provider: 'Custom' });
  };

  const handleEditModel = (model: ModelConfig) => {
    setIsCreatingModel(false);
    setEditingModelId(model.id);
    setNewModel({ ...model });
  };

  const handleDeleteModel = (id: string) => {
    if (!confirm('Удалить эту модель? Она исчезнет из всех тарифов.')) return;
    authService.deleteModel(id);
    setModels(authService.getModels());
  };


  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Нет подписки';
    return new Date(isoString).toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getPlanName = (id?: string) => plans.find(p => p.id === id)?.name || 'Неизвестно';

  const isExpired = (isoString?: string | null) => {
    if (!isoString) return true;
    return new Date(isoString) < new Date();
  };

  const filteredUsers = users.filter(u =>
    u.firstName.toLowerCase().includes(userSearch.toLowerCase()) ||
    (u.username && u.username.toLowerCase().includes(userSearch.toLowerCase())) ||
    String(u.telegramId).includes(userSearch)
  );

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Shield className="w-8 h-8 text-brand-green" />
          Административная Панель
        </h2>

        {/* Tabs Navigation */}
        <div className="flex p-1 bg-gray-100 rounded-lg self-start md:self-auto overflow-x-auto max-w-full">
          <button onClick={() => setActiveTab('users')} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'users' ? 'bg-white text-brand-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Users className="w-4 h-4" /> Пользователи
          </button>
          <button onClick={() => setActiveTab('plans')} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'plans' ? 'bg-white text-brand-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Layers className="w-4 h-4" /> Тарифы
          </button>
          <button onClick={() => setActiveTab('models')} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'models' ? 'bg-white text-brand-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Cpu className="w-4 h-4" /> Модели ИИ
          </button>
          <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${activeTab === 'settings' ? 'bg-white text-brand-green shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            <Settings className="w-4 h-4" /> Настройки
          </button>
        </div>
      </div>

      {/* --- USERS TAB --- */}
      {activeTab === 'users' && (
        <div className="space-y-6">

          {/* Manual Subscription Grant */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-brand-green" /> Выдать подписку по Telegram ID
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Telegram ID</label>
                <input
                  type="number"
                  placeholder="Например: 12345678"
                  value={manualTgId}
                  onChange={(e) => setManualTgId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-green outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Тариф</label>
                <select
                  value={manualPlanId}
                  onChange={(e) => setManualPlanId(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-green outline-none"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 mb-1">Срок (дней)</label>
                <select
                  value={manualDays}
                  onChange={(e) => setManualDays(Number(e.target.value))}
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-brand-green outline-none"
                >
                  <option value={7}>7 дней</option>
                  <option value={30}>1 месяц (30 дней)</option>
                  <option value={90}>3 месяца (90 дней)</option>
                  <option value={365}>1 год (365 дней)</option>
                </select>
              </div>
              <button
                onClick={handleManualSubscription}
                className="w-full bg-brand-green hover:bg-green-700 text-white p-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2"
              >
                {manualSuccess ? <Check className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
                {manualSuccess ? 'Выдано!' : 'Выдать'}
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Если пользователь еще не заходил в приложение, будет создан аккаунт-заготовка. При первом входе имя обновится автоматически.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Список пользователей</h3>
                <p className="text-sm text-slate-500">Всего зарегистрировано: {users.length}</p>
              </div>
              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Поиск по ID или имени..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-brand-green"
                />
              </div>
            </div>

            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3">Пользователь</th>
                    <th className="px-6 py-3">Тариф</th>
                    <th className="px-6 py-3">Исп. (Мес/День)</th>
                    <th className="px-6 py-3">Подписка до</th>
                    <th className="px-6 py-3">Статус</th>
                    <th className="px-6 py-3 text-right">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-gray-400">
                        Пользователи не найдены
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => {
                      const expired = isExpired(user.subscriptionExpiry);
                      const isAdmin = user.role === 'admin';
                      const plan = plans.find(p => p.id === user.planId);

                      // Check for day reset visual only
                      const today = new Date().toISOString().slice(0, 10);
                      const usedToday = user.lastGenerationDate === today ? (user.generationsUsedToday || 0) : 0;

                      return (
                        <tr key={user.telegramId} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium text-slate-900">{user.firstName} {user.username && <span className="text-slate-500">(@{user.username})</span>}</div>
                            <div className="text-xs text-slate-400">ID: {user.telegramId}</div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium border border-gray-200">
                              {getPlanName(user.planId)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-xs font-mono flex flex-col gap-1">
                              <span>M: {user.generationsUsed || 0} / {plan?.maxGenerationsPerMonth ? plan.maxGenerationsPerMonth : '∞'}</span>
                              <span className="text-gray-400">D: {usedToday} / {plan?.maxGenerationsPerDay ? plan.maxGenerationsPerDay : '∞'}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono text-slate-600">
                            {isAdmin ? '∞' : formatDate(user.subscriptionExpiry)}
                          </td>
                          <td className="px-6 py-4">
                            {isAdmin ? (
                              <span className="inline-flex items-center gap-1 text-green-600 font-medium text-xs">
                                <Check className="w-3 h-3" /> Всегда активен
                              </span>
                            ) : expired ? (
                              <span className="inline-flex items-center gap-1 text-red-500 font-medium text-xs bg-red-50 px-2 py-1 rounded">
                                <Clock className="w-3 h-3" /> Истекла
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-green-600 font-medium text-xs bg-green-50 px-2 py-1 rounded">
                                <Check className="w-3 h-3" /> Активна
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {!isAdmin && (
                              <button
                                onClick={() => handleEditUser(user)}
                                className="text-brand-green hover:bg-green-50 p-2 rounded transition-colors"
                                title="Изменить подписку"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MODELS TAB (NEW) --- */}
      {activeTab === 'models' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Модели ИИ</h3>
              <p className="text-sm text-slate-500">Управление списком моделей доступных в приложении</p>
            </div>
            <button
              onClick={() => { setIsCreatingModel(true); setNewModel({ id: '', name: '', provider: 'Custom' }); setEditingModelId(null); }}
              className="bg-brand-green hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Добавить модель
            </button>
          </div>

          {/* Models Table/List */}
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3">Название (Display Name)</th>
                  <th className="px-6 py-3">Model ID (API String)</th>
                  <th className="px-6 py-3">Провайдер/Группа</th>
                  <th className="px-6 py-3 text-right">Действия</th>
                </tr>
              </thead>
              <tbody>
                {models.length === 0 ? (
                  <tr><td colSpan={4} className="p-6 text-center text-gray-400">Нет добавленных моделей</td></tr>
                ) : (
                  models.map((model) => (
                    <tr key={model.id} className="bg-white border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {editingModelId === model.id ? (
                          <input
                            type="text"
                            value={newModel.name}
                            onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                            className="w-full p-2 border rounded text-sm"
                            placeholder="Имя модели"
                          />
                        ) : (
                          <span className="font-bold text-slate-700">{model.name}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-slate-600">
                        {/* ID cannot be edited once created easily without re-creating, locking it for simple edit */}
                        {model.id}
                      </td>
                      <td className="px-6 py-4">
                        {editingModelId === model.id ? (
                          <input
                            type="text"
                            value={newModel.provider}
                            onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })}
                            className="w-full p-2 border rounded text-sm"
                            placeholder="Провайдер"
                          />
                        ) : (
                          <span className="inline-block px-2 py-1 bg-gray-100 rounded text-xs text-gray-600">{model.provider}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        {editingModelId === model.id ? (
                          <>
                            <button onClick={handleSaveModel} className="text-green-600 hover:bg-green-50 p-1.5 rounded"><Save className="w-4 h-4" /></button>
                            <button onClick={() => { setEditingModelId(null); setIsCreatingModel(false); }} className="text-gray-400 hover:bg-gray-100 p-1.5 rounded"><X className="w-4 h-4" /></button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => handleEditModel(model)} className="text-brand-green hover:bg-green-50 p-1.5 rounded"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDeleteModel(model.id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded"><Trash2 className="w-4 h-4" /></button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}

                {/* Creation Row */}
                {isCreatingModel && (
                  <tr className="bg-green-50/50 border-t-2 border-brand-green/20">
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={newModel.name}
                        onChange={(e) => setNewModel({ ...newModel, name: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-brand-green outline-none"
                        placeholder="Имя (напр. GPT-5)"
                        autoFocus
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={newModel.id}
                        onChange={(e) => setNewModel({ ...newModel, id: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-brand-green outline-none font-mono"
                        placeholder="API ID (openai/gpt-5)"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <input
                        type="text"
                        value={newModel.provider}
                        onChange={(e) => setNewModel({ ...newModel, provider: e.target.value })}
                        className="w-full p-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-brand-green outline-none"
                        placeholder="Провайдер (напр. OpenAI)"
                      />
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      <button onClick={handleSaveModel} className="bg-brand-green text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-green-700">Сохранить</button>
                      <button onClick={() => setIsCreatingModel(false)} className="bg-gray-200 text-gray-700 px-3 py-1.5 rounded text-xs font-bold hover:bg-gray-300">Отмена</button>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            💡 Используйте ID модели в формате OpenRouter (например: <code>openai/gpt-4o</code>, <code>google/gemini-pro-1.5</code>). <br />
            Удаление модели не удалит её из истории генераций, но она станет недоступна для новых задач и настройки тарифов.
          </p>
        </div>
      )}

      {/* --- PLANS TAB --- */}
      {activeTab === 'plans' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900">Тарифные планы</h3>
              <p className="text-sm text-slate-500">Настройка ограничений и доступа к моделям</p>
            </div>
            <button
              onClick={handleCreatePlan}
              className="bg-brand-green hover:bg-green-700 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" /> Добавить тариф
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map(plan => (
              <div key={plan.id} className="border border-gray-200 rounded-xl p-5 hover:border-brand-green transition-all relative group bg-gray-50/50">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="font-bold text-slate-800 text-lg">{plan.name}</h4>
                    {plan.isDefault && <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">Default</span>}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => setEditingPlan(plan)}
                      className="p-1.5 text-gray-500 hover:text-brand-green hover:bg-white rounded-lg transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!plan.isDefault && (
                      <button
                        onClick={() => handleDeletePlan(plan.id)}
                        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-white rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-slate-600">
                  <p className="flex justify-between">
                    <span>Лимит символов:</span>
                    <span className="font-mono font-bold">{plan.maxChars}</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Генераций/Мес:</span>
                    <span className="font-mono font-bold">
                      {plan.maxGenerationsPerMonth ? plan.maxGenerationsPerMonth : '∞'}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span>Генераций/Сутки:</span>
                    <span className="font-mono font-bold">
                      {plan.maxGenerationsPerDay ? plan.maxGenerationsPerDay : '∞'}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span>Ключей в Excel:</span>
                    <span className="font-mono font-bold">
                      {plan.maxKeywords ? plan.maxKeywords : '∞'}
                    </span>
                  </p>
                  <p className="flex justify-between items-center">
                    <span>Проверка спама:</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${plan.canCheckSpam ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {plan.canCheckSpam ? 'Включено' : 'Выключено'}
                    </span>
                  </p>
                  <p className="flex justify-between items-center">
                    <span>Улучшение (Relevance):</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${plan.canOptimizeRelevance ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {plan.canOptimizeRelevance ? 'Включено' : 'Выключено'}
                    </span>
                  </p>
                  <p className="flex justify-between">
                    <span>Доступно моделей:</span>
                    <span className="font-mono font-bold">{plan.allowedModels.length}</span>
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200">
                  <p className="text-xs text-gray-400 mb-2 font-medium uppercase">Доступные модели:</p>
                  <div className="flex flex-wrap gap-1">
                    {plan.allowedModels.slice(0, 3).map(m => {
                      // Try to find readable name from models list, fallback to ID part
                      const modelConfig = models.find(mod => mod.id === m);
                      const displayName = modelConfig ? modelConfig.name : (m.split('/')[1] || m);
                      return (
                        <span key={m} className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-600 truncate max-w-[80px]">
                          {displayName}
                        </span>
                      );
                    })}
                    {plan.allowedModels.length > 3 && (
                      <span className="text-[10px] bg-gray-200 px-1.5 py-0.5 rounded text-gray-600">+{plan.allowedModels.length - 3}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- SETTINGS TAB --- */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-slate-900">Глобальные настройки</h3>
            <button
              onClick={handleSaveSettings}
              className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-md text-sm"
            >
              {settingsSaved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {settingsSaved ? 'Сохранено' : 'Сохранить все'}
            </button>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Telegram Link */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Ссылка на Telegram (для подписки)</label>
                <input
                  type="text"
                  value={telegramLink}
                  onChange={(e) => setTelegramLink(e.target.value)}
                  placeholder="https://t.me/username"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green outline-none text-sm"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-2">
                  <Key className="w-4 h-4" /> OpenRouter API Key (Global)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-or-..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green outline-none font-mono text-sm"
                />
              </div>
            </div>

            {/* System Prompt */}
            <div className="border-t border-gray-200 pt-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Системный Промпт (Global)
                </label>
                <button
                  onClick={handleResetPrompt}
                  className="text-xs flex items-center gap-1 text-slate-500 hover:text-red-600 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" /> Сбросить
                </button>
              </div>

              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full p-4 bg-slate-50 border border-gray-300 rounded-lg text-slate-900 font-mono text-xs md:text-sm focus:ring-2 focus:ring-brand-green outline-none shadow-inner leading-relaxed h-[400px]"
                spellCheck={false}
              />
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT USER MODAL --- */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md relative">
            <button
              onClick={() => setEditingUser(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-brand-green" />
              Редактирование подписки
            </h3>

            <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-100">
              <p className="text-sm font-bold text-slate-700">{editingUser.firstName}</p>
              <p className="text-xs text-slate-500">ID: {editingUser.telegramId}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Тарифный план
                </label>
                <select
                  value={newUserPlanId}
                  onChange={(e) => setNewUserPlanId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green outline-none bg-white"
                >
                  {plans.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Действует до:
                </label>
                <input
                  type="date"
                  value={newExpiryDate}
                  onChange={(e) => setNewExpiryDate(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2.5 border border-gray-300 rounded-lg text-slate-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSaveUserSubscription}
                  className="flex-1 py-2.5 bg-brand-green text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- EDIT PLAN MODAL --- */}
      {editingPlan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-2xl relative flex flex-col max-h-[90vh]">
            <button
              onClick={() => setEditingPlan(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand-green" />
              {plans.some(p => p.id === editingPlan.id) ? 'Редактировать тариф' : 'Создать тариф'}
            </h3>

            <div className="overflow-y-auto custom-scrollbar flex-1 pr-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Название тарифа</label>
                  <input
                    type="text"
                    value={editingPlan.name}
                    onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Лимит символов</label>
                  <input
                    type="number"
                    value={editingPlan.maxChars}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxChars: parseInt(e.target.value) })}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Генераций в месяц</label>
                  <input
                    type="number"
                    value={editingPlan.maxGenerationsPerMonth || 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxGenerationsPerMonth: parseInt(e.target.value) })}
                    placeholder="0 = Безлимит"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">0 или пустое поле = Безлимит</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Генераций в сутки</label>
                  <input
                    type="number"
                    value={editingPlan.maxGenerationsPerDay || 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxGenerationsPerDay: parseInt(e.target.value) })}
                    placeholder="0 = Безлимит"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">0 или пустое поле = Безлимит</p>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2 flex items-center gap-1">
                    <Database className="w-3 h-3" /> Лимит ключей (Excel)
                  </label>
                  <input
                    type="number"
                    value={editingPlan.maxKeywords || 0}
                    onChange={(e) => setEditingPlan({ ...editingPlan, maxKeywords: parseInt(e.target.value) })}
                    placeholder="0 = Безлимит"
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-green outline-none"
                  />
                  <p className="text-xs text-gray-400 mt-1">0 = Безлимит (Загрузка всех строк)</p>
                </div>
              </div>

              <div className="mb-6 space-y-3">
                <label className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={editingPlan.canCheckSpam || false}
                    onChange={(e) => setEditingPlan({ ...editingPlan, canCheckSpam: e.target.checked })}
                    className="rounded text-brand-green focus:ring-brand-green w-5 h-5"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
                      <AlertOctagon className="w-4 h-4 text-orange-500" /> Проверка на спам
                    </span>
                    <p className="text-xs text-slate-500">
                      Разрешить пользователям этого тарифа проверять и редактировать тексты на переспам (Grok 4.1 Fast)
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={editingPlan.canOptimizeRelevance || false}
                    onChange={(e) => setEditingPlan({ ...editingPlan, canOptimizeRelevance: e.target.checked })}
                    className="rounded text-brand-green focus:ring-brand-green w-5 h-5"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-700 flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-blue-500" /> Улучшение Релевантности
                    </span>
                    <p className="text-xs text-slate-500">
                      Разрешить функцию автоматического добавления недостающих ключей
                    </p>
                  </div>
                </label>

                <label className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
                  <input
                    type="checkbox"
                    checked={editingPlan.isDefault || false}
                    onChange={(e) => setEditingPlan({ ...editingPlan, isDefault: e.target.checked })}
                    className="rounded text-brand-green focus:ring-brand-green w-5 h-5"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-700">Тариф по умолчанию</span>
                    <p className="text-xs text-slate-500">Назначается новым пользователям при регистрации</p>
                  </div>
                </label>
              </div>

              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <label className="block text-sm font-bold text-slate-700">Доступные модели</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingPlan({ ...editingPlan, allowedModels: models.map(m => m.id) })}
                      className="text-xs text-brand-green hover:underline"
                    >
                      Выбрать все
                    </button>
                    <button
                      onClick={() => setEditingPlan({ ...editingPlan, allowedModels: [] })}
                      className="text-xs text-red-500 hover:underline"
                    >
                      Сбросить
                    </button>
                  </div>
                </div>
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 max-h-60 overflow-y-auto custom-scrollbar grid grid-cols-1 md:grid-cols-2 gap-2">
                  {models.map(model => (
                    <label key={model.id} className="flex items-center gap-2 p-2 hover:bg-white rounded cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={editingPlan.allowedModels.includes(model.id)}
                        onChange={() => toggleModelInPlan(model.id)}
                        className="rounded text-brand-green focus:ring-brand-green w-4 h-4"
                      />
                      <span className="text-sm text-slate-700 truncate" title={model.id}>
                        {model.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200 mt-auto">
              <button
                onClick={() => setEditingPlan(null)}
                className="flex-1 py-3 border border-gray-300 rounded-lg text-slate-600 font-bold hover:bg-gray-50 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSavePlan}
                className="flex-1 py-3 bg-brand-green text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-sm"
              >
                Сохранить тариф
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};