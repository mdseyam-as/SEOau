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

const fieldShellClass = 'rounded-[20px] border border-white/12 bg-[linear-gradient(180deg,rgba(2,6,23,0.32),rgba(15,23,42,0.72))] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_25px_rgba(2,6,23,0.16)]';
const fieldInputClass = 'w-full bg-transparent p-0 text-white outline-none placeholder:text-slate-500';
const fieldSelectClass = 'w-full appearance-none bg-transparent p-0 text-white outline-none [&>option]:text-slate-900';

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

  const comparisonScale = useMemo(() => (
    Math.max(1, ...selectedComparisons.map((item) => Math.max(item.ourCoverage, item.theirCoverage)))
  ), [selectedComparisons]);

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

  const hydrateCompetitorState = (
    competitorId: string,
    payload: {
      competitor?: Competitor;
      changes?: CompetitorPageChange[];
      comparisons?: CompetitorComparison[];
      summary?: CompetitorWeeklySummary;
    }
  ) => {
    if (payload.competitor) {
      setCompetitors((prev) => prev.map((item) => item.id === competitorId ? payload.competitor! : item));
      hydrateCompetitorCaches(payload.competitor);
    }

    if (payload.changes) {
      setChangeCache((prev) => ({ ...prev, [competitorId]: payload.changes || [] }));
    }

    if (payload.comparisons) {
      setComparisonCache((prev) => ({ ...prev, [competitorId]: payload.comparisons || [] }));
    }

    if (payload.summary) {
      setSummaryCache((prev) => ({ ...prev, [competitorId]: payload.summary! }));
    }
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
        const [changes, comparisons, summary] = await Promise.all([
          competitorWatcherService.getChanges(selectedCompetitor.id, 20),
          competitorWatcherService.getComparison(selectedCompetitor.id),
          competitorWatcherService.getWeeklySummary(selectedCompetitor.id, 7)
        ]);

        hydrateCompetitorState(selectedCompetitor.id, {
          changes,
          comparisons,
          summary
        });
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

      const [changes, comparisons] = await Promise.all([
        competitorWatcherService.getChanges(competitor.id, 20),
        competitorWatcherService.getComparison(competitor.id)
      ]);

      hydrateCompetitorState(competitor.id, {
        competitor: result.competitor,
        changes,
        comparisons,
        summary: result.weeklySummary
      });

      toast.success(
        'Scan завершен',
        result.changes.length > 0
          ? result.changes[0].title
          : (changes[0]?.title || 'Новых изменений в этом скане не найдено, история сохранена.')
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
      <section className="app-dark-card relative overflow-hidden p-4 sm:p-6">
        <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-emerald-400/12 blur-3xl" />
        <div className="pointer-events-none absolute left-10 top-14 h-28 w-28 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
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

          <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 xl:w-auto xl:min-w-[500px]">
            <SummaryCard label="Competitors" value={String(stats.competitors)} icon={<Radar className="w-4 h-4" />} />
            <SummaryCard label="Pages" value={String(stats.trackedPages)} icon={<Activity className="w-4 h-4" />} />
            <SummaryCard label="Signals" value={String(stats.importantSignals)} icon={<ShieldAlert className="w-4 h-4" />} />
            <SummaryCard label="Gaps" value={String(stats.topicGaps)} icon={<Layers3 className="w-4 h-4" />} />
          </div>
        </div>

        <div className="relative mt-6 rounded-[26px] border border-white/10 bg-black/15 p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-sm font-semibold text-white">Добавить конкурента</div>
              <div className="text-xs text-slate-400">Новый домен, рабочий приоритет и заметки для сигналов.</div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-300">
              New watcher
            </div>
          </div>

          <form onSubmit={handleCreateCompetitor} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
            <div className="md:col-span-2 xl:col-span-4">
              <FieldLabel>Сайт конкурента</FieldLabel>
              <div className={fieldShellClass}>
                <input
                  type="url"
                  value={newUrl}
                  onChange={(event) => setNewUrl(event.target.value)}
                  placeholder="https://competitor.com"
                  className={fieldInputClass}
                />
              </div>
            </div>
            <div className="xl:col-span-2">
              <FieldLabel>Название</FieldLabel>
              <div className={fieldShellClass}>
                <input
                  type="text"
                  value={newName}
                  onChange={(event) => setNewName(event.target.value)}
                  placeholder="Имя конкурента"
                  className={fieldInputClass}
                />
              </div>
            </div>
            <div className="xl:col-span-2">
              <FieldLabel>Приоритет</FieldLabel>
              <div className={fieldShellClass}>
                <select
                  value={newPriority}
                  onChange={(event) => setNewPriority(event.target.value as CompetitorPriority)}
                  className={fieldSelectClass}
                >
                  {PRIORITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="xl:col-span-2">
              <FieldLabel>Частота</FieldLabel>
              <div className={fieldShellClass}>
                <select
                  value={newFrequency}
                  onChange={(event) => setNewFrequency(event.target.value as MonitoringFrequency)}
                  className={fieldSelectClass}
                >
                  {FREQUENCY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="md:col-span-2 xl:col-span-2 xl:self-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="app-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Plus className="w-4 h-4" />
                Добавить
              </button>
            </div>
            <div className="md:col-span-2 xl:col-span-12">
              <FieldLabel>Заметки</FieldLabel>
              <div className={fieldShellClass}>
                <textarea
                  value={newNotes}
                  onChange={(event) => setNewNotes(event.target.value)}
                  placeholder="Например: важны pricing, integrations и любые comparison pages против нас"
                  className={`${fieldInputClass} min-h-[92px] resize-none`}
                />
              </div>
            </div>
          </form>
        </div>
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
                  className={`group w-full text-left rounded-[26px] border p-4 transition-all duration-300 ${
                    isActive
                      ? 'border-emerald-400/30 bg-[linear-gradient(180deg,rgba(16,185,129,0.16),rgba(15,23,42,0.88))] shadow-[0_18px_40px_rgba(16,185,129,0.12)]'
                      : 'border-white/10 bg-white/[0.04] hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.07]'
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
                    <ChevronRight className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isActive ? 'text-emerald-300' : 'text-slate-500 group-hover:translate-x-0.5'}`} />
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
                <div className="app-dark-card relative overflow-hidden p-4 sm:p-5">
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.16),transparent_42%)]" />
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
                      <p className="mt-3 max-w-3xl text-sm text-slate-300 leading-relaxed">
                        {selectedCompetitor.notes || selectedCompetitor.lastSummary || 'Модуль отслеживает URL-level изменения, контентные сдвиги, кластеры и gaps по темам.'}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:w-[340px] lg:justify-end">
                      <select
                        value={selectedCompetitor.priority}
                        onChange={(event) => handleChangePriority(selectedCompetitor, event.target.value as CompetitorPriority)}
                        className="rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(2,6,23,0.28),rgba(15,23,42,0.72))] px-3 py-2 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] [&>option]:text-slate-900"
                      >
                        {PRIORITY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <select
                        value={selectedCompetitor.scanFrequency}
                        onChange={(event) => handleChangeFrequency(selectedCompetitor, event.target.value as MonitoringFrequency)}
                        className="rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(2,6,23,0.28),rgba(15,23,42,0.72))] px-3 py-2 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] [&>option]:text-slate-900"
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

                  <div className="grid grid-cols-2 gap-3 mt-5 xl:grid-cols-4">
                    <SummaryCard label="Последний scan" value={selectedCompetitor.lastScannedAt ? formatDateTime(selectedCompetitor.lastScannedAt) : '—'} icon={<Clock3 className="w-4 h-4" />} />
                    <SummaryCard label="Pages" value={String(selectedCompetitor.lastPageCount)} icon={<Activity className="w-4 h-4" />} />
                    <SummaryCard label="Changes" value={String(selectedCompetitor.lastChangeCount)} icon={<AlertTriangle className="w-4 h-4" />} />
                    <SummaryCard label="Clusters" value={String(selectedCompetitor.lastClusterCount)} icon={<Layers3 className="w-4 h-4" />} />
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <section className="app-dark-card relative overflow-hidden p-4 sm:p-5">
                    <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-emerald-400/10 blur-3xl" />
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
                      {(selectedSummary?.bullets || []).length === 0 ? (
                        <div className="rounded-[18px] border border-dashed border-white/10 bg-black/10 px-4 py-5 text-sm text-slate-400">
                          После нескольких сканов здесь появится digest по новым страницам, кластерам и сильным сигналам.
                        </div>
                      ) : (
                        (selectedSummary?.bullets || []).map((bullet, index) => (
                          <div key={`${selectedCompetitor.id}-bullet-${index}`} className="rounded-[18px] border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-200">
                            {bullet}
                          </div>
                        ))
                      )}
                    </div>
                    {selectedSummary?.recommendation && (
                      <div className="mt-4 rounded-[20px] border border-cyan-400/15 bg-cyan-500/10 px-4 py-4 text-sm text-cyan-50">
                        <div className="text-[11px] uppercase tracking-[0.16em] text-cyan-200/80">Recommendation</div>
                        <div className="mt-2 leading-relaxed">{selectedSummary.recommendation}</div>
                      </div>
                    )}
                    {selectedSummary?.llmModel && (
                      <div className="mt-4 text-[11px] uppercase tracking-[0.16em] text-slate-500">
                        LLM: {selectedSummary.llmModel}
                      </div>
                    )}
                  </section>

                  <section className="app-dark-card relative overflow-hidden p-4 sm:p-5">
                    <div className="pointer-events-none absolute left-0 top-0 h-24 w-24 rounded-full bg-sky-400/10 blur-3xl" />
                    <div className="flex items-center gap-2 text-white font-semibold text-lg">
                      <Layers3 className="w-5 h-5 text-emerald-300" />
                      Topic Clusters
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {selectedCompetitor.topClusters.length === 0 ? (
                        <div className="w-full rounded-[20px] border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm text-slate-400">
                          Кластеры появятся после накопления страниц и тем.
                        </div>
                      ) : (
                        selectedCompetitor.topClusters.map((cluster) => (
                          <div key={cluster.id} className="min-w-[200px] flex-1 rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(15,23,42,0.18))] px-4 py-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="text-white font-semibold">{cluster.name}</div>
                              <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-300">
                                {cluster.pageCount} pages
                              </div>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {cluster.keywords.slice(0, 4).length > 0 ? (
                                cluster.keywords.slice(0, 4).map((keyword) => (
                                  <span
                                    key={`${cluster.id}-${keyword}`}
                                    className="rounded-full border border-emerald-400/15 bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-100"
                                  >
                                    {keyword}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-slate-400">Ключи появятся после следующего scan</span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </section>
                </div>

                <section className="app-dark-card relative overflow-hidden p-4 sm:p-5">
                  <div className="pointer-events-none absolute right-10 top-0 h-24 w-24 rounded-full bg-amber-400/10 blur-3xl" />
                  <div className="flex items-center gap-2 text-white font-semibold text-lg">
                    <Radar className="w-5 h-5 text-emerald-300" />
                    Мы vs Они
                  </div>
                  <p className="mt-2 text-sm text-slate-300">
                    Смотрим, где конкурент уже усилил тему, а нашему проекту ещё не хватает покрытия или глубины структуры.
                  </p>
                  <div className="space-y-3 mt-4">
                    {selectedComparisons.length === 0 ? (
                      <div className="rounded-[22px] border border-dashed border-white/10 bg-black/10 px-4 py-8 text-center text-sm text-slate-400">
                        Сравнение тем появится после baseline scan и анализа покрытий.
                      </div>
                    ) : (
                      selectedComparisons.slice(0, 8).map((comparison) => (
                        <div key={comparison.id} className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(15,23,42,0.18))] px-4 py-4">
                          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                            <div className="min-w-0">
                              <div className="text-white font-semibold">{comparison.theirTopic}</div>
                              <div className="text-sm text-slate-300 mt-1 leading-relaxed">{comparison.gapSummary}</div>
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

                          <div className="mt-4 space-y-3">
                            <CoverageBar label="Они" value={comparison.theirCoverage} max={comparisonScale} tone="amber" />
                            <CoverageBar label="Мы" value={comparison.ourCoverage} max={comparisonScale} tone={comparison.theirCoverage > comparison.ourCoverage ? 'emerald' : 'sky'} />
                          </div>

                          <div className="mt-4 rounded-[18px] border border-white/10 bg-black/15 px-4 py-4 text-sm text-slate-200 leading-relaxed">
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

const FieldLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
    {children}
  </label>
);

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

const CoverageBar: React.FC<{ label: string; value: number; max: number; tone: 'amber' | 'emerald' | 'sky' }> = ({ label, value, max, tone }) => {
  const percent = Math.max(8, Math.round((value / Math.max(max, 1)) * 100));
  const toneClasses = {
    amber: 'from-amber-400 to-amber-300',
    emerald: 'from-emerald-400 to-emerald-300',
    sky: 'from-sky-400 to-cyan-300'
  };

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-400">
        <span>{label}</span>
        <span className="text-slate-300">{value}</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full bg-gradient-to-r ${toneClasses[tone]}`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
};

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
