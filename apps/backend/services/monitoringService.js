import crypto from 'crypto';
import { ensureMonitoringSchemaReady } from '../lib/monitoringSchema.js';
import { prisma } from '../lib/prisma.js';
import { notifyUser } from '../utils/subscriptionManager.js';
import logger from '../utils/logger.js';

const CHECK_TIMEOUT_MS = 15000;
const CHECK_BATCH_SIZE = 5;
const MONITORING_USER_AGENT = process.env.MONITORING_USER_AGENT || 'SEOau Monitoring Bot/1.0';

export const MONITORING_FREQUENCIES = {
  '15m': 15,
  '1h': 60,
  '1d': 1440
};

const TITLE_GARBAGE_PATTERNS = [
  /^home$/i,
  /^brand$/i,
  /^test$/i,
  /^new page$/i,
  /^untitled$/i,
  /^index$/i
];

const SEVERITY_LABELS = {
  critical: 'Критично',
  warning: 'Внимание',
  info: 'Информация'
};

const CHANGE_TYPE_LABELS = {
  status: 'Доступность',
  finalUrl: 'Редирект',
  canonical: 'Canonical',
  robotsMeta: 'Robots meta',
  h1: 'H1',
  title: 'Title',
  metaDescription: 'Meta description',
  content: 'Контент',
  faq: 'FAQ',
  schema: 'Schema.org'
};

const HEALTHY_STATUS_MIN = 200;
const HEALTHY_STATUS_MAX = 399;
const MAX_RESPONSE_TEXT_BYTES = Number(process.env.MONITORING_MAX_RESPONSE_BYTES || 1_500_000);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeHtmlEntities(value = '') {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripTags(html = '') {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg\b[^>]*>[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}

function sanitizeText(value, limit = 300) {
  if (!value) return '';
  const normalized = String(value).replace(/\s+/g, ' ').trim();
  return normalized.length > limit ? `${normalized.slice(0, limit - 1)}…` : normalized;
}

function getWords(value = '') {
  return sanitizeText(value, Number.MAX_SAFE_INTEGER)
    .split(/\s+/)
    .filter(Boolean);
}

function similarityScore(left = '', right = '') {
  const leftWords = new Set(getWords(left.toLowerCase()));
  const rightWords = new Set(getWords(right.toLowerCase()));

  if (!leftWords.size && !rightWords.size) return 1;
  if (!leftWords.size || !rightWords.size) return 0;

  let intersection = 0;
  for (const word of leftWords) {
    if (rightWords.has(word)) {
      intersection += 1;
    }
  }

  const union = new Set([...leftWords, ...rightWords]).size;
  return union === 0 ? 1 : intersection / union;
}

function looksLikeGarbageTitle(title = '') {
  const normalized = sanitizeText(title, 120);
  if (!normalized) return true;
  if (normalized.length < 8) return true;
  return TITLE_GARBAGE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function normalizeUrl(input) {
  const url = new URL(String(input || '').trim());

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Monitoring supports only HTTP and HTTPS URLs');
  }

  url.hash = '';
  url.protocol = url.protocol.toLowerCase();
  url.hostname = url.hostname.toLowerCase();

  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) {
    url.port = '';
  }

  if (url.pathname !== '/' && url.pathname.endsWith('/')) {
    url.pathname = url.pathname.replace(/\/+$/, '');
  }

  return url.toString();
}

function isHealthyStatus(statusCode) {
  return statusCode >= HEALTHY_STATUS_MIN && statusCode <= HEALTHY_STATUS_MAX;
}

function getStatusCategory(statusCode) {
  if (statusCode === 0) return 'fetch-error';
  if (statusCode >= 500) return 'server-error';
  if (statusCode >= 400) return 'client-error';
  if (statusCode >= 300) return 'redirect';
  if (statusCode >= 200) return 'ok';
  return 'unknown';
}

function getUrlPath(url) {
  try {
    const parsed = new URL(url);
    return parsed.pathname + parsed.search;
  } catch {
    return url;
  }
}

function buildMetaTagRegex(attributeName, attributeValue) {
  const safeValue = escapeRegex(attributeValue);
  return new RegExp(
    `<meta\\b(?=[^>]*\\b${attributeName}\\s*=\\s*["']${safeValue}["'])[^>]*\\bcontent\\s*=\\s*["']([^"']*)["'][^>]*>`,
    'i'
  );
}

function extractMetaContent(html, attributeName, attributeValue) {
  const directMatch = html.match(buildMetaTagRegex(attributeName, attributeValue));
  if (directMatch) {
    return sanitizeText(directMatch[1]);
  }

  const reverseRegex = new RegExp(
    `<meta\\b(?=[^>]*\\bcontent\\s*=\\s*["']([^"']*)["'])[^>]*\\b${attributeName}\\s*=\\s*["']${escapeRegex(attributeValue)}["'][^>]*>`,
    'i'
  );
  const reverseMatch = html.match(reverseRegex);
  return reverseMatch ? sanitizeText(reverseMatch[1]) : '';
}

function extractLinkHref(html, relValue) {
  const safeValue = escapeRegex(relValue);
  const directMatch = html.match(
    new RegExp(
      `<link\\b(?=[^>]*\\brel\\s*=\\s*["'][^"']*${safeValue}[^"']*["'])[^>]*\\bhref\\s*=\\s*["']([^"']+)["'][^>]*>`,
      'i'
    )
  );
  if (directMatch) {
    return sanitizeText(directMatch[1], 1000);
  }

  const reverseMatch = html.match(
    new RegExp(
      `<link\\b(?=[^>]*\\bhref\\s*=\\s*["']([^"']+)["'])[^>]*\\brel\\s*=\\s*["'][^"']*${safeValue}[^"']*["'][^>]*>`,
      'i'
    )
  );
  return reverseMatch ? sanitizeText(reverseMatch[1], 1000) : '';
}

function extractTagText(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? sanitizeText(stripTags(match[1])) : '';
}

function extractBodyContent(html) {
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) return mainMatch[1];

  const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) return articleMatch[1];

  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

