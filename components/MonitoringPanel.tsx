import React, { useEffect, useMemo, useState } from 'react';
import { Activity, AlertTriangle, BellRing, Clock3, ExternalLink, Globe, PauseCircle, PlayCircle, Plus, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { DiffViewer } from './DiffViewer';
import { useToast } from './Toast';
import { MonitoredPage, MonitoringEvent, MonitoringFrequency, MonitoringSeverity } from '../types';
import { monitoringService } from '../services/monitoringService';

interface MonitoringPanelProps {
  projectId: string;
}

const FREQUENCY_OPTIONS: Array<{ value: MonitoringFrequency; label: string }> = [
  { value: '15m', label: 'Каждые 15 минут' },
  { value: '1h', label: 'Раз в час' },
  { value: '1d', label: 'Раз в день' }
];

const severityStyles: Record<MonitoringSeverity, string> = {
  critical: 'bg-red-500/15 text-red-300 border border-red-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
  info: 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
};

export const MonitoringPanel: React.FC<MonitoringPanelProps> = ({ projectId }) => {
  const toast = useToast();
  const [pages, setPages] = useState<MonitoredPage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedPageId, setExpandedPageId] = useState<string | null>(null);
  const [eventCache, setEventCache] = useState<Record<string, MonitoringEvent[]>>({});
  const [newUrl, setNewUrl] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newFrequency, setNewFrequency] = useState<MonitoringFrequency>('1h');

  const summary = useMemo(() => ({
    total: pages.length,
    critical: pages.filter((page) => page.lastSeverity === 'critical').length,
    warning: pages.filter((page) => page.lastSeverity === 'warning').length,
    active: pages.filter((page) => page.isActive).length
  }), [pages]);

  const loadPages = async () => {
    setIsLoading(true);
    try {
      const loadedPages = await monitoringService.getPages(projectId);
      setPages(loadedPages);
    } catch (error: any) {
      toast.error('Ошибка мониторинга', error.message || 'Не удалось загрузить URL');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setPages([]);
    setEventCache({});
    setExpandedPageId(null);
    loadPages();
  }, [projectId]);

  const handleCreatePage = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newUrl.trim()) return;

    setIsSubmitting(true);
    try {
      const page = await monitoringService.createPage(projectId, {
        url: newUrl.trim(),
        label: newLabel.trim() || undefined,
        frequency: newFrequency
      });

      setPages((prev) => [page, ...prev]);
      setNewUrl('');
      setNewLabel('');
      setNewFrequency('1h');
      toast.success('URL добавлен', 'Первый snapshot уже снят.');
    } catch (error: any) {
      toast.error('Не удалось добавить URL', error.message || 'Проверьте адрес страницы');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (pageId: string) => {
    const confirmed = await toast.confirm('Удалить URL из мониторинга?', 'Снимки и события тоже будут удалены.');
    if (!confirmed) return;

    try {
      await monitoringService.deletePage(pageId);
      setPages((prev) => prev.filter((page) => page.id !== pageId));
      setEventCache((prev) => {
        const next = { ...prev };
        delete next[pageId];
        return next;
      });
      if (expandedPageId === pageId) {
        setExpandedPageId(null);
      }
      toast.success('Удалено', 'URL больше не мониторится.');
    } catch (error: any) {
      toast.error('Ошибка удаления', error.message || 'Не удалось удалить URL');
    }
  };

  const handleRunCheck = async (pageId: string) => {
    try {
      const { page, event } = await monitoringService.runCheck(pageId);
      setPages((prev) => prev.map((item) => item.id === pageId ? page : item));
      if (event) {
        setEventCache((prev) => ({
          ...prev,
          [pageId]: [event, ...(prev[pageId] || [])]
        }));
      }
      toast.success('Проверка завершена', event ? event.title : 'Изменений не найдено.');
    } catch (error: any) {
      toast.error('Ошибка проверки', error.message || 'Не удалось проверить страницу');
    }
  };

  const handleToggleActive = async (page: MonitoredPage) => {
    try {
      const updated = await monitoringService.updatePage(page.id, { isActive: !page.isActive });
      setPages((prev) => prev.map((item) => item.id === page.id ? updated : item));
      toast.success(page.isActive ? 'Мониторинг приостановлен' : 'Мониторинг включён');
    } catch (error: any) {
      toast.error('Ошибка', error.message || 'Не удалось обновить статус');
    }
  };

  const handleChangeFrequency = async (pageId: string, frequency: MonitoringFrequency) => {
    try {
      const updated = await monitoringService.updatePage(pageId, { frequency });
      setPages((prev) => prev.map((item) => item.id === pageId ? updated : item));
      toast.success('Частота обновлена');
    } catch (error: any) {
      toast.error('Ошибка', error.message || 'Не удалось обновить частоту');
    }
  };

  const handleExpand = async (pageId: string) => {
    if (expandedPageId === pageId) {
      setExpandedPageId(null);
      return;
    }

    setExpandedPageId(pageId);
    if (!eventCache[pageId]) {
      try {
        const events = await monitoringService.getEvents(pageId, 20);
        setEventCache((prev) => ({ ...prev, [pageId]: events }));
      } catch (error: any) {
        toast.error('Не удалось загрузить события', error.message || 'Попробуйте ещё раз');
      }
    }
  };

  const formatDateTime = (value?: string | null) => {
    if (!value) return 'Еще не проверялась';
    return new Date(value).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-5">
      <section className="glass-panel rounded-2xl p-4 sm:p-6 border border-white/10">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <BellRing className="w-5 h-5 text-brand-green" />
              SEO Monitoring + Alerts
            </h3>
            <p className="text-slate-400 text-sm mt-2 max-w-2xl">
              Следим за title, H1, meta description, canonical, status code и сразу отправляем сигнал, если страница ломается или резко меняется.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 min-w-full lg:min-w-[420px]">
            <SummaryCard label="URL" value={String(summary.total)} icon={<Globe className="w-4 h-4" />} />
            <SummaryCard label="Активно" value={String(summary.active)} icon={<Activity className="w-4 h-4" />} />
            <SummaryCard label="Critical" value={String(summary.critical)} icon={<ShieldAlert className="w-4 h-4" />} />
            <SummaryCard label="Warning" value={String(summary.warning)} icon={<AlertTriangle className="w-4 h-4" />} />
          </div>
        </div>

        <form onSubmit={handleCreatePage} className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-3">
          <input
            type="url"
            value={newUrl}
            onChange={(event) => setNewUrl(event.target.value)}
            placeholder="https://example.com/pricing"
            className="lg:col-span-5 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-green/40"
          />
          <input
            type="text"
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            placeholder="Название или комментарий"
            className="lg:col-span-3 rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-green/40"
          />
          <select
            value={newFrequency}
            onChange={(event) => setNewFrequency(event.target.value as MonitoringFrequency)}
            className="lg:col-span-2 rounded-xl bg-slate-900 border border-white/10 px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-brand-green/40"
          >
            {FREQUENCY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={isSubmitting}
            className="lg:col-span-2 rounded-xl bg-brand-green hover:bg-emerald-500 disabled:opacity-60 text-white font-bold px-4 py-3 flex items-center justify-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Добавить
          </button>
        </form>
      </section>

      {isLoading ? (
        <div className="glass-panel rounded-2xl p-8 text-center text-slate-400">Загружаю мониторинг…</div>
      ) : pages.length === 0 ? (
        <div className="glass-panel rounded-2xl p-10 text-center border border-white/10">
          <Globe className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h4 className="text-white font-semibold text-lg">Пока нет URL в мониторинге</h4>
          <p className="text-slate-400 text-sm mt-2">
            Добавьте важные страницы проекта, и система начнет снимать snapshot по расписанию.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {pages.map((page) => {
            const pageEvents = eventCache[page.id] || page.recentEvents || [];
            return (
              <article key={page.id} className="glass-panel rounded-2xl border border-white/10 overflow-hidden">
                <div className="p-4 sm:p-5">
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
                    <div className="space-y-3 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${severityStyles[(page.lastSeverity || 'info') as MonitoringSeverity]}`}>
                          {page.lastSeverity || 'info'}
                        </span>
                        <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${page.isActive ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-slate-500/10 text-slate-300 border-slate-500/20'}`}>
                          {page.isActive ? 'Активен' : 'Пауза'}
                        </span>
                        <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-white/5 text-slate-300 border border-white/10">
                          {FREQUENCY_OPTIONS.find((option) => option.value === page.frequency)?.label}
                        </span>
                      </div>

                      <div>
                        <h4 className="text-white font-bold text-lg break-all">{page.label || page.url}</h4>
                        {page.label && (
                          <a href={page.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-brand-green hover:text-emerald-300 mt-1 break-all">
                            {page.url}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                        <MetaCell label="Последняя проверка" value={formatDateTime(page.lastCheckedAt)} />
                        <MetaCell label="Следующая проверка" value={formatDateTime(page.nextCheckAt)} />
                        <MetaCell label="HTTP / Title" value={`${page.lastStatusCode || '-'} / ${page.latestSnapshot?.title || page.lastTitle || '—'}`} />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 xl:w-[290px] xl:justify-end">
                      <select
                        value={page.frequency}
                        onChange={(event) => handleChangeFrequency(page.id, event.target.value as MonitoringFrequency)}
                        className="rounded-xl bg-slate-900 border border-white/10 px-3 py-2 text-sm text-white"
                      >
                        {FREQUENCY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>

                      <button
                        onClick={() => handleRunCheck(page.id)}
                        className="rounded-xl bg-brand-green/20 hover:bg-brand-green/30 text-brand-green px-3 py-2 text-sm font-semibold flex items-center gap-2 transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Проверить
                      </button>

                      <button
                        onClick={() => handleToggleActive(page)}
                        className="rounded-xl bg-white/5 hover:bg-white/10 text-white px-3 py-2 text-sm font-semibold flex items-center gap-2 transition-colors"
                      >
                        {page.isActive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                        {page.isActive ? 'Пауза' : 'Включить'}
                      </button>

                      <button
                        onClick={() => handleDelete(page.id)}
                        className="rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-300 px-3 py-2 text-sm font-semibold flex items-center gap-2 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                        Удалить
                      </button>
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 px-4 sm:px-5 py-3 bg-black/10 flex items-center justify-between gap-4">
                  <div className="text-xs sm:text-sm text-slate-400">
                    {pageEvents.length > 0 ? `Событий в истории: ${pageEvents.length}${eventCache[page.id] ? '+' : ''}` : 'Изменений пока не зафиксировано'}
                  </div>
                  <button
                    onClick={() => handleExpand(page.id)}
                    className="text-sm font-semibold text-brand-green hover:text-emerald-300 transition-colors"
                  >
                    {expandedPageId === page.id ? 'Скрыть diff' : 'Открыть diff и историю'}
                  </button>
                </div>

                {expandedPageId === page.id && (
                  <div className="border-t border-white/10 p-4 sm:p-5 space-y-4 bg-black/20">
                    {pageEvents.length === 0 ? (
                      <div className="text-sm text-slate-400">Пока нет событий. Базовый snapshot уже снят, система ждёт следующих изменений.</div>
                    ) : (
                      pageEvents.map((event) => (
                        <MonitoringEventCard key={event.id} event={event} />
                      ))
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

const SummaryCard: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
    <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wide">
      {icon}
      {label}
    </div>
    <div className="text-white text-xl font-bold mt-1">{value}</div>
  </div>
);

const MetaCell: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-xl bg-white/5 border border-white/10 px-3 py-3">
    <div className="text-slate-400 text-xs uppercase tracking-wide">{label}</div>
    <div className="text-white mt-1 break-words whitespace-pre-wrap">{value}</div>
  </div>
);

const MonitoringEventCard: React.FC<{ event: MonitoringEvent }> = ({ event }) => {
  const contentChange = event.diff?.changes?.find((change) => change.type === 'content');
  const topChange = event.diff?.changes?.[0];
  const shortValue = (value?: string | null) => {
    if (!value) return '—';
    return value.length > 220 ? `${value.slice(0, 219)}…` : value;
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-white/10">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
          <div>
            <div className={`inline-flex px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wide ${severityStyles[event.severity]}`}>
              {event.severity}
            </div>
            <h5 className="text-white font-bold text-lg mt-3">{event.title}</h5>
            <p className="text-slate-300 text-sm mt-2">{event.summary}</p>
          </div>

          <div className="text-sm text-slate-400 flex items-center gap-2 whitespace-nowrap">
            <Clock3 className="w-4 h-4" />
            {new Date(event.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          <MetaCell label="Changed" value={topChange?.changed || 'Изменения зафиксированы'} />
          <MetaCell label="Risk" value={topChange?.risk || 'Проверьте страницу вручную'} />
          <MetaCell label="Before" value={shortValue(topChange?.before)} />
          <MetaCell label="After" value={shortValue(topChange?.after)} />
        </div>
      </div>

      {event.diff?.changes?.map((change, index) => (
        <div key={`${event.id}-${change.type}-${index}`} className="p-4 sm:p-5 border-b border-white/5 last:border-b-0">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div className="text-white font-semibold uppercase text-sm tracking-wide">{change.type}</div>
            <div className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wide ${severityStyles[change.severity]}`}>
              {change.severity}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-4">
            <MetaCell label="Before" value={shortValue(change.before)} />
            <MetaCell label="After" value={shortValue(change.after)} />
          </div>

          <div className="rounded-xl bg-black/20 border border-white/10 p-4 text-sm text-slate-300">
            <div><span className="text-slate-400">Changed:</span> {change.changed}</div>
            <div className="mt-2"><span className="text-slate-400">Risk:</span> {change.risk}</div>
            {typeof change.deltaPercent === 'number' && (
              <div className="mt-2"><span className="text-slate-400">Diff:</span> {change.deltaPercent > 0 ? '+' : ''}{change.deltaPercent}% текста</div>
            )}
          </div>
        </div>
      ))}

      {contentChange && (
        <div className="p-4 sm:p-5 bg-black/20">
          <DiffViewer
            title="Content diff"
            original={contentChange.before || ''}
            modified={contentChange.after || ''}
          />
        </div>
      )}
    </div>
  );
};
