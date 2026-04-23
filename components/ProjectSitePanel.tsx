import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BookOpenText,
  Clock3,
  Download,
  Globe,
  Link2,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { StyledSelect } from './StyledSelect';
import { MonitoringFrequency, ProjectSite } from '../types';
import { projectSiteService } from '../services/projectSiteService';
import { useToast } from './Toast';

interface ProjectSitePanelProps {
  projectId: string;
}

const FREQUENCY_OPTIONS: Array<{ value: MonitoringFrequency; label: string }> = [
  { value: '15m', label: 'Каждые 15 минут' },
  { value: '1h', label: 'Раз в час' },
  { value: '1d', label: 'Раз в день' }
];

const statusStyles: Record<string, string> = {
  healthy: 'border border-emerald-400/20 bg-emerald-500/10 text-emerald-300',
  warning: 'border border-amber-400/20 bg-amber-500/10 text-amber-300',
  error: 'border border-red-400/20 bg-red-500/10 text-red-300'
};

const fieldShellClass = 'rounded-[6px] border border-[#5b3f44] bg-[rgba(2,3,5,0.78)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]';
const fieldInputClass = 'app-shell-input';
export const ProjectSitePanel: React.FC<ProjectSitePanelProps> = ({ projectId }) => {
  const toast = useToast();
  const [site, setSite] = useState<ProjectSite | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [homepageUrl, setHomepageUrl] = useState('');
  const [name, setName] = useState('');
  const [scanFrequency, setScanFrequency] = useState<MonitoringFrequency>('1d');

  const formatDateTime = (value?: string | null) => {
    if (!value) return 'Пока не было';
    return new Date(value).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const loadSite = async () => {
    setIsLoading(true);
    try {
      const loadedSite = await projectSiteService.getProjectSite(projectId);
      setSite(loadedSite);
    } catch (error: any) {
      toast.error('Ошибка модуля "Мы"', error.message || 'Не удалось загрузить сайт проекта');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setSite(null);
    setHomepageUrl('');
    setName('');
    setScanFrequency('1d');
    loadSite();
  }, [projectId]);

  useEffect(() => {
    if (!site) return;
    setHomepageUrl(site.homepageUrl);
    setName(site.name || '');
    setScanFrequency(site.scanFrequency);
  }, [site?.id, site?.homepageUrl, site?.name, site?.scanFrequency]);

  const stats = useMemo(() => ({
    pages: site?.currentPages.length || 0,
    topics: site?.topicCoverage.length || 0,
    withFaq: site?.currentPages.filter((page) => page.faqQuestions.length > 0).length || 0,
    linksReady: site?.currentPages.reduce((sum, page) => sum + page.internalLinks.length, 0) || 0
  }), [site]);

  const handleCreateSite = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!homepageUrl.trim()) return;

    setIsSubmitting(true);
    try {
      const createdSite = await projectSiteService.createProjectSite(projectId, {
        homepageUrl: homepageUrl.trim(),
        name: name.trim() || undefined,
        scanFrequency
      });
      setSite(createdSite);
      toast.success('Сайт добавлен', 'Теперь comparison с конкурентами будет опираться на модуль "Мы".');
    } catch (error: any) {
      toast.error('Не удалось добавить сайт', error.message || 'Проверьте URL и попробуйте ещё раз');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveSite = async () => {
    if (!site) return;

    setIsSaving(true);
    try {
      const updatedSite = await projectSiteService.updateProjectSite(site.id, {
        homepageUrl: homepageUrl.trim(),
        name: name.trim() || undefined,
        scanFrequency
      });
      setSite(updatedSite);
      toast.success('Настройки сохранены', 'Сайт проекта обновлён.');
    } catch (error: any) {
      toast.error('Ошибка сохранения', error.message || 'Не удалось обновить сайт');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async () => {
    if (!site) return;

    try {
      const updatedSite = await projectSiteService.updateProjectSite(site.id, {
        isActive: !site.isActive
      });
      setSite(updatedSite);
      toast.success(site.isActive ? 'Автосканирование отключено' : 'Автосканирование включено');
    } catch (error: any) {
      toast.error('Ошибка', error.message || 'Не удалось обновить статус');
    }
  };

  const handleScan = async () => {
    if (!site) return;

    setIsRefreshing(true);
    try {
      const updatedSite = await projectSiteService.scanProjectSite(site.id);
      setSite(updatedSite);
      toast.success('Сканирование завершено', updatedSite.lastSummary || 'Снимок сайта обновлён.');
    } catch (error: any) {
      toast.error('Ошибка сканирования', error.message || 'Не удалось просканировать сайт');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleImportLinks = async () => {
    if (!site) return;

    setIsImporting(true);
    try {
      const { site: updatedSite, result } = await projectSiteService.importLinks(site.id);
      if (updatedSite) {
        setSite(updatedSite);
      }
      toast.success(
        'Ссылки импортированы',
        `Добавлено: ${result.imported}. Пропущено: ${result.skipped}. Всего в пуле: ${result.totalLinks}.`
      );
    } catch (error: any) {
      toast.error('Ошибка импорта', error.message || 'Не удалось импортировать внутренние ссылки');
    } finally {
      setIsImporting(false);
    }
  };

  const handleDeleteSite = async () => {
    if (!site) return;

    const confirmed = await toast.confirm(
      'Удалить модуль "Мы" для этого проекта?',
      'Снимки сайта будут удалены, а comparison вернётся к fallback по данным проекта.'
    );
    if (!confirmed) return;

    try {
      await projectSiteService.deleteProjectSite(site.id);
      setSite(null);
      setHomepageUrl('');
      setName('');
      setScanFrequency('1d');
      toast.success('Сайт удалён', 'Модуль "Мы" отключён для текущего проекта.');
    } catch (error: any) {
      toast.error('Ошибка удаления', error.message || 'Не удалось удалить сайт проекта');
    }
  };

  return (
    <div className="space-y-5">
      <section className="app-dark-card relative overflow-hidden p-4 sm:p-6">
        <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-[#ff2d78]/12 blur-3xl" />
        <div className="pointer-events-none absolute left-10 top-14 h-28 w-28 rounded-full bg-[#46fa9c]/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center rounded-full border border-[#ff2d78]/20 bg-[#ff2d78]/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ffb1c0]">
              Модуль "Мы"
            </div>
            <h3 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
              <ShieldCheck className="w-5 h-5 text-[#ffb1c0]" />
              Собственный сайт проекта
            </h3>
            <p className="text-[#ab888e] text-sm mt-2 max-w-3xl leading-relaxed">
              Пользователь сам добавляет свой сайт, а затем мы используем его страницы для сравнения с конкурентами,
              отслеживания покрытия тем и импорта внутренних ссылок в генератор.
            </p>
          </div>

          {site && (
            <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4 xl:w-auto xl:min-w-[520px]">
              <SummaryCard label="Pages" value={String(stats.pages)} icon={<Globe className="w-4 h-4" />} />
              <SummaryCard label="Topics" value={String(stats.topics)} icon={<BookOpenText className="w-4 h-4" />} />
              <SummaryCard label="FAQ" value={String(stats.withFaq)} icon={<Activity className="w-4 h-4" />} />
              <SummaryCard label="Links found" value={String(stats.linksReady)} icon={<Link2 className="w-4 h-4" />} />
            </div>
          )}
        </div>

        {!site ? (
          <div className="relative mt-6 rounded-[8px] border border-white/10 bg-black/15 p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Добавить основной сайт проекта</div>
              <div className="text-xs text-[#ab888e]">Этот домен станет базой для comparison, topic coverage и импорта внутренних ссылок.</div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ab888e]">
              Primary source
            </div>
            </div>

            <form onSubmit={handleCreateSite} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
              <div className="md:col-span-2 xl:col-span-5">
                <FieldLabel>Основной домен</FieldLabel>
                <div className={fieldShellClass}>
                  <input
                    type="url"
                    value={homepageUrl}
                    onChange={(event) => setHomepageUrl(event.target.value)}
                    placeholder="https://your-site.com"
                    className={fieldInputClass}
                  />
                </div>
              </div>
              <div className="xl:col-span-3">
                <FieldLabel>Название</FieldLabel>
                <div className={fieldShellClass}>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Название сайта или бренда"
                    className={fieldInputClass}
                  />
                </div>
              </div>
              <div className="xl:col-span-2">
                <FieldLabel>Частота</FieldLabel>
                <StyledSelect
                  value={scanFrequency}
                  onChange={(value) => setScanFrequency(value as MonitoringFrequency)}
                  options={FREQUENCY_OPTIONS}
                  className={fieldShellClass}
                />
              </div>
              <div className="md:col-span-2 xl:col-span-2 xl:self-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="app-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  Добавить сайт
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="rounded-[26px] border border-white/10 bg-black/15 p-4 sm:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-white">Настройки основного сайта</div>
                  <div className="text-xs text-slate-400">Отсюда обновляется домен, частота сканирования и статус фонового сбора страниц.</div>
                </div>
                <div className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] ${statusStyles[site.lastStatus || 'healthy'] || statusStyles.healthy}`}>
                  {site.lastStatus || 'healthy'}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-12">
                <div className="md:col-span-2 xl:col-span-5">
                  <FieldLabel>Основной домен</FieldLabel>
                  <div className={fieldShellClass}>
                    <input
                      type="url"
                      value={homepageUrl}
                      onChange={(event) => setHomepageUrl(event.target.value)}
                      className={fieldInputClass}
                    />
                  </div>
                </div>
                <div className="xl:col-span-3">
                  <FieldLabel>Название</FieldLabel>
                  <div className={fieldShellClass}>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Название сайта"
                      className={fieldInputClass}
                    />
                  </div>
                </div>
                <div className="xl:col-span-2">
                  <FieldLabel>Частота</FieldLabel>
                  <StyledSelect
                    value={scanFrequency}
                    onChange={(value) => setScanFrequency(value as MonitoringFrequency)}
                    options={FREQUENCY_OPTIONS}
                    className={fieldShellClass}
                  />
                </div>
                <div className="md:col-span-2 xl:col-span-2 xl:self-end">
                  <button
                    type="button"
                    onClick={handleSaveSite}
                    disabled={isSaving}
                    className="app-btn-primary w-full disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Save className="w-4 h-4" />
                    Сохранить
                  </button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleScan}
                disabled={isRefreshing}
                className="app-btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Пересканировать
              </button>
              <button
                type="button"
                onClick={handleImportLinks}
                disabled={isImporting}
                className="app-btn-dark disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Download className="w-4 h-4" />
                Импортировать ссылки
              </button>
              <button
                type="button"
                onClick={handleToggleActive}
                className="app-btn-dark"
              >
                {site.isActive ? <PauseCircle className="w-4 h-4" /> : <PlayCircle className="w-4 h-4" />}
                {site.isActive ? 'Пауза' : 'Включить'}
              </button>
              <button
                type="button"
                onClick={handleDeleteSite}
                className="inline-flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200 transition-colors hover:bg-red-500/15"
              >
                <Trash2 className="w-4 h-4" />
                Удалить
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
              <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(15,23,42,0.18))] p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-semibold text-white">{site.name || site.domain}</h4>
                </div>
                <div className="mt-2 flex items-center gap-2 text-sm text-slate-300">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span>{site.domain}</span>
                </div>
                <div className="mt-3 text-sm text-slate-300 leading-relaxed">
                  {site.lastSummary || 'После первого скана здесь появится summary по вашему покрытию тем.'}
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <MiniInfo label="Последний scan" value={formatDateTime(site.lastScannedAt)} />
                  <MiniInfo label="Следующая проверка" value={formatDateTime(site.nextScanAt)} />
                  <MiniInfo label="Импорт ссылок" value={formatDateTime(site.lastImportedAt)} />
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(15,23,42,0.18))] p-4">
                <div className="flex items-center gap-2">
                  <BookOpenText className="w-4 h-4 text-emerald-300" />
                  <h4 className="text-base font-semibold text-white">Тематическое покрытие</h4>
                </div>
                <div className="mt-3 space-y-2">
                  {site.topicCoverage.length > 0 ? site.topicCoverage.map((topic) => (
                    <div
                      key={topic.topicKey}
                      className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-white">{topic.label}</div>
                          <div className="text-xs uppercase tracking-[0.12em] text-slate-400">{topic.pageType}</div>
                        </div>
                        <div className="ml-3 rounded-full bg-white/10 px-2.5 py-1 text-xs font-semibold text-slate-200">
                          {topic.count}
                        </div>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-300"
                          style={{ width: `${Math.max(10, Math.min(100, topic.count * 12))}%` }}
                        />
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-sm text-slate-400">
                      Темы появятся после первого скана.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </section>

      {isLoading ? (
        <div className="app-dark-card p-8 text-center text-slate-300">Загружаю данные сайта проекта…</div>
      ) : site ? (
        <section className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-5">
          <div className="app-dark-card p-4 sm:p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-lg font-semibold text-white">Страницы из модуля "Мы"</h4>
                <p className="text-sm text-slate-400 mt-1">
                  Именно эти страницы мы используем в comparison с конкурентами, если сайт уже добавлен.
                </p>
              </div>
              <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-300">
                {site.currentPages.length} active
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {site.currentPages.length > 0 ? site.currentPages.slice(0, 18).map((page) => (
                <div
                  key={page.id}
                  className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(15,23,42,0.18))] p-4 transition-all hover:border-brand-green/20 hover:bg-white/[0.06]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-white truncate">
                        {page.title || page.h1 || page.url}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-slate-400">
                        <span className="truncate">{page.url}</span>
                        <a
                          href={page.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex shrink-0 items-center gap-1 text-emerald-300 transition-colors hover:text-emerald-200"
                        >
                          <ArrowUpRight className="w-3.5 h-3.5" />
                          Открыть
                        </a>
                      </div>
                    </div>
                    <div className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                      {page.pageType || 'page'}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                    <span className="rounded-full bg-white/5 px-2.5 py-1">{page.wordCount} слов</span>
                    <span className="rounded-full bg-white/5 px-2.5 py-1">FAQ: {page.faqQuestions.length}</span>
                    <span className="rounded-full bg-white/5 px-2.5 py-1">Links: {page.internalLinks.length}</span>
                    <span className="rounded-full bg-white/5 px-2.5 py-1">Status: {page.statusCode}</span>
                  </div>
                </div>
              )) : (
                <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-400">
                  После сканирования здесь появятся текущие страницы сайта.
                </div>
              )}
            </div>
          </div>

          <div className="app-dark-card p-4 sm:p-5">
            <h4 className="text-lg font-semibold text-white">Как это используется</h4>
            <div className="mt-4 space-y-3">
              <UsageCard
                icon={<ShieldCheck className="w-4 h-4 text-emerald-300" />}
                title="Источник для we vs they"
                text="Если сайт добавлен, Competitor Watcher сравнивает конкурентов уже с реальными страницами вашего проекта, а не только с history и monitoring."
              />
              <UsageCard
                icon={<Link2 className="w-4 h-4 text-cyan-300" />}
                title="Импорт внутренних ссылок"
                text="Кнопка импорта переносит найденные страницы в существующий пул внутренних ссылок, который использует генератор контента."
              />
              <UsageCard
                icon={<Clock3 className="w-4 h-4 text-amber-300" />}
                title="Периодическое обновление"
                text="Модуль можно держать активным как фоновой источник правды по вашему сайту: страницы, темы, FAQ и структура будут обновляться по расписанию."
              />
            </div>
          </div>
        </section>
      ) : (
        <div className="app-dark-card p-10 text-center">
          <Globe className="w-12 h-12 mx-auto text-slate-500 mb-3" />
          <h4 className="text-lg font-semibold text-white">Добавьте свой сайт вручную</h4>
          <p className="mt-2 text-sm text-slate-400 max-w-2xl mx-auto leading-relaxed">
            После добавления модуль "Мы" станет источником данных для comparison с конкурентами и позволит одним кликом
            импортировать внутренние ссылки в генератор.
          </p>
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
  <div className="rounded-[8px] border border-white/10 bg-[rgba(15,18,24,0.78)] px-4 py-3 shadow-[0_12px_30px_rgba(2,6,23,0.18)]">
    <div className="flex items-center gap-2 text-[#ab888e] text-[11px] uppercase tracking-[0.14em]">
      <span className="text-[#46fa9c]">{icon}</span>
      {label}
    </div>
    <div className="mt-2 break-words text-lg font-bold text-white sm:text-2xl">{value}</div>
  </div>
);

const MiniInfo: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2">
    <div className="text-[11px] uppercase tracking-[0.12em] text-slate-400">{label}</div>
    <div className="mt-1 break-words text-sm font-medium text-white">{value}</div>
  </div>
);

const UsageCard: React.FC<{ icon: React.ReactNode; title: string; text: string }> = ({ icon, title, text }) => (
  <div className="rounded-[22px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(15,23,42,0.18))] p-4">
    <div className="flex items-center gap-2 text-white font-semibold">
      {icon}
      {title}
    </div>
    <p className="mt-2 text-sm leading-relaxed text-slate-400">{text}</p>
  </div>
);
