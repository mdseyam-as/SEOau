import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BellRing,
  ChevronRight,
  Clock3,
  ExternalLink,
  Layers3,
  PauseCircle,
  PlayCircle,
  Plus,
  Radar,
  RefreshCw,
  ShieldAlert,
  Trash2
} from 'lucide-react';
import { DiffViewer } from './DiffViewer';
import { useToast } from './Toast';
import {
  Competitor,
  CompetitorComparison,
  CompetitorPageChange,
  CompetitorPriority,
  CompetitorWeeklySummary,
  MonitoringFrequency,
  MonitoringSeverity
} from '../types';
import { competitorWatcherService } from '../services/competitorWatcherService';

interface CompetitorWatcherPanelProps {
  projectId: string;
}

const FREQUENCY_OPTIONS: Array<{ value: MonitoringFrequency; label: string }> = [
  { value: '15m', label: 'Каждые 15 минут' },
  { value: '1h', label: 'Раз в час' },
  { value: '1d', label: 'Раз в день' }
];

const PRIORITY_OPTIONS: Array<{ value: CompetitorPriority; label: string }> = [
  { value: 'high', label: 'High priority' },
  { value: 'medium', label: 'Medium priority' },
  { value: 'low', label: 'Low priority' }
];

const severityStyles: Record<MonitoringSeverity, string> = {
  critical: 'border border-red-400/20 bg-red-500/10 text-red-300',
  warning: 'border border-amber-400/20 bg-amber-500/10 text-amber-300',
  info: 'border border-sky-400/20 bg-sky-500/10 text-sky-300'
};