export function extractSnapshotData(url, response, html, fetchError = null) {
  const title = extractTagText(html, 'title');
  const h1 = extractTagText(html, 'h1');
  const metaDescription =
    extractMetaContent(html, 'name', 'description') ||
    extractMetaContent(html, 'property', 'og:description');
  const canonical = extractLinkHref(html, 'canonical');
  const robotsMeta = extractMetaContent(html, 'name', 'robots');
  const contentText = sanitizeText(stripTags(extractBodyContent(html)), 20000);
  const wordCount = getWords(contentText).length;

  return {
    url: normalizeUrl(url),
    finalUrl: response?.url ? normalizeUrl(response.url) : normalizeUrl(url),
    statusCode: response?.status ?? 0,
    title: title || null,
    h1: h1 || null,
    metaDescription: metaDescription || null,
    canonical: canonical ? normalizeRelativeUrl(canonical, response?.url || url) : null,
    robotsMeta: robotsMeta || null,
    wordCount,
    contentText: contentText || null,
    contentHash: contentText
      ? crypto.createHash('sha1').update(contentText).digest('hex')
      : null,
    hasFaq: /faqpage|accordion|faq/i.test(html),
    hasSchema: /application\/ld\+json/i.test(html),
    fetchError
  };
}

function normalizeRelativeUrl(value, baseUrl) {
  if (!value) return '';
  try {
    return normalizeUrl(new URL(value, baseUrl).toString());
  } catch {
    return sanitizeText(value, 1000);
  }
}

function calculateWordDelta(previous = 0, current = 0) {
  if (!previous) {
    return current ? 100 : 0;
  }
  return Math.round(((current - previous) / previous) * 100);
}

