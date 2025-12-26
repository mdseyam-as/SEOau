import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle, XCircle, Loader2, Trash2, RefreshCw, Bell, BellOff, ExternalLink } from 'lucide-react';
import type { BackgroundTaskListItem } from '../types';

interface BackgroundTasksListProps {
  onOpenResult?: (taskId: string) => void;
}

export const BackgroundTasksList: React.FC<BackgroundTasksListProps> = ({ onOpenResult }) => {
  const [tasks, setTasks] = useState<BackgroundTaskListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  useEffect(() => {
    loadTasks();
    loadNotificationSettings();

    // Auto-refresh every 30 seconds
    const interval = setInterval(loadTasks, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadTasks = async () => {
    try {
      const response = await fetch('/api/tasks', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks || []);
      }
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadNotificationSettings = async () => {
    try {
      const response = await fetch('/api/tasks/settings/notifications', {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setNotificationsEnabled(data.notificationsEnabled);
      }
    } catch (err) {
      console.error('Failed to load notification settings:', err);
    }
  };

  const toggleNotifications = async () => {
    try {
      const response = await fetch('/api/tasks/settings/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ enabled: !notificationsEnabled })
      });

      if (response.ok) {
        setNotificationsEnabled(!notificationsEnabled);
      }
    } catch (err) {
      console.error('Failed to update notification settings:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        setTasks(tasks.filter(t => t.id !== taskId));
      }
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-slate-400" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'В очереди';
      case 'processing':
        return 'Обрабатывается';
      case 'completed':
        return 'Завершено';
      case 'failed':
        return 'Ошибка';
      default:
        return status;
    }
  };

  const getTypeText = (type: string) => {
    switch (type) {
      case 'generate':
        return 'Генерация';
      case 'rewrite':
        return 'Рерайт';
      case 'humanize':
        return 'Хьюманизация';
      default:
        return type;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-brand-green" />
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-brand-green" />
          <h3 className="font-semibold text-white">Фоновые задачи</h3>
          {tasks.filter(t => t.status === 'processing' || t.status === 'pending').length > 0 && (
            <span className="bg-yellow-500/20 text-yellow-400 text-xs px-2 py-0.5 rounded">
              {tasks.filter(t => t.status === 'processing' || t.status === 'pending').length} активных
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={toggleNotifications}
            className={`p-2 rounded-lg transition-colors ${
              notificationsEnabled
                ? 'bg-brand-green/20 text-brand-green'
                : 'bg-slate-700 text-slate-400'
            }`}
            title={notificationsEnabled ? 'Уведомления включены' : 'Уведомления выключены'}
          >
            {notificationsEnabled ? (
              <Bell className="w-4 h-4" />
            ) : (
              <BellOff className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={loadTasks}
            className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-400 hover:text-white rounded-lg transition-colors"
            title="Обновить"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tasks list */}
      {tasks.length === 0 ? (
        <div className="p-8 text-center">
          <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400">Нет фоновых задач</p>
          <p className="text-sm text-slate-500 mt-1">
            Создайте задачу генерации в фоновом режиме, чтобы продолжить работу пока текст создаётся
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-700">
          {tasks.map(task => (
            <div
              key={task.id}
              className="flex items-center gap-4 p-4 hover:bg-slate-800/30 transition-colors"
            >
              {getStatusIcon(task.status)}

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">
                    {getTypeText(task.type)}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    task.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                    task.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                    task.status === 'processing' ? 'bg-yellow-500/20 text-yellow-400' :
                    'bg-slate-700 text-slate-400'
                  }`}>
                    {getStatusText(task.status)}
                  </span>
                </div>

                <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                  <span>{formatDate(task.createdAt)}</span>
                  {task.error && (
                    <span className="text-red-400 truncate max-w-[200px]">{task.error}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {task.status === 'completed' && task.hasResult && onOpenResult && (
                  <button
                    onClick={() => onOpenResult(task.id)}
                    className="p-2 bg-brand-green/20 hover:bg-brand-green/30 text-brand-green rounded-lg transition-colors"
                    title="Открыть результат"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                )}

                {(task.status === 'completed' || task.status === 'failed') && (
                  <button
                    onClick={() => handleDeleteTask(task.id)}
                    className="p-2 text-slate-400 hover:text-red-400 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