export const CompetitorWatcherPanel: React.FC<CompetitorWatcherPanelProps> = ({ projectId }) => {
  const toast = useToast();
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
  const [selectedCompetitorId, setSelectedCompetitorId] = useState<string | null>(null);
  const [changeCache, setChangeCache] = useState<Record<string, CompetitorPageChange[]>>({});
  const [comparisonCache, setComparisonCache] = useState<Record<string, CompetitorComparison[]>>({});
  const [summaryCache, setSummaryCache] = useState<Record<string, CompetitorWeeklySummary>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');
  const [newPriority, setNewPriority] = useState<CompetitorPriority>('medium');
  const [newFrequency, setNewFrequency] = useState<MonitoringFrequency>('1d');
  const [newNotes, setNewNotes] = useState('');

  const selectedCompetitor = useMemo(
    () => competitors.find((competitor) => competitor.id === selectedCompetitorId) || competitors[0] || null,
    [competitors, selectedCompetitorId]
  );

  const selectedChanges = selectedCompetitor
    ? changeCache[selectedCompetitor.id] || selectedCompetitor.recentChanges || []
    : [];

  const selectedComparisons = selectedCompetitor
    ? comparisonCache[selectedCompetitor.id] || selectedCompetitor.comparisonItems || []
    : [];

  const selectedSummary = selectedCompetitor
    ? summaryCache[selectedCompetitor.id]
    : undefined;

  const stats = useMemo(() => ({
    competitors: competitors.length,
    trackedPages: competitors.reduce((sum, competitor) => sum + competitor.lastPageCount, 0),
    importantSignals: competitors.reduce((sum, competitor) => (
      sum + competitor.recentChanges.filter((change) => change.isImportant).length
    ), 0),
    topicGaps: competitors.reduce((sum, competitor) => (
      sum + competitor.comparisonItems.filter((item) => item.theirCoverage > item.ourCoverage).length
    ), 0)
  }), [competitors]);

  const formatDateTime = (value?: string | null) => {
    if (!value) return 'Еще не сканировался';
    return new Date(value).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const hydrateCompetitorCaches = (competitor: Competitor) => {
    setChangeCache((prev) => ({ ...prev, [competitor.id]: competitor.recentChanges || [] }));
    setComparisonCache((prev) => ({ ...prev, [competitor.id]: competitor.comparisonItems || [] }));
  };

  const loadCompetitors = async () => {
    setIsLoading(true);
    try {
      const loadedCompetitors = await competitorWatcherService.getCompetitors(projectId);
      setCompetitors(loadedCompetitors);
      if (loadedCompetitors.length > 0) {
        setSelectedCompetitorId((prev) => prev && loadedCompetitors.some((item) => item.id === prev) ? prev : loadedCompetitors[0].id);
        loadedCompetitors.forEach(hydrateCompetitorCaches);
      } else {
        setSelectedCompetitorId(null);
      }
    } catch (error: any) {
      toast.error('Ошибка Competitor Watcher', error.message || 'Не удалось загрузить конкурентов');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setCompetitors([]);
    setSelectedCompetitorId(null);
    setChangeCache({});
    setComparisonCache({});
    setSummaryCache({});
    loadCompetitors();
  }, [projectId]);

  useEffect(() => {
    if (!selectedCompetitor) return;

    const loadDetails = async () => {
      try {
        if (!changeCache[selectedCompetitor.id]) {
          const changes = await competitorWatcherService.getChanges(selectedCompetitor.id, 20);
          setChangeCache((prev) => ({ ...prev, [selectedCompetitor.id]: changes }));
        }

        if (!comparisonCache[selectedCompetitor.id]) {
          const comparisons = await competitorWatcherService.getComparison(selectedCompetitor.id);
          setComparisonCache((prev) => ({ ...prev, [selectedCompetitor.id]: comparisons }));
        }

        if (!summaryCache[selectedCompetitor.id]) {
          const summary = await competitorWatcherService.getWeeklySummary(selectedCompetitor.id, 7);
          setSummaryCache((prev) => ({ ...prev, [selectedCompetitor.id]: summary }));
        }
      } catch (error: any) {
        toast.error('Не удалось загрузить детали', error.message || 'Попробуйте ещё раз');
      }
    };

    loadDetails();
  }, [selectedCompetitor?.id]);

  const handleCreateCompetitor = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newUrl.trim()) return;

    setIsSubmitting(true);
    try {
      const competitor = await competitorWatcherService.createCompetitor(projectId, {
        homepageUrl: newUrl.trim(),
        name: newName.trim() || undefined,
        priority: newPriority,
        scanFrequency: newFrequency,
        notes: newNotes.trim() || undefined
      });

      setCompetitors((prev) => [competitor, ...prev]);
      setSelectedCompetitorId(competitor.id);
      hydrateCompetitorCaches(competitor);
      const summary = await competitorWatcherService.getWeeklySummary(competitor.id, 7);
      setSummaryCache((prev) => ({ ...prev, [competitor.id]: summary }));
      setNewUrl('');
      setNewName('');
      setNewPriority('medium');
      setNewFrequency('1d');
      setNewNotes('');
      toast.success('Конкурент добавлен', 'Базовый scan уже выполнен и сохранён в history.');
    } catch (error: any) {
      toast.error('Не удалось добавить конкурента', error.message || 'Проверьте адрес сайта');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCompetitor = async (competitor: Competitor) => {
    const confirmed = await toast.confirm(
      `Удалить ${competitor.name} из Competitor Watcher?`,
      'История изменений, кластеры и сравнение тоже будут удалены.'
    );
    if (!confirmed) return;

    try {
      await competitorWatcherService.deleteCompetitor(competitor.id);
      setCompetitors((prev) => prev.filter((item) => item.id !== competitor.id));
      setChangeCache((prev) => {
        const next = { ...prev };
        delete next[competitor.id];
        return next;
      });
      setComparisonCache((prev) => {
        const next = { ...prev };
        delete next[competitor.id];
        return next;
      });
      setSummaryCache((prev) => {
        const next = { ...prev };
        delete next[competitor.id];
        return next;
      });
      if (selectedCompetitorId === competitor.id) {
        setSelectedCompetitorId(null);
      }
      toast.success('Удалено', 'Конкурент больше не отслеживается.');
    } catch (error: any) {
      toast.error('Ошибка удаления', error.message || 'Не удалось удалить конкурента');
    }
  };

  const handleScanCompetitor = async (competitor: Competitor) => {
    setIsRefreshing(true);
    try {
      const result = await competitorWatcherService.scanCompetitor(competitor.id);
      setCompetitors((prev) => prev.map((item) => item.id === competitor.id ? result.competitor : item));
      setChangeCache((prev) => ({ ...prev, [competitor.id]: result.changes }));
      setComparisonCache((prev) => ({ ...prev, [competitor.id]: result.competitor.comparisonItems }));
      setSummaryCache((prev) => ({ ...prev, [competitor.id]: result.weeklySummary }));
      toast.success(
        'Scan завершен',
        result.changes.length > 0 ? result.changes[0].title : 'Сильных изменений не найдено.'
      );
    } catch (error: any) {
      toast.error('Ошибка scan', error.message || 'Не удалось просканировать конкурента');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleToggleActive = async (competitor: Competitor) => {
    try {
      const updated = await competitorWatcherService.updateCompetitor(competitor.id, { isActive: !competitor.isActive });
      setCompetitors((prev) => prev.map((item) => item.id === competitor.id ? { ...updated, recentChanges: item.recentChanges, comparisonItems: item.comparisonItems, topClusters: item.topClusters } : item));
      toast.success(competitor.isActive ? 'Сканирование приостановлено' : 'Сканирование включено');
    } catch (error: any) {
      toast.error('Ошибка', error.message || 'Не удалось обновить статус');
    }
  };

  const handleChangePriority = async (competitor: Competitor, priority: CompetitorPriority) => {
    try {
      const updated = await competitorWatcherService.updateCompetitor(competitor.id, { priority });
      setCompetitors((prev) => prev.map((item) => item.id === competitor.id ? { ...updated, recentChanges: item.recentChanges, comparisonItems: item.comparisonItems, topClusters: item.topClusters } : item));
      toast.success('Priority обновлён');
    } catch (error: any) {
      toast.error('Ошибка', error.message || 'Не удалось обновить priority');
    }
  };

  const handleChangeFrequency = async (competitor: Competitor, scanFrequency: MonitoringFrequency) => {
    try {
      const updated = await competitorWatcherService.updateCompetitor(competitor.id, { scanFrequency });
      setCompetitors((prev) => prev.map((item) => item.id === competitor.id ? { ...updated, recentChanges: item.recentChanges, comparisonItems: item.comparisonItems, topClusters: item.topClusters } : item));
      toast.success('Частота scan обновлена');
    } catch (error: any) {
      toast.error('Ошибка', error.message || 'Не удалось обновить частоту');
    }
  };

  return (
    <div className="space-y-5">
      <section className="app-dark-card p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
              Competitor Watcher
            </div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
              <Radar className="w-5 h-5 text-emerald-300" />
              Growth Intelligence по конкурентам
            </h3>
            <p className="text-slate-300 text-sm mt-2 max-w-3xl leading-relaxed">
              Ловим новые URL, изменения title/H1/FAQ/структуры, ищем новые кластеры и показываем,
              где у конкурента покрытие тем уже сильнее нашего.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-full lg:min-w-[500px]">
            <SummaryCard label="Competitors" value={String(stats.competitors)} icon={<Radar className="w-4 h-4" />} />
            <SummaryCard label="Pages" value={String(stats.trackedPages)} icon={<Activity className="w-4 h-4" />} />
            <SummaryCard label="Signals" value={String(stats.importantSignals)} icon={<ShieldAlert className="w-4 h-4" />} />
            <SummaryCard label="Gaps" value={String(stats.topicGaps)} icon={<Layers3 className="w-4 h-4" />} />
          </div>
        </div>

        <form onSubmit={handleCreateCompetitor} className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-3">
          <input
            type="url"
            value={newUrl}
            onChange={(event) => setNewUrl(event.target.value)}
            placeholder="https://competitor.com"
            className="app-input-dark lg:col-span-4"
          />
          <input
            type="text"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            placeholder="Имя конкурента"
            className="app-input-dark lg:col-span-2"
          />
          <select
            value={newPriority}
            onChange={(event) => setNewPriority(event.target.value as CompetitorPriority)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-all focus:border-brand-green/40 focus:ring-4 focus:ring-brand-green/10 [&>option]:text-slate-900 lg:col-span-2"
          >
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select
            value={newFrequency}
            onChange={(event) => setNewFrequency(event.target.value as MonitoringFrequency)}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition-all focus:border-brand-green/40 focus:ring-4 focus:ring-brand-green/10 [&>option]:text-slate-900 lg:col-span-2"
          >
            {FREQUENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="app-btn-primary lg:col-span-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </button>
          <textarea
            value={newNotes}
            onChange={(event) => setNewNotes(event.target.value)}
            placeholder="Заметки: что особенно важно отслеживать у этого конкурента"
            className="app-input-dark min-h-[96px] lg:col-span-12"
          />
        </form>
      </section>

      {isLoading ? (
        <div className="app-dark-card p-8 text-center text-slate-300">Загружаю Competitor Watcher…</div>
      ) : competitors.length === 0 ? (
        <div className="app-dark-card p-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-[24px] border border-emerald-400/20 bg-[linear-gradient(135deg,rgba(16,185,129,0.18),rgba(56,189,248,0.10))] shadow-[0_14px_34px_rgba(16,185,129,0.10)]">
            <Radar className="w-8 h-8 text-emerald-300" />
          </div>
          <h4 className="text-white font-semibold text-lg">Пока нет конкурентов в отслеживании</h4>
          <p className="text-slate-300 text-sm mt-2 leading-relaxed">
            Добавьте домен конкурента, и модуль снимет baseline, найдёт страницы и начнёт ловить стратегические изменения.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
          <section className="xl:col-span-4 space-y-4">
            {competitors.map((competitor) => {
              const isActive = selectedCompetitor?.id === competitor.id;
              const importantCount = (changeCache[competitor.id] || competitor.recentChanges || []).filter((change) => change.isImportant).length;

              return (
                <button
                  key={competitor.id}
                  type="button"
                  onClick={() => setSelectedCompetitorId(competitor.id)}
                  className={`w-full text-left rounded-[24px] border p-4 transition-all ${
                    isActive
                      ? 'border-emerald-400/30 bg-emerald-500/10 shadow-[0_18px_40px_rgba(16,185,129,0.12)]'
                      : 'border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/[0.07]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${severityStyles[(competitor.lastSeverity || 'info') as MonitoringSeverity]}`}>
                          {competitor.lastSeverity || 'info'}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${competitor.isActive ? 'bg-emerald-500/10 text-emerald-300 border-emerald-400/20' : 'bg-white/5 text-slate-300 border-white/10'}`}>
                          {competitor.isActive ? 'Активен' : 'Пауза'}
                        </span>
                      </div>
                      <div className="mt-3 text-white font-bold text-lg truncate">{competitor.name}</div>
                      <div className="mt-1 text-sm text-emerald-200/90 break-all">{competitor.domain}</div>
                    </div>
                    <ChevronRight className={`w-5 h-5 shrink-0 ${isActive ? 'text-emerald-300' : 'text-slate-500'}`} />
                  </div>

                  <div className="grid grid-cols-3 gap-3 mt-4">
                    <CompactMetric label="Pages" value={String(competitor.lastPageCount)} />
                    <CompactMetric label="Signals" value={String(importantCount)} />
                    <CompactMetric label="Clusters" value={String(competitor.lastClusterCount)} />
                  </div>

                  <div className="mt-4 text-xs text-slate-300 leading-relaxed">
                    {competitor.lastSummary || 'Baseline scan сохранён. Ждём новых стратегических сдвигов.'}
                  </div>
                  <div className="mt-3 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                    Последний scan: {formatDateTime(competitor.lastScannedAt)}
                  </div>
                </button>
              );
            })}
          </section>

          <section className="xl:col-span-8 space-y-4">
            {selectedCompetitor && (
              <>
                <div className="app-dark-card p-4 sm:p-5">
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${severityStyles[(selectedCompetitor.lastSeverity || 'info') as MonitoringSeverity]}`}>
                          {selectedCompetitor.lastSeverity || 'info'}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-300 border border-white/10">
                          {PRIORITY_OPTIONS.find((option) => option.value === selectedCompetitor.priority)?.label}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-300 border border-white/10">
                          {FREQUENCY_OPTIONS.find((option) => option.value === selectedCompetitor.scanFrequency)?.label}
                        </span>
                      </div>
                      <h4 className="mt-3 text-2xl font-bold text-white">{selectedCompetitor.name}</h4>
                      <a
                        href={selectedCompetitor.homepageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex items-center gap-1.5 text-sm text-emerald-300 hover:text-emerald-200"
                      >
                        {selectedCompetitor.homepageUrl}
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <p className="mt-3 text-sm text-slate-300 leading-relaxed">
                        {selectedCompetitor.notes || selectedCompetitor.lastSummary || 'Модуль отслеживает URL-level изменения, контентные сдвиги, кластеры и gaps по темам.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:w-[340px] lg:justify-end">
                      <select
                        value={selectedCompetitor.priority}
                        onChange={(event) => handleChangePriority(selectedCompetitor, event.target.value as CompetitorPriority)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white [&>option]:text-slate-900"
                      >
                        {PRIORITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <select
                        value={selectedCompetitor.scanFrequency}
                        onChange={(event) => handleChangeFrequency(selectedCompetitor, event.target.value as MonitoringFrequency)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white [&>option]:text-slate-900"
                      >
                        {FREQUENCY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => handleScanCompetitor(selectedCompetitor)}
                        className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-300 flex items-center gap-2 transition-colors hover:bg-emerald-500/15"
                        disabled={isRefreshing}
                      >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Scan сейчас
                      </button>
                      <button
                        onClick={() => handleToggleActive(selectedCompetitor)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 flex items-center gap-2 transition-colors hover:bg-white/10"
                      >
                        {selectedCompetitor.isActive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                        {selectedCompetitor.isActive ? 'Пауза' : 'Включить'}
                      </button>
                      <button
                        onClick={() => handleDeleteCompetitor(selectedCompetitor)}
                        className="rounded-2xl border border-red-400/20 bg-red-500/10 px-3 py-2 text-sm font-semibold text-red-300 flex items-center gap-2 transition-colors hover:bg-red-500/15"
                      >
                        <Trash2 className="w-4 h-4" />
                        Удалить
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-5">
                    <SummaryCard label="Последний scan" value={selectedCompetitor.lastScannedAt ? formatDateTime(selectedCompetitor.lastScannedAt) : '—'} icon={<Clock3 className="w-4 h-4" />} />
                    <SummaryCard label="Pages" value={String(selectedCompetitor.lastPageCount)} icon={<Activity className="w-4 h-4" />} />
                    <SummaryCard label="Changes" value={String(selectedCompetitor.lastChangeCount)} icon={<AlertTriangle className="w-4 h-4" />} />
                    <SummaryCard label="Clusters" value={String(selectedCompetitor.lastClusterCount)} icon={<Layers3 className="w-4 h-4" />} />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <section className="app-dark-card p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-white font-semibold text-lg">
                      <BellRing className="w-5 h-5 text-emerald-300" />
                      Weekly Summary
                    </div>
                    <p className="text-slate-300 text-sm mt-3">
                      {selectedSummary?.headline || 'Собираю недельную выжимку по конкуренту…'}
                    </p>
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <CompactMetric label="Critical" value={String(selectedSummary?.metrics.criticalChanges || 0)} />
                      <CompactMetric label="New pages" value={String(selectedSummary?.metrics.newPages || 0)} />
                      <CompactMetric label="New clusters" value={String(selectedSummary?.metrics.newClusters || 0)} />
                      <CompactMetric label="Topic gaps" value={String(selectedSummary?.metrics.topicGaps || 0)} />
                    </div>
                    <div className="space-y-2 mt-4">
                      {(selectedSummary?.bullets || []).map((bullet, index) => (
                        <div key={`${selectedCompetitor.id}-bullet-${index}`} className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-200">
                          {bullet}
                        </div>
                      ))}
                    </div>
                    {selectedSummary?.llmModel && (
                      <div className="mt-4 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                        LLM: {selectedSummary.llmModel}
                      </div>
                    )}
                  </section>

                  <section className="app-dark-card p-4 sm:p-5">
                    <div className="flex items-center gap-2 text-white font-semibold text-lg">
                      <Layers3 className="w-5 h-5 text-emerald-300" />
                      Topic Clusters
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedCompetitor.topClusters.length === 0 ? (
                        <div className="text-sm text-slate-300">Кластеры появятся после накопления страниц и тем.</div>
                      ) : (
                        selectedCompetitor.topClusters.map((cluster) => (
                          <div key={cluster.id} className="rounded-[20px] border border-white/10 bg-white/5 px-3 py-3 min-w-[180px]">
                            <div className="text-white font-semibold">{cluster.name}</div>
                            <div className="mt-1 text-xs text-slate-400 uppercase tracking-wide">{cluster.pageCount} pages</div>
                            <div className="mt-2 text-sm text-slate-300">
                              {cluster.keywords.slice(0, 4).join(', ') || 'Ключи появятся после следующего scan'}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>

                <section className="app-dark-card p-4 sm:p-5">
                  <div className="flex items-center gap-2 text-white font-semibold text-lg">
                    <Radar className="w-5 h-5 text-emerald-300" />
                    Мы vs Они
                  </div>
                  <div className="space-y-3 mt-4">
                    {selectedComparisons.length === 0 ? (
                      <div className="text-sm text-slate-300">Сравнение тем появится после baseline scan и анализа покрытий.</div>
                    ) : (
                      selectedComparisons.slice(0, 8).map((comparison) => (
                        <div key={comparison.id} className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                            <div>
                              <div className="text-white font-semibold">{comparison.theirTopic}</div>
                              <div className="text-sm text-slate-300 mt-1">{comparison.gapSummary}</div>
                            </div>
                            <div className="flex items-center gap-2 text-xs uppercase tracking-wide">
                              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-slate-300">
                                Они: {comparison.theirCoverage}
                              </span>
                              <span className={`rounded-full border px-2.5 py-1 ${comparison.theirCoverage > comparison.ourCoverage ? 'border-amber-400/20 bg-amber-500/10 text-amber-300' : 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'}`}>
                                Мы: {comparison.ourCoverage}
                              </span>
                            </div>
                          </div>
                          <div className="mt-3 rounded-[18px] border border-white/10 bg-black/10 px-3 py-3 text-sm text-slate-200">
                            {comparison.recommendation}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="space-y-4">
                  {selectedChanges.length === 0 ? (
                    <div className="app-dark-card p-6 text-sm text-slate-300">
                      Сильных изменений пока не зафиксировано. Baseline уже сохранён, модуль ждёт следующий meaningful shift.
                    </div>
                  ) : (
                    selectedChanges.map((change) => (
                      <CompetitorChangeCard key={change.id} change={change} />
                    ))
                  )}
                </section>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-4 shadow-[0_12px_30px_rgba(2,6,23,0.18)]">
    <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide">
      {icon}
      {label}
    </div>
    <div className="text-white text-lg sm:text-xl font-bold mt-1 break-words">{value}</div>
  </div>
);

const CompactMetric: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3">
    <div className="text-[11px] uppercase tracking-[0.16em] text-slate-400">{label}</div>
    <div className="mt-1 text-white font-semibold">{value}</div>
  </div>
);

const MetaCell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-[20px] border border-white/10 bg-white/5 px-3 py-3">
    <div className="text-slate-400 text-xs uppercase tracking-wide">{label}</div>
    <div className="text-white mt-1 break-words whitespace-pre-wrap">{value}</div>
  </div>
);

const CompetitorChangeCard: React.FC<{ change: CompetitorPageChange }> = ({ change }) => {
  const topChange = change.diff?.changes?.[0];
  const contentChange = change.diff?.changes?.find((item) => item.type === 'content');

  const shortValue = (value?: string | null) => {
    if (!value) return '—';
    return value.length > 220 ? `${value.slice(0, 219)}…` : value;
  };

  return (
    <article className="app-dark-card overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${severityStyles[change.severity]}`}>
                {change.severity}
              </span>
              {change.isImportant && (
                <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide border border-emerald-400/20 bg-emerald-500/10 text-emerald-300">
                  Important
                </span>
              )}
            </div>
            <h5 className="text-white font-bold text-lg mt-3">{change.title}</h5>
            <p className="text-slate-300 text-sm mt-2 leading-relaxed">{change.summary}</p>
          </div>
          <div className="text-sm text-slate-300 flex items-center gap-2 whitespace-nowrap">
            <Clock3 className="w-4 h-4" />
            {new Date(change.detectedAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          <MetaCell label="URL" value={change.url} />
          <MetaCell label="Change" value={topChange?.changed || change.changeType} />
          <MetaCell label="Topic" value={change.topicKey || '—'} />
          <MetaCell label="Why important" value={change.diff?.explainability?.whyImportant || 'Изменение сохранено в history.'} />
        </div>
      </div>

      {change.diff?.changes?.map((item, index) => (
        <div key={`${change.id}-${item.type}-${index}`} className="p-4 sm:p-5 border-b border-white/10 last:border-b-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-white font-semibold uppercase text-sm tracking-wide">{item.type}</div>
            <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${severityStyles[item.severity]}`}>
              {item.severity}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
            <MetaCell label="Before" value={shortValue(item.before)} />
            <MetaCell label="After" value={shortValue(item.after)} />
          </div>

          <div className="rounded-[20px] bg-black/15 border border-white/10 p-4 text-sm text-slate-200">
            <div><span className="text-slate-400">Changed:</span> {item.changed}</div>
            <div className="mt-2"><span className="text-slate-400">Risk:</span> {item.risk}</div>
            {typeof item.deltaPercent === 'number' && (
              <div className="mt-2"><span className="text-slate-400">Diff:</span> {item.deltaPercent > 0 ? '+' : ''}{item.deltaPercent}% текста</div>
            )}
            {index === 0 && change.diff?.explainability?.recommendation && (
              <div className="mt-2"><span className="text-slate-400">Recommendation:</span> {change.diff.explainability.recommendation}</div>
            )}
          </div>
        </div>
      ))}

      {contentChange && (
        <div className="p-4 sm:p-5 bg-black/10">
          <DiffViewer
            title="Content diff"
            original={contentChange.before || ''}
            modified={contentChange.after || ''}
          />
        </div>
      )}
    </article>
  );
};