function getRiskMessage(type, severity, change) {
  const risks = {
    status: severity === 'critical'
      ? 'Страница может быть недоступна пользователям и поисковым системам.'
      : severity === 'info'
        ? 'Страница снова отвечает штатно.'
        : 'Ответ сервера изменился, проверьте корректность состояния.',
    canonical: 'Поисковики могут начать считать каноничной другую страницу.',
    robotsMeta: 'Страница может быть исключена из индекса.',
    h1: severity === 'critical' ? 'Страница потеряла главный заголовок.' : 'Проверьте смысл и релевантность заголовка.',
    title: severity === 'critical' ? 'Сниппет и релевантность страницы могли резко просесть.' : 'Сниппет мог заметно измениться.',
    metaDescription: 'Сниппет в выдаче мог измениться.',
    content: change.deltaPercent < 0 ? 'На странице стало заметно меньше контента.' : 'Проверьте, не изменилась ли смысловая структура.',
    finalUrl: 'Редирект может уводить пользователя и робота не туда.',
    faq: 'Блок FAQ изменился и может повлиять на расширенные сниппеты.',
    schema: 'Структурированные данные изменились.'
  };

  return risks[type] || 'Проверьте страницу вручную.';
}

function getActionMessage(type, severity, change) {
  if (type === 'status') {
    if (severity === 'critical') {
      return 'Проверьте доступность URL, код ответа, редиректы, CDN, хостинг и последние деплои.';
    }
    if (severity === 'info') {
      return 'Убедитесь, что восстановление стабильно, и закройте инцидент после следующей проверки.';
    }
    return 'Проверьте, ожидаем ли новый HTTP-статус для этой страницы.';
  }

  const actions = {
    finalUrl: 'Проверьте цепочку редиректов и целевой URL в браузере и в Search Console.',
    canonical: 'Сверьте canonical с эталонной страницей и исправьте шаблон, если значение изменилось случайно.',
    robotsMeta: 'Проверьте meta robots и правила индексации, особенно noindex/nofollow.',
    h1: 'Верните корректный H1 или подтвердите изменение с контент-командой.',
    title: 'Проверьте новый title на релевантность, бренд и длину сниппета.',
    metaDescription: 'Проверьте описание сниппета и убедитесь, что оно соответствует странице.',
    content: 'Сравните diff, проверьте CMS-блоки, шаблон страницы и случайные удаления текста.',
    faq: 'Проверьте FAQ-блок и JSON-LD, если расширенные сниппеты важны для страницы.',
    schema: 'Проверьте JSON-LD/schema.org валидатором и восстановите разметку при необходимости.'
  };

  return actions[type] || 'Откройте страницу и проверьте изменение вручную.';
}

function getChangeLabel(type) {
  return CHANGE_TYPE_LABELS[type] || type;
}

function buildChangeSummary(change) {
  const label = getChangeLabel(change.type);
  if (change.type === 'status') {
    return `${label}: ${change.before || 'нет ответа'} -> ${change.after || 'нет ответа'}`;
  }

  if (typeof change.deltaPercent === 'number') {
    return `${label}: ${change.deltaPercent > 0 ? '+' : ''}${change.deltaPercent}%`;
  }

  return `${label}: ${change.changed}`;
}

function addChange(changes, change) {
  changes.push({
    ...change,
    label: change.label || getChangeLabel(change.type),
    before: change.before ?? null,
    after: change.after ?? null,
    risk: change.risk || getRiskMessage(change.type, change.severity, change),
    action: change.action || getActionMessage(change.type, change.severity, change)
  });
}

export function compareSnapshots(previous, current) {
  if (!previous) {
    return null;
  }

  const changes = [];
  const previousHealthy = isHealthyStatus(previous.statusCode);
  const currentHealthy = isHealthyStatus(current.statusCode);

  if (previous.statusCode !== current.statusCode) {
    const currentCategory = getStatusCategory(current.statusCode);
    const severity = current.statusCode === 0 || current.statusCode >= 500 || current.statusCode === 404
      ? 'critical'
      : previousHealthy && current.statusCode >= 400
        ? 'critical'
        : !previousHealthy && currentHealthy
          ? 'info'
          : 'warning';

    addChange(changes, {
      type: 'status',
      severity,
      before: String(previous.statusCode),
      after: String(current.statusCode),
      changed: !previousHealthy && currentHealthy
        ? `Страница восстановилась: HTTP ${previous.statusCode} -> HTTP ${current.statusCode}`
        : current.statusCode === 0
          ? `Страница не ответила: ${current.fetchError || 'fetch error'}`
          : `HTTP статус изменился: ${previous.statusCode} -> ${current.statusCode}`,
      risk: currentCategory === 'server-error'
        ? 'Серверная ошибка может полностью остановить трафик и индексацию страницы.'
        : undefined
    });
  }

  if (normalizeRelativeUrl(previous.finalUrl || '', previous.url) !== normalizeRelativeUrl(current.finalUrl || '', current.url)) {
    addChange(changes, {
      type: 'finalUrl',
      severity: 'critical',
      before: previous.finalUrl,
      after: current.finalUrl,
      changed: 'Изменился конечный URL после редиректа'
    });
  }

  // If the page is currently unavailable, a 404/500/error page usually changes title,
  // meta and content too. Keep the alert focused on availability instead of noisy secondary diffs.
  if (!currentHealthy) {
    return buildComparisonResult(previous, current, changes);
  }

  if (!previousHealthy && currentHealthy) {
    return buildComparisonResult(previous, current, changes);
  }

  if (sanitizeText(previous.canonical || '', 1000) !== sanitizeText(current.canonical || '', 1000)) {
    addChange(changes, {
      type: 'canonical',
      severity: 'critical',
      before: previous.canonical,
      after: current.canonical,
      changed: 'Изменился canonical'
    });
  }

  if (sanitizeText(previous.robotsMeta || '') !== sanitizeText(current.robotsMeta || '')) {
    const currentRobots = (current.robotsMeta || '').toLowerCase();
    addChange(changes, {
      type: 'robotsMeta',
      severity: currentRobots.includes('noindex') ? 'critical' : 'warning',
      before: previous.robotsMeta,
      after: current.robotsMeta,
      changed: 'Изменился robots meta'
    });
  }

  if (sanitizeText(previous.h1 || '') !== sanitizeText(current.h1 || '')) {
    const severity = !current.h1 ? 'critical' : similarityScore(previous.h1 || '', current.h1 || '') < 0.5 ? 'warning' : 'info';
    addChange(changes, {
      type: 'h1',
      severity,
      before: previous.h1,
      after: current.h1,
      changed: !current.h1 ? 'Исчез H1' : 'Изменился H1'
    });
  }

  if (sanitizeText(previous.title || '') !== sanitizeText(current.title || '')) {
    const similarity = similarityScore(previous.title || '', current.title || '');
    const severity = !current.title || looksLikeGarbageTitle(current.title) || similarity < 0.25
      ? 'critical'
      : similarity < 0.7 ? 'warning' : 'info';

    addChange(changes, {
      type: 'title',
      severity,
      before: previous.title,
      after: current.title,
      changed: 'Изменился title'
    });
  }

  if (sanitizeText(previous.metaDescription || '') !== sanitizeText(current.metaDescription || '')) {
    const severity = similarityScore(previous.metaDescription || '', current.metaDescription || '') < 0.65 ? 'warning' : 'info';
    addChange(changes, {
      type: 'metaDescription',
      severity,
      before: previous.metaDescription,
      after: current.metaDescription,
      changed: 'Изменился meta description'
    });
  }

  const deltaPercent = calculateWordDelta(previous.wordCount, current.wordCount);
  if (previous.wordCount >= 150 && Math.abs(deltaPercent) >= 20) {
    addChange(changes, {
      type: 'content',
      severity: deltaPercent <= -50 ? 'critical' : 'warning',
      before: sanitizeText(previous.contentText || '', 5000) || `${previous.wordCount} слов`,
      after: sanitizeText(current.contentText || '', 5000) || `${current.wordCount} слов`,
      changed: `Объем текста изменился на ${deltaPercent > 0 ? '+' : ''}${deltaPercent}%`,
      deltaPercent
    });
  }

  if (previous.hasFaq !== current.hasFaq) {
    addChange(changes, {
      type: 'faq',
      severity: 'warning',
      before: previous.hasFaq ? 'Есть' : 'Нет',
      after: current.hasFaq ? 'Есть' : 'Нет',
      changed: current.hasFaq ? 'Появился FAQ блок' : 'Пропал FAQ блок'
    });
  }

  if (previous.hasSchema !== current.hasSchema) {
    addChange(changes, {
      type: 'schema',
      severity: 'info',
      before: previous.hasSchema ? 'Есть' : 'Нет',
      after: current.hasSchema ? 'Есть' : 'Нет',
      changed: current.hasSchema ? 'Появилась schema разметка' : 'Пропала schema разметка'
    });
  }

  if (!changes.length) {
    return null;
  }

  return buildComparisonResult(previous, current, changes);
}

function buildComparisonResult(previous, current, changes) {
  if (!changes.length) {
    return null;
  }

  const severityRank = { critical: 3, warning: 2, info: 1 };
  const severity = changes.reduce((max, change) => (
    severityRank[change.severity] > severityRank[max] ? change.severity : max
  ), 'info');

  const primaryChange = changes.find((change) => change.severity === severity) || changes[0];
  const pagePath = getUrlPath(current.url);
  const title = buildEventTitle(severity, primaryChange, pagePath);
  const secondaryCount = Math.max(changes.length - 1, 0);
  const summary = buildEventSummary(severity, primaryChange, changes, pagePath);
  const action = primaryChange.action || getActionMessage(primaryChange.type, severity, primaryChange);

  return {
    severity,
    title,
    summary,
    diff: {
      summary: title,
      changes,
      readable: {
        severityLabel: SEVERITY_LABELS[severity] || severity,
        pagePath,
        primaryChange: buildChangeSummary(primaryChange),
        secondaryCount,
        impact: primaryChange.risk,
        action
      },
      metrics: {
        previousWordCount: previous.wordCount,
        currentWordCount: current.wordCount,
        deltaPercent: calculateWordDelta(previous.wordCount, current.wordCount)
      }
    },
    changeTypes: [...new Set(changes.map((change) => change.type))]
  };
}

function buildEventTitle(severity, primaryChange, pagePath) {
  const severityLabel = SEVERITY_LABELS[severity] || severity;

  if (primaryChange.type === 'status') {
    if (severity === 'info') {
      return `${severityLabel}: ${pagePath} снова отвечает HTTP ${primaryChange.after}`;
    }
    return `${severityLabel}: ${pagePath} отвечает HTTP ${primaryChange.after}`;
  }

  if (primaryChange.type === 'canonical') {
    return `${severityLabel}: изменился canonical на ${pagePath}`;
  }

  if (primaryChange.type === 'title') {
    return `${severityLabel}: изменился title на ${pagePath}`;
  }

  if (primaryChange.type === 'h1' && !primaryChange.after) {
    return `${severityLabel}: пропал H1 на ${pagePath}`;
  }

  return `${severityLabel}: изменения на ${pagePath}`;
}

function buildEventSummary(severity, primaryChange, changes, pagePath) {
  const severityLabel = SEVERITY_LABELS[severity] || severity;
  const changeList = changes.slice(0, 3).map(buildChangeSummary).join('; ');
  const rest = changes.length > 3 ? `; еще ${changes.length - 3}` : '';
  return `${severityLabel} на ${pagePath}: ${changeList}${rest}. ${primaryChange.risk} Что сделать: ${primaryChange.action}`;
}

function formatTelegramMessage(page, event, snapshot) {
  const readable = event.diff?.readable || {};
  const lines = [
    `<b>${escapeHtml(readable.severityLabel || SEVERITY_LABELS[event.severity] || event.severity)}</b>: ${escapeHtml(page.label || getUrlPath(page.url))}`,
    escapeHtml(event.title),
    '',
    `<b>Что произошло:</b> ${escapeHtml(readable.primaryChange || event.summary)}`,
    `<b>Почему важно:</b> ${escapeHtml(readable.impact || 'Проверьте страницу вручную.')}`,
    `<b>Что сделать:</b> ${escapeHtml(readable.action || 'Откройте страницу и проверьте изменение вручную.')}`
  ];

  const importantChanges = Array.isArray(event.diff?.changes) ? event.diff.changes.slice(0, 4) : [];
  if (importantChanges.length) {
    lines.push('', '<b>Детали:</b>');
  }

  for (const change of importantChanges) {
    lines.push(`<b>${escapeHtml(change.label || change.type)}</b>`);
    if (change.before) {
      lines.push(`Было: ${escapeHtml(sanitizeText(change.before, 120))}`);
    }
    if (change.after) {
      lines.push(`Стало: ${escapeHtml(sanitizeText(change.after, 120))}`);
    }
    if (typeof change.deltaPercent === 'number') {
      lines.push(`Разница: ${change.deltaPercent > 0 ? '+' : ''}${change.deltaPercent}% текста`);
    }
  }

  lines.push('');
  lines.push(`Время: ${new Date().toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`);
  lines.push(`URL: ${escapeHtml(snapshot.finalUrl || page.url)}`);

  return lines.join('\n');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function getNextCheckAt(frequency) {
  const minutes = MONITORING_FREQUENCIES[frequency] || MONITORING_FREQUENCIES['1h'];
  return new Date(Date.now() + minutes * 60 * 1000);
}

async function fetchSnapshot(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CHECK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': MONITORING_USER_AGENT,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.6',
        'accept-language': 'ru,en;q=0.9'
      }
    });

    const contentType = response.headers.get('content-type') || '';
    const shouldReadBody = /html|xml|text/i.test(contentType);
    const html = shouldReadBody ? await readResponseText(response, MAX_RESPONSE_TEXT_BYTES) : '';
    return extractSnapshotData(url, response, html);
  } catch (error) {
    return extractSnapshotData(url, null, '', error.message || 'Failed to fetch page');
  } finally {
    clearTimeout(timeoutId);
  }
}

async function readResponseText(response, maxBytes) {
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    return text.slice(0, maxBytes);
  }

  const decoder = new TextDecoder();
  let bytesRead = 0;
  let result = '';

  while (bytesRead < maxBytes) {
    const { done, value } = await reader.read();
    if (done) break;

    const remaining = maxBytes - bytesRead;
    const chunk = value.byteLength > remaining ? value.slice(0, remaining) : value;
    bytesRead += chunk.byteLength;
    result += decoder.decode(chunk, { stream: bytesRead < maxBytes });

    if (value.byteLength > remaining) {
      try {
        await reader.cancel();
      } catch {
        // Ignore cancellation errors; the snapshot already has enough content.
      }
      break;
    }
  }

  result += decoder.decode();
  return result;
}

async function createMonitoringEvent(monitoredPage, previousSnapshot, snapshot) {
  const comparison = compareSnapshots(previousSnapshot, snapshot);
  if (!comparison) {
    return null;
  }

  const event = await prisma.monitoringEvent.create({
    data: {
      monitoredPageId: monitoredPage.id,
      snapshotId: snapshot.id,
      previousSnapshotId: previousSnapshot?.id || null,
      severity: comparison.severity,
      changeTypes: comparison.changeTypes,
      title: comparison.title,
      summary: comparison.summary,
      diff: comparison.diff,
      notifiedAt: null
    }
  });

  return event;
}

export async function runMonitoringCheck(monitoredPageId, options = {}) {
  await ensureMonitoringSchemaReady();

  const page = await prisma.monitoredPage.findUnique({
    where: { id: monitoredPageId },
    include: {
      project: {
        include: {
          user: {
            select: {
              telegramId: true,
              notificationsEnabled: true
            }
          }
        }
      },
      snapshots: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  if (!page) {
    throw new Error('Monitored page not found');
  }

  const previousSnapshot = page.snapshots[0] || null;
  const extractedSnapshot = await fetchSnapshot(page.url);

  const snapshot = await prisma.monitoringSnapshot.create({
    data: {
      monitoredPageId: page.id,
      ...extractedSnapshot
    }
  });

  let event = await createMonitoringEvent(page, previousSnapshot, snapshot);

  await prisma.monitoredPage.update({
    where: { id: page.id },
    data: {
      lastCheckedAt: new Date(),
      nextCheckAt: getNextCheckAt(page.frequency),
      lastStatusCode: snapshot.statusCode,
      lastFinalUrl: snapshot.finalUrl,
      lastTitle: snapshot.title,
      lastSeverity: event?.severity || page.lastSeverity || 'info',
      lastEventAt: event ? new Date() : page.lastEventAt
    }
  });

  if (event && page.project.user.notificationsEnabled && options.notify !== false) {
    try {
      const telegramMessage = formatTelegramMessage(page, event, snapshot);
      const notificationSent = await notifyUser(page.project.user.telegramId, telegramMessage);
      if (notificationSent) {
        event = await prisma.monitoringEvent.update({
          where: { id: event.id },
          data: { notifiedAt: new Date() }
        });
      }
    } catch (error) {
      logger.error({ error, pageId: page.id }, 'Failed to send monitoring Telegram notification');
    }
  }

  return {
    snapshot,
    event
  };
}

export async function scheduleInitialCheck(monitoredPageId) {
  return runMonitoringCheck(monitoredPageId, { notify: false });
}

export async function createMonitoredPage(projectId, data) {
  await ensureMonitoringSchemaReady();

  const normalizedUrl = normalizeUrl(data.url);
  const frequency = data.frequency || '1h';
  const page = await prisma.monitoredPage.create({
    data: {
      projectId,
      url: normalizedUrl,
      normalizedUrl,
      label: data.label || null,
      frequency,
      frequencyMinutes: MONITORING_FREQUENCIES[frequency] || MONITORING_FREQUENCIES['1h'],
      nextCheckAt: new Date()
    }
  });

  await scheduleInitialCheck(page.id);

  return prisma.monitoredPage.findUnique({
    where: { id: page.id },
    include: {
      snapshots: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      events: {
        orderBy: { createdAt: 'desc' },
        take: 3
      }
    }
  });
}

export async function updateMonitoredPage(pageId, data) {
  await ensureMonitoringSchemaReady();

  const updateData = {};

  if (typeof data.label === 'string') {
    updateData.label = data.label || null;
  }

  if (data.frequency) {
    updateData.frequency = data.frequency;
    updateData.frequencyMinutes = MONITORING_FREQUENCIES[data.frequency] || MONITORING_FREQUENCIES['1h'];
    updateData.nextCheckAt = getNextCheckAt(data.frequency);
  }

  if (typeof data.isActive === 'boolean') {
    updateData.isActive = data.isActive;
    if (data.isActive) {
      updateData.nextCheckAt = new Date();
    }
  }

  return prisma.monitoredPage.update({
    where: { id: pageId },
    data: updateData,
    include: {
      snapshots: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      events: {
        orderBy: { createdAt: 'desc' },
        take: 3
      }
    }
  });
}

export async function getProjectMonitoringPages(projectId) {
  await ensureMonitoringSchemaReady();

  return prisma.monitoredPage.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    include: {
      snapshots: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      events: {
        orderBy: { createdAt: 'desc' },
        take: 3
      }
    }
  });
}

export async function getMonitoringPageEvents(pageId, limit = 20) {
  await ensureMonitoringSchemaReady();

  return prisma.monitoringEvent.findMany({
    where: { monitoredPageId: pageId },
    orderBy: { createdAt: 'desc' },
    take: limit
  });
}

export async function deleteMonitoringPage(pageId) {
  await ensureMonitoringSchemaReady();

  return prisma.monitoredPage.delete({
    where: { id: pageId }
  });
}

export async function processDueMonitoringChecks() {
  await ensureMonitoringSchemaReady();

  const duePages = await prisma.monitoredPage.findMany({
    where: {
      isActive: true,
      nextCheckAt: {
        lte: new Date()
      }
    },
    orderBy: { nextCheckAt: 'asc' },
    take: CHECK_BATCH_SIZE
  });

  for (const page of duePages) {
    try {
      await runMonitoringCheck(page.id);
    } catch (error) {
      logger.error({ error, pageId: page.id }, 'Monitoring check failed');
      await prisma.monitoredPage.update({
        where: { id: page.id },
        data: {
          lastCheckedAt: new Date(),
          nextCheckAt: getNextCheckAt(page.frequency),
          lastSeverity: 'critical'
        }
      });
    }
  }

  return duePages.length;
}
