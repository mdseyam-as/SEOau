import crypto from 'crypto';
import { ensureCompetitorWatcherSchemaReady } from '../lib/competitorWatcherSchema.js';
import { ensureProjectSiteSchemaReady } from '../lib/projectSiteSchema.js';
import { prisma } from '../lib/prisma.js';
import { notifyUser } from '../utils/subscriptionManager.js';
import logger from '../utils/logger.js';
import {
  buildCompetitorWeeklySummaryWithLlm,
  enrichCompetitorChangeWithLlm
} from './competitorWatcherLlmService.js';

const COMPETITOR_FREQUENCIES = {
  '15m': 15,
  '1h': 60,
  '1d': 24 * 60
};

const SCAN_TIMEOUT_MS = 15000;
const SCAN_BATCH_SIZE = 5;
const MAX_SITEMAP_FILES = 6;
const MAX_URLS_BY_PRIORITY = {
  high: 40,
  medium: 25,
  low: 15
};

const STRATEGIC_PAGE_TYPES = new Set(['pricing', 'comparison', 'integration', 'use-case', 'industry', 'feature', 'product']);
const PAGE_TYPE_KEYWORDS = [
  ['pricing', ['pricing', 'price', 'plan', 'plans', 'tariff', 'tariffs', 'стоимость', 'цена', 'тариф']],
  ['comparison', ['vs', 'versus', 'compare', 'comparison', 'alternative', 'alternatives', 'сравнение', 'аналог', 'аналоги']],
  ['integration', ['integration', 'integrations', 'api', 'zapier', 'slack', 'hubspot', 'crm', 'интеграц']],
  ['use-case', ['use-case', 'use case', 'for ', 'template', 'workflow', 'сценар', 'для ', 'кейсы']],
  ['industry', ['industry', 'industries', 'agency', 'agencies', 'ecommerce', 'saas', 'finance', 'bank', 'медицин', 'отрасл', 'ниша']],
  ['feature', ['feature', 'features', 'tool', 'tools', 'solution', 'platform', 'функц', 'возможност']],
  ['product', ['product', 'products', 'service', 'services', 'software', 'app', 'продукт', 'сервис']],
  ['blog', ['blog', 'guide', 'academy', 'learn', 'article', 'resources', 'help', 'docs', 'faq', 'блог', 'руководство', 'статья']]
];

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'your', 'you', 'our', 'their', 'about', 'into', 'what', 'when',
  'как', 'что', 'для', 'или', 'это', 'при', 'под', 'про', 'над', 'без', 'его', 'её', 'наш', 'ваш', 'they', 'them',
  'www', 'com', 'net', 'org', 'app', 'page', 'pages', 'home', 'index'
]);

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function decodeHtmlEntities(value = '') {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

function stripTags(html = '') {
  return decodeHtmlEntities(
    html
      .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  );
}

function sanitizeText(value = '', limit = 400) {
  return decodeHtmlEntities(String(value || ''))
    .replace(/\s+/g, ' ')
    .replace(/\u00A0/g, ' ')
    .trim()
    .slice(0, limit);
}

function getWords(value = '') {
  return sanitizeText(value, 50000)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function similarityScore(left = '', right = '') {
  if (!left && !right) return 1;
  const leftWords = new Set(getWords(left));
  const rightWords = new Set(getWords(right));
  if (!leftWords.size || !rightWords.size) return 0;

  let matches = 0;
  for (const word of leftWords) {
    if (rightWords.has(word)) matches += 1;
  }

  return matches / Math.max(leftWords.size, rightWords.size);
}

function buildMetaTagRegex(attributeName, attributeValue) {
  return new RegExp(
    `<meta\\b[^>]*${attributeName}\\s*=\\s*["']${escapeRegex(attributeValue)}["'][^>]*content\\s*=\\s*["']([^"']*)["'][^>]*>`,
    'i'
  );
}

function extractMetaContent(html, attributeName, attributeValue) {
  const match = html.match(buildMetaTagRegex(attributeName, attributeValue));
  return match ? sanitizeText(match[1], 1000) : '';
}

function extractLinkHref(html, relValue) {
  const match = html.match(new RegExp(`<link\\b[^>]*rel\\s*=\\s*["']${escapeRegex(relValue)}["'][^>]*href\\s*=\\s*["']([^"']+)["'][^>]*>`, 'i'));
  return match ? sanitizeText(match[1], 1000) : '';
}

function extractFirstTagText(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? sanitizeText(stripTags(match[1]), 1000) : '';
}

function extractTagTexts(html, tagName, limit = 12) {
  const matches = [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'gi'))];
  return matches
    .map((match) => sanitizeText(stripTags(match[1]), 280))
    .filter(Boolean)
    .slice(0, limit);
}

function extractBodyContent(html) {
  const mainMatch = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) return mainMatch[1];

  const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) return articleMatch[1];

  const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

function hashValue(value = '') {
  return crypto.createHash('sha1').update(String(value)).digest('hex');
}

function toSlug(value = '') {
  return sanitizeText(value, 200)
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeUrl(input) {
  try {
    const normalized = new URL(input);
    normalized.hash = '';
    normalized.search = '';
    if (!normalized.pathname) {
      normalized.pathname = '/';
    }
    if (normalized.pathname !== '/' && normalized.pathname.endsWith('/')) {
      normalized.pathname = normalized.pathname.slice(0, -1);
    }
    return normalized.toString();
  } catch {
    throw new Error('Invalid URL');
  }
}

function normalizeDomain(input) {
  const hostname = new URL(normalizeUrl(input)).hostname.toLowerCase();
  return hostname.replace(/^www\./, '');
}

function getUrlPath(url) {
  try {
    const { pathname } = new URL(url);
    return pathname || '/';
  } catch {
    return url;
  }
}

function buildRootUrl(url) {
  const parsed = new URL(normalizeUrl(url));
  return `${parsed.protocol}//${parsed.host}/`;
}

function normalizeRelativeUrl(value, baseUrl) {
  if (!value) return '';
  try {
    return normalizeUrl(new URL(value, baseUrl).toString());
  } catch {
    return sanitizeText(value, 1000);
  }
}

function isSameDomain(url, domain) {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return hostname === domain;
  } catch {
    return false;
  }
}

function calculateWordDelta(previous = 0, current = 0) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function pageTypeImpact(pageType) {
  if (pageType === 'comparison') return 36;
  if (pageType === 'pricing') return 32;
  if (pageType === 'integration' || pageType === 'use-case' || pageType === 'industry') return 28;
  if (pageType === 'feature' || pageType === 'product') return 24;
  if (pageType === 'blog') return 14;
  return 18;
}

function severityRank(severity) {
  return { critical: 3, warning: 2, info: 1 }[severity] || 0;
}

function pickHigherSeverity(current, next) {
  return severityRank(next) > severityRank(current) ? next : current;
}

function tokenizeTopic(value = '') {
  return getWords(value)
    .map((word) => word.toLowerCase())
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractFaqQuestions(html) {
  const questionMatches = [
    ...html.matchAll(/"@type"\s*:\s*"Question"[\s\S]*?"name"\s*:\s*"([^"]+)"/gi),
    ...html.matchAll(/<(?:h2|h3|summary|button|dt)\b[^>]*>([^<]{8,180}\?[^<]*)<\/(?:h2|h3|summary|button|dt)>/gi)
  ];

  return uniqueValues(
    questionMatches
      .map((match) => sanitizeText(stripTags(match[1]), 180))
      .filter((value) => value.includes('?'))
  ).slice(0, 12);
}

function extractInternalLinks(html, baseUrl, domain) {
  const links = [...html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi)];
  return uniqueValues(
    links
      .map((match) => normalizeRelativeUrl(match[1], baseUrl))
      .filter((url) => isSameDomain(url, domain))
  ).slice(0, 80);
}

function extractCtaText(html) {
  const matches = [
    ...html.matchAll(/<(?:a|button)\b[^>]*>([\s\S]*?)<\/(?:a|button)>/gi)
  ];

  const ctas = matches
    .map((match) => sanitizeText(stripTags(match[1]), 120))
    .filter((value) => /demo|trial|start|contact|book|pricing|quote|signup|sign up|try|buy|request|заказать|демо|тариф|начать|связаться|купить|подключить/i.test(value));

  return ctas[0] || null;
}

export function classifyCompetitorPageType({ url, title = '', h1 = '' }) {
  const haystack = `${getUrlPath(url)} ${title} ${h1}`.toLowerCase();
  for (const [pageType, keywords] of PAGE_TYPE_KEYWORDS) {
    if (keywords.some((keyword) => haystack.includes(keyword))) {
      return pageType;
    }
  }

  return getUrlPath(url) === '/' ? 'homepage' : 'page';
}

export function deriveTopicKey({ url, title = '', h1 = '', h2List = [], pageType = 'page' }) {
  const pathParts = getUrlPath(url)
    .split('/')
    .map((part) => sanitizeText(part, 80).toLowerCase())
    .filter(Boolean);

  const source = [title, h1, ...h2List.slice(0, 4), ...pathParts].join(' ');
  const tokens = uniqueValues(tokenizeTopic(source));
  const primaryTokens = tokens.slice(0, 2);
  const suffix = primaryTokens.length ? primaryTokens.join('-') : toSlug(pathParts[pathParts.length - 1] || title || h1 || pageType);
  return `${pageType}:${suffix || pageType}`;
}

function getTopicLabel(topicKey = '') {
  const [pageType, suffix] = String(topicKey).split(':');
  const formattedSuffix = String(suffix || pageType || 'topic')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  const pageTypeLabels = {
    pricing: 'Pricing',
    comparison: 'Comparison',
    integration: 'Integration',
    'use-case': 'Use Case',
    industry: 'Industry',
    feature: 'Feature',
    product: 'Product',
    blog: 'Content',
    homepage: 'Homepage',
    page: 'Page'
  };

  return `${pageTypeLabels[pageType] || 'Topic'}: ${formattedSuffix}`;
}

function structureSimilarity(previous = [], current = []) {
  return similarityScore(previous.join(' '), current.join(' '));
}

function getChangeRisk(type, change) {
  const risks = {
    newPage: 'Конкурент расширяет покрытие и может перехватывать новый интент.',
    removedPage: 'Возможно, конкурент сворачивает сегмент или переносит URL.',
    title: 'Мог измениться поисковый фокус и позиционирование страницы.',
    h1: 'Вероятно, сместился основной месседж страницы.',
    headings: 'Изменилась структура аргументов и subtopics на странице.',
    faq: 'Конкурент усилил покрытие вопросов и rich snippet потенциал.',
    content: change.deltaPercent < 0 ? 'Контент сократился, возможно меняется оффер.' : 'Контент заметно вырос и может закрывать больше интентов.',
    canonical: 'Изменение canonical может означать консолидацию или смену SEO-цели.',
    pageType: 'Страница изменила назначение или шаблон подачи.',
    newCluster: 'Появился новый тематический сегмент, который может стать точкой роста конкурента.'
  };

  return risks[type] || 'Изменение может повлиять на стратегию контента и SEO.';
}

function addDiffChange(changes, change) {
  changes.push({
    ...change,
    before: change.before ?? null,
    after: change.after ?? null,
    risk: change.risk || getChangeRisk(change.type, change)
  });
}

export function compareCompetitorSnapshots(previous, current, context = {}) {
  const changes = [];

  if (!previous) {
    if (context.initialScan) return null;
    const severity = STRATEGIC_PAGE_TYPES.has(current.pageType) ? 'critical' : 'warning';
    addDiffChange(changes, {
      type: 'newPage',
      severity,
      before: null,
      after: current.url,
      changed: `Появилась новая ${current.pageType || 'страница'}`
    });
  } else if (current.isDeletedPage) {
    const severity = STRATEGIC_PAGE_TYPES.has(previous.pageType) ? 'critical' : 'warning';
    addDiffChange(changes, {
      type: 'removedPage',
      severity,
      before: previous.url,
      after: null,
      changed: `Страница ${getUrlPath(previous.url)} исчезла из текущего покрытия`
    });
  } else {
    if (sanitizeText(previous.title || '', 1000) !== sanitizeText(current.title || '', 1000)) {
      const similarity = similarityScore(previous.title || '', current.title || '');
      addDiffChange(changes, {
        type: 'title',
        severity: similarity < 0.45 ? 'warning' : 'info',
        before: previous.title,
        after: current.title,
        changed: 'Изменился title'
      });
    }

    if (sanitizeText(previous.h1 || '', 1000) !== sanitizeText(current.h1 || '', 1000)) {
      const similarity = similarityScore(previous.h1 || '', current.h1 || '');
      addDiffChange(changes, {
        type: 'h1',
        severity: similarity < 0.45 ? 'warning' : 'info',
        before: previous.h1,
        after: current.h1,
        changed: 'Изменился H1'
      });
    }

    const headingSimilarity = structureSimilarity(
      [...(previous.h2List || []), ...(previous.h3List || [])],
      [...(current.h2List || []), ...(current.h3List || [])]
    );

    if (headingSimilarity < 0.65) {
      addDiffChange(changes, {
        type: 'headings',
        severity: headingSimilarity < 0.35 ? 'warning' : 'info',
        before: (previous.h2List || []).join(' • ') || '—',
        after: (current.h2List || []).join(' • ') || '—',
        changed: 'Изменилась структура заголовков'
      });
    }

    const previousFaqCount = previous.faqQuestions?.length || 0;
    const currentFaqCount = current.faqQuestions?.length || 0;
    if ((previousFaqCount === 0 && currentFaqCount > 0) || Math.abs(currentFaqCount - previousFaqCount) >= 2) {
      addDiffChange(changes, {
        type: 'faq',
        severity: currentFaqCount > previousFaqCount ? 'warning' : 'info',
        before: previousFaqCount ? previous.faqQuestions.join(' • ') : 'FAQ отсутствовал',
        after: currentFaqCount ? current.faqQuestions.join(' • ') : 'FAQ отсутствует',
        changed: currentFaqCount > previousFaqCount ? 'Появился или вырос FAQ-блок' : 'FAQ-блок сократился'
      });
    }

    const deltaPercent = calculateWordDelta(previous.wordCount, current.wordCount);
    if (previous.wordCount >= 200 && Math.abs(deltaPercent) >= 25) {
      addDiffChange(changes, {
        type: 'content',
        severity: Math.abs(deltaPercent) >= 45 ? 'warning' : 'info',
        before: previous.contentText || `${previous.wordCount} слов`,
        after: current.contentText || `${current.wordCount} слов`,
        changed: `Объем текста изменился на ${deltaPercent > 0 ? '+' : ''}${deltaPercent}%`,
        deltaPercent
      });
    }

    if (sanitizeText(previous.canonical || '', 1000) !== sanitizeText(current.canonical || '', 1000)) {
      addDiffChange(changes, {
        type: 'canonical',
        severity: 'warning',
        before: previous.canonical,
        after: current.canonical,
        changed: 'Изменился canonical'
      });
    }

    if ((previous.pageType || 'page') !== (current.pageType || 'page')) {
      addDiffChange(changes, {
        type: 'pageType',
        severity: STRATEGIC_PAGE_TYPES.has(current.pageType) ? 'warning' : 'info',
        before: previous.pageType || 'page',
        after: current.pageType || 'page',
        changed: 'Страница сменила тип или шаблон подачи'
      });
    }
  }

  if (!changes.length) {
    return null;
  }

  const impactScore = pageTypeImpact(current.pageType || previous?.pageType || 'page');
  const baseScore = changes.reduce((score, change) => {
    const weights = {
      newPage: 52,
      removedPage: 48,
      title: 28,
      h1: 28,
      headings: 22,
      faq: 24,
      content: 20,
      canonical: 26,
      pageType: 26,
      newCluster: 60
    };
    return score + (weights[change.type] || 18);
  }, 0);

  const significanceScore = Math.min(100, baseScore + impactScore + (changes.length > 1 ? 8 : 0));
  const severity = changes.reduce((max, change) => pickHigherSeverity(max, change.severity), 'info');
  const isImportant = significanceScore >= 60 || severity === 'critical';
  const primaryChange = changes.find((change) => change.severity === severity) || changes[0];
  const pagePath = getUrlPath(current.url || previous?.url || context.homepageUrl || '/');
  const title = primaryChange.type === 'newPage'
    ? `${severity.toUpperCase()}: новый URL у ${context.competitorName || 'конкурента'}`
    : primaryChange.type === 'removedPage'
      ? `${severity.toUpperCase()}: удалена страница ${pagePath}`
      : primaryChange.type === 'faq'
        ? `${severity.toUpperCase()}: FAQ changed on ${pagePath}`
        : `${severity.toUpperCase()}: changes detected on ${pagePath}`;

  const whyImportant = isImportant
    ? `${getTopicLabel(current.topicKey || previous?.topicKey || current.pageType || 'page')} получил значимое изменение.`
    : 'Изменение сохранено в истории, но не считается достаточно сильным для шумного алерта.';

  return {
    severity,
    isImportant,
    significanceScore,
    impactScore,
    title,
    summary: changes.map((change) => `${change.changed}. Риск: ${change.risk}`).join(' '),
    changeType: primaryChange.type,
    changeTypes: uniqueValues(changes.map((change) => change.type)),
    diff: {
      summary: title,
      changes,
      explainability: {
        whyImportant,
        significanceScore,
        impactScore,
        pageType: current.pageType || previous?.pageType || 'page',
        topicKey: current.topicKey || previous?.topicKey || null
      },
      metrics: {
        previousWordCount: previous?.wordCount || 0,
        currentWordCount: current.wordCount || 0,
        deltaPercent: calculateWordDelta(previous?.wordCount || 0, current.wordCount || 0)
      }
    }
  };
}

function buildHomepageSummary(competitor, stats) {
  return `${competitor.name}: ${stats.importantChanges} важных сигналов, ${stats.newPages} новых страниц, ${stats.newClusters} новых кластеров за последний scan.`;
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatCompetitorTelegramMessage(competitor, changes, summary) {
  const lines = [
    `<b>Competitor Watcher</b>`,
    `<b>${escapeHtml(competitor.name)}</b> • ${escapeHtml(competitor.domain)}`,
    escapeHtml(summary)
  ];

  for (const change of changes.slice(0, 4)) {
    lines.push('');
    lines.push(`<b>${escapeHtml(change.severity.toUpperCase())}</b> • ${escapeHtml(change.changeType)}`);
    lines.push(escapeHtml(change.title));
    const topChange = change.diff?.changes?.[0];
    if (topChange?.before) {
      lines.push(`Before: ${escapeHtml(sanitizeText(topChange.before, 120))}`);
    }
    if (topChange?.after) {
      lines.push(`After: ${escapeHtml(sanitizeText(topChange.after, 120))}`);
    }
    if (change.diff?.explainability?.whyImportant) {
      lines.push(`Why: ${escapeHtml(sanitizeText(change.diff.explainability.whyImportant, 140))}`);
    }
  }

  return lines.join('\n');
}

function getNextScanAt(frequency) {
  const minutes = COMPETITOR_FREQUENCIES[frequency] || COMPETITOR_FREQUENCIES['1d'];
  return new Date(Date.now() + minutes * 60 * 1000);
}

async function fetchText(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'SEOau Competitor Watcher/1.0 (+https://seoau.app)',
        'accept-language': 'ru,en;q=0.9'
      }
    });

    const contentType = response.headers.get('content-type') || '';
    const text = /html|xml|text/i.test(contentType) ? await response.text() : '';
    return { response, text };
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseSitemapLocs(xml = '') {
  return uniqueValues(
    [...xml.matchAll(/<loc>([\s\S]*?)<\/loc>/gi)]
      .map((match) => sanitizeText(decodeHtmlEntities(match[1]), 2000))
      .filter(Boolean)
  );
}

function rankUrls(urls, domain) {
  const scoreUrl = (url) => {
    const path = getUrlPath(url).toLowerCase();
    let score = path === '/' ? 100 : 0;
    if (path.includes('pricing') || path.includes('compare') || path.includes('vs')) score += 80;
    if (path.includes('integr') || path.includes('feature') || path.includes('solution')) score += 60;
    if (path.includes('industry') || path.includes('use-case') || path.includes('case')) score += 55;
    if (path.includes('blog') || path.includes('docs') || path.includes('help')) score += 20;
    score -= path.split('/').length * 4;
    if (!isSameDomain(url, domain)) score -= 200;
    return score;
  };

  return [...urls].sort((left, right) => scoreUrl(right) - scoreUrl(left));
}

async function discoverCompetitorUrls(homepageUrl, priority = 'medium') {
  const rootUrl = buildRootUrl(homepageUrl);
  const domain = normalizeDomain(homepageUrl);
  const maxUrls = MAX_URLS_BY_PRIORITY[priority] || MAX_URLS_BY_PRIORITY.medium;
  const discovered = new Set([normalizeUrl(rootUrl)]);
  const sitemapQueue = [normalizeUrl(new URL('/sitemap.xml', rootUrl).toString())];
  const visitedSitemaps = new Set();

  while (sitemapQueue.length > 0 && visitedSitemaps.size < MAX_SITEMAP_FILES && discovered.size < maxUrls * 2) {
    const sitemapUrl = sitemapQueue.shift();
    if (!sitemapUrl || visitedSitemaps.has(sitemapUrl)) continue;
    visitedSitemaps.add(sitemapUrl);

    try {
      const { text } = await fetchText(sitemapUrl);
      const locs = parseSitemapLocs(text);
      for (const loc of locs) {
        const normalized = normalizeRelativeUrl(loc, sitemapUrl);
        if (!normalized) continue;
        if (/\.xml$/i.test(new URL(normalized).pathname)) {
          if (!visitedSitemaps.has(normalized) && sitemapQueue.length < MAX_SITEMAP_FILES * 2) {
            sitemapQueue.push(normalized);
          }
        } else if (isSameDomain(normalized, domain)) {
          discovered.add(normalized);
        }
      }
    } catch (error) {
      logger.debug({ error, sitemapUrl }, 'Failed to fetch competitor sitemap');
    }
  }

  if (discovered.size <= 1) {
    try {
      const { response, text } = await fetchText(rootUrl);
      extractInternalLinks(text, response?.url || rootUrl, domain).forEach((url) => discovered.add(url));
    } catch (error) {
      logger.debug({ error, rootUrl }, 'Failed to fallback-crawl competitor homepage');
    }
  }

  return rankUrls(discovered, domain).slice(0, maxUrls);
}

async function fetchCompetitorSnapshot(url, homepageUrl) {
  const domain = normalizeDomain(homepageUrl);
  try {
    const { response, text } = await fetchText(url);
    const finalUrl = response?.url ? normalizeUrl(response.url) : normalizeUrl(url);
    const title = extractFirstTagText(text, 'title') || null;
    const h1 = extractFirstTagText(text, 'h1') || null;
    const h2List = extractTagTexts(text, 'h2', 16);
    const h3List = extractTagTexts(text, 'h3', 20);
    const metaDescription =
      extractMetaContent(text, 'name', 'description') ||
      extractMetaContent(text, 'property', 'og:description') ||
      null;
    const canonical = extractLinkHref(text, 'canonical')
      ? normalizeRelativeUrl(extractLinkHref(text, 'canonical'), finalUrl)
      : null;
    const faqQuestions = extractFaqQuestions(text);
    const contentText = sanitizeText(stripTags(extractBodyContent(text)), 25000) || null;
    const wordCount = getWords(contentText || '').length;
    const ctaText = extractCtaText(text);
    const internalLinks = extractInternalLinks(text, finalUrl, domain);
    const pageType = classifyCompetitorPageType({ url: finalUrl, title: title || '', h1: h1 || '' });
    const topicKey = deriveTopicKey({ url: finalUrl, title: title || '', h1: h1 || '', h2List, pageType });
    const structureHash = hashValue([pageType, h1, ...h2List, ...h3List, ...faqQuestions, ctaText || ''].join('|'));

    return {
      url: normalizeUrl(url),
      normalizedUrl: normalizeUrl(url),
      finalUrl,
      statusCode: response?.status || 0,
      title,
      h1,
      h2List,
      h3List,
      metaDescription,
      canonical,
      faqQuestions,
      contentText,
      wordCount,
      contentHash: contentText ? hashValue(contentText) : null,
      structureHash,
      ctaText,
      internalLinks,
      pageType,
      topicKey,
      semanticSummary: `${getTopicLabel(topicKey)} • ${wordCount} слов • FAQ: ${faqQuestions.length}`,
      fetchError: null,
      isDeletedPage: false
    };
  } catch (error) {
    const normalized = normalizeUrl(url);
    const pageType = classifyCompetitorPageType({ url: normalized, title: '', h1: '' });
    const topicKey = deriveTopicKey({ url: normalized, title: '', h1: '', h2List: [], pageType });
    return {
      url: normalized,
      normalizedUrl: normalized,
      finalUrl: normalized,
      statusCode: 0,
      title: null,
      h1: null,
      h2List: [],
      h3List: [],
      metaDescription: null,
      canonical: null,
      faqQuestions: [],
      contentText: null,
      wordCount: 0,
      contentHash: null,
      structureHash: hashValue(normalized),
      ctaText: null,
      internalLinks: [],
      pageType,
      topicKey,
      semanticSummary: `${getTopicLabel(topicKey)} • страница недоступна`,
      fetchError: error.message || 'Failed to fetch competitor page',
      isDeletedPage: false
    };
  }
}

async function createStoredChange(competitor, currentSnapshot, previousSnapshot, comparison) {
  if (!comparison) {
    return null;
  }

  return prisma.competitorPageChange.create({
    data: {
      competitorId: competitor.id,
      snapshotId: currentSnapshot?.id || null,
      previousSnapshotId: previousSnapshot?.id || null,
      url: currentSnapshot?.url || previousSnapshot?.url || competitor.homepageUrl,
      normalizedUrl: currentSnapshot?.normalizedUrl || previousSnapshot?.normalizedUrl || normalizeUrl(competitor.homepageUrl),
      severity: comparison.severity,
      changeType: comparison.changeType,
      changeTypes: comparison.changeTypes,
      pageType: currentSnapshot?.pageType || previousSnapshot?.pageType || null,
      topicKey: currentSnapshot?.topicKey || previousSnapshot?.topicKey || null,
      significanceScore: comparison.significanceScore,
      impactScore: comparison.impactScore,
      isImportant: comparison.isImportant,
      title: comparison.title,
      summary: comparison.summary,
      diff: comparison.diff
    }
  });
}

async function getLatestSnapshotsByUrl(competitorId) {
  const snapshots = await prisma.competitorPageSnapshot.findMany({
    where: { competitorId },
    orderBy: { scannedAt: 'desc' }
  });

  const latestByUrl = new Map();
  for (const snapshot of snapshots) {
    if (!latestByUrl.has(snapshot.normalizedUrl)) {
      latestByUrl.set(snapshot.normalizedUrl, snapshot);
    }
  }

  return latestByUrl;
}

function buildClusterGroups(snapshots) {
  const groups = new Map();
  for (const snapshot of snapshots) {
    if (snapshot.isDeletedPage) continue;
    const key = snapshot.topicKey || `${snapshot.pageType || 'page'}:${snapshot.pageType || 'general'}`;
    const current = groups.get(key) || {
      key,
      name: getTopicLabel(key),
      keywords: [],
      pageCount: 0,
      snapshots: []
    };

    current.pageCount += 1;
    current.snapshots.push(snapshot);
    current.keywords.push(...(key.split(':')[1] || '').split('-'));
    groups.set(key, current);
  }

  return [...groups.values()].map((group) => ({
    ...group,
    keywords: uniqueValues(group.keywords.filter((keyword) => keyword.length > 2))
  }));
}

async function syncTopicClusters(competitor, activeSnapshots, options = {}) {
  const now = new Date();
  const groups = buildClusterGroups(activeSnapshots);
  const existingClusters = await prisma.topicCluster.findMany({
    where: { competitorId: competitor.id }
  });
  const existingByKey = new Map(existingClusters.map((cluster) => [cluster.key, cluster]));

  const createdClusterChanges = [];

  for (const group of groups) {
    const existing = existingByKey.get(group.key);
    const trendScore = group.pageCount - (existing?.pageCount || 0);

    await prisma.topicCluster.upsert({
      where: {
        competitorId_key: {
          competitorId: competitor.id,
          key: group.key
        }
      },
      update: {
        name: group.name,
        keywords: group.keywords,
        pageCount: group.pageCount,
        trendScore,
        lastSeenAt: now
      },
      create: {
        competitorId: competitor.id,
        key: group.key,
        name: group.name,
        keywords: group.keywords,
        pageCount: group.pageCount,
        trendScore,
        firstSeenAt: now,
        lastSeenAt: now
      }
    });

    if (!options.initialScan && !existing && (group.pageCount >= 2 || STRATEGIC_PAGE_TYPES.has(String(group.key).split(':')[0]))) {
      const comparison = {
        severity: group.pageCount >= 2 ? 'critical' : 'warning',
        isImportant: true,
        significanceScore: Math.min(100, 64 + pageTypeImpact(String(group.key).split(':')[0])),
        impactScore: pageTypeImpact(String(group.key).split(':')[0]),
        title: `CRITICAL: new cluster detected on ${competitor.domain}`,
        summary: `У конкурента появился новый кластер ${group.name} (${group.pageCount} стр.).`,
        changeType: 'newCluster',
        changeTypes: ['newCluster'],
        diff: {
          summary: `Новый кластер: ${group.name}`,
          changes: [{
            type: 'newCluster',
            severity: group.pageCount >= 2 ? 'critical' : 'warning',
            before: null,
            after: `${group.name} (${group.pageCount} стр.)`,
            changed: `Появился новый тематический кластер ${group.name}`,
            risk: getChangeRisk('newCluster', {})
          }],
          explainability: {
            whyImportant: 'Несколько страниц начали покрывать новый сегмент спроса или новый GTM-направление конкурента.',
            significanceScore: Math.min(100, 64 + pageTypeImpact(String(group.key).split(':')[0])),
            impactScore: pageTypeImpact(String(group.key).split(':')[0]),
            pageType: String(group.key).split(':')[0],
            topicKey: group.key
          }
        }
      };

      const stored = await createStoredChange(competitor, null, null, comparison);
      if (stored) {
        createdClusterChanges.push(stored);
      }
    }
  }

  const activeKeys = new Set(groups.map((group) => group.key));
  for (const cluster of existingClusters) {
    if (!activeKeys.has(cluster.key) && cluster.pageCount !== 0) {
      await prisma.topicCluster.update({
        where: { id: cluster.id },
        data: {
          pageCount: 0,
          trendScore: -cluster.pageCount
        }
      });
    }
  }

  const updatedClusters = await prisma.topicCluster.findMany({
    where: {
      competitorId: competitor.id,
      pageCount: { gt: 0 }
    },
    orderBy: [
      { pageCount: 'desc' },
      { updatedAt: 'desc' }
    ],
    take: 8
  });

  return { clusters: updatedClusters, createdClusterChanges };
}

async function buildOurTopicCoverage(projectId) {
  await ensureProjectSiteSchemaReady();

  const projectSite = await prisma.projectSite.findUnique({
    where: { projectId },
    select: { id: true }
  });

  if (projectSite) {
    const projectSiteSnapshots = await prisma.projectSitePageSnapshot.findMany({
      where: { projectSiteId: projectSite.id },
      orderBy: { scannedAt: 'desc' }
    });

    const latestByUrl = new Map();
    for (const snapshot of projectSiteSnapshots) {
      if (!latestByUrl.has(snapshot.normalizedUrl)) {
        latestByUrl.set(snapshot.normalizedUrl, snapshot);
      }
    }

    const currentPages = [...latestByUrl.values()].filter((snapshot) => !snapshot.isDeletedPage);
    if (currentPages.length > 0) {
      const counts = new Map();
      const increment = (topicKey, label) => {
        const current = counts.get(topicKey) || { topicKey, label, count: 0 };
        current.count += 1;
        counts.set(topicKey, current);
      };

      for (const page of currentPages) {
        const topicKey = page.topicKey || deriveTopicKey({
          url: page.url,
          title: page.title || '',
          h1: page.h1 || '',
          h2List: page.h2List || [],
          pageType: page.pageType || classifyCompetitorPageType({ url: page.url, title: page.title || '', h1: page.h1 || '' })
        });
        increment(topicKey, getTopicLabel(topicKey));
      }

      return [...counts.values()];
    }
  }

  const history = await prisma.history.findMany({
    where: { projectId },
    select: {
      topic: true,
      targetUrl: true
    }
  });

  const monitoredPages = await prisma.monitoredPage.findMany({
    where: { projectId },
    include: {
      snapshots: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  const counts = new Map();
  const increment = (topicKey, label) => {
    const current = counts.get(topicKey) || { topicKey, label, count: 0 };
    current.count += 1;
    counts.set(topicKey, current);
  };

  for (const item of history) {
    const topicKey = deriveTopicKey({
      url: item.targetUrl || 'https://project.local/',
      title: item.topic || '',
      h1: item.topic || '',
      h2List: [],
      pageType: classifyCompetitorPageType({ url: item.targetUrl || 'https://project.local/', title: item.topic || '', h1: item.topic || '' })
    });
    increment(topicKey, getTopicLabel(topicKey));
  }

  for (const page of monitoredPages) {
    const latest = page.snapshots?.[0];
    const topicKey = deriveTopicKey({
      url: page.url,
      title: latest?.title || page.label || '',
      h1: latest?.h1 || page.label || '',
      h2List: [],
      pageType: classifyCompetitorPageType({ url: page.url, title: latest?.title || page.label || '', h1: latest?.h1 || page.label || '' })
    });
    increment(topicKey, getTopicLabel(topicKey));
  }

  return [...counts.values()];
}

function bestCoverageForTopic(topicKey, ourCoverage) {
  const [theirPageType, theirKeyword] = String(topicKey).split(':');
  const theirTokens = new Set(tokenizeTopic(`${theirPageType} ${theirKeyword || ''}`));

  let best = null;
  for (const item of ourCoverage) {
    const [ourPageType, ourKeyword] = String(item.topicKey).split(':');
    const theirPageTypeMatches = ourPageType === theirPageType;
    const ourTokens = new Set(tokenizeTopic(`${ourPageType} ${ourKeyword || ''}`));
    let matches = 0;
    for (const token of theirTokens) {
      if (ourTokens.has(token)) matches += 1;
    }
    const similarity = matches / Math.max(theirTokens.size || 1, ourTokens.size || 1);
    if (theirPageTypeMatches || similarity >= 0.35) {
      if (!best || similarity > best.similarity || (similarity === best.similarity && item.count > best.count)) {
        best = { ...item, similarity };
      }
    }
  }

  return best;
}

async function syncCompetitorComparisons(competitor, activeSnapshots) {
  const competitorTopics = buildClusterGroups(activeSnapshots).map((group) => ({
    topicKey: group.key,
    label: group.name,
    count: group.pageCount
  }));
  const ourCoverage = await buildOurTopicCoverage(competitor.projectId);
  const activeTopicKeys = new Set();

  for (const topic of competitorTopics) {
    activeTopicKeys.add(topic.topicKey);
    const bestCoverage = bestCoverageForTopic(topic.topicKey, ourCoverage);
    const ourCoverageCount = bestCoverage?.count || 0;

    await prisma.competitorComparison.upsert({
      where: {
        competitorId_topicKey: {
          competitorId: competitor.id,
          topicKey: topic.topicKey
        }
      },
      update: {
        ourTopic: bestCoverage?.label || 'Нет явного покрытия',
        theirTopic: topic.label,
        ourCoverage: ourCoverageCount,
        theirCoverage: topic.count,
        gapSummary: ourCoverageCount >= topic.count
          ? `У нас покрытие по теме ${topic.label} не слабее конкурента.`
          : `Конкурент сильнее по теме ${topic.label}: ${topic.count} стр. против ${ourCoverageCount}.`,
        recommendation: ourCoverageCount >= topic.count
          ? 'Поддерживайте качество и обновляйте сильные страницы.'
          : `Нужно усилить тему ${topic.label}: добавить страницы или расширить существующие материалы.`
      },
      create: {
        competitorId: competitor.id,
        topicKey: topic.topicKey,
        ourTopic: bestCoverage?.label || 'Нет явного покрытия',
        theirTopic: topic.label,
        ourCoverage: ourCoverageCount,
        theirCoverage: topic.count,
        gapSummary: ourCoverageCount >= topic.count
          ? `У нас покрытие по теме ${topic.label} не слабее конкурента.`
          : `Конкурент сильнее по теме ${topic.label}: ${topic.count} стр. против ${ourCoverageCount}.`,
        recommendation: ourCoverageCount >= topic.count
          ? 'Поддерживайте качество и обновляйте сильные страницы.'
          : `Нужно усилить тему ${topic.label}: добавить страницы или расширить существующие материалы.`
      }
    });
  }

  if (activeTopicKeys.size > 0) {
    await prisma.competitorComparison.deleteMany({
      where: {
        competitorId: competitor.id,
        topicKey: {
          notIn: [...activeTopicKeys]
        }
      }
    });
  } else {
    await prisma.competitorComparison.deleteMany({
      where: { competitorId: competitor.id }
    });
  }

  const comparisons = await prisma.competitorComparison.findMany({
    where: { competitorId: competitor.id }
  });

  return comparisons.sort((left, right) => (right.theirCoverage - right.ourCoverage) - (left.theirCoverage - left.ourCoverage));
}

async function getUserNotificationMeta(competitorId) {
  return prisma.competitor.findUnique({
    where: { id: competitorId },
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
      }
    }
  });
}

function sortChangesByImportance(changes) {
  return [...changes].sort((left, right) => {
    if (right.isImportant !== left.isImportant) {
      return Number(right.isImportant) - Number(left.isImportant);
    }
    if (right.significanceScore !== left.significanceScore) {
      return right.significanceScore - left.significanceScore;
    }
    return severityRank(right.severity) - severityRank(left.severity);
  });
}

async function enrichImportantChangesWithLlm(competitor, changes) {
  const importantChanges = changes
    .filter((change) => change.isImportant)
    .slice(0, 3);

  for (const change of importantChanges) {
    try {
      const enrichment = await enrichCompetitorChangeWithLlm({ competitor, change });
      if (!enrichment) continue;

      const nextDiff = {
        ...change.diff,
        explainability: {
          ...(change.diff?.explainability || {}),
          whyImportant: enrichment.whyImportant || change.diff?.explainability?.whyImportant,
          recommendation: enrichment.recommendation || change.diff?.explainability?.recommendation,
          llmModel: enrichment.llmModel || change.diff?.explainability?.llmModel
        }
      };

      const updated = await prisma.competitorPageChange.update({
        where: { id: change.id },
        data: {
          title: enrichment.title || change.title,
          summary: enrichment.summary || change.summary,
          diff: nextDiff
        }
      });

      change.title = updated.title;
      change.summary = updated.summary;
      change.diff = updated.diff;
    } catch (error) {
      logger.debug({ error, changeId: change.id }, 'Failed to enrich competitor change with LLM');
    }
  }
}

export async function scanCompetitor(competitorId, options = {}) {
  await ensureCompetitorWatcherSchemaReady();

  const competitor = await prisma.competitor.findUnique({
    where: { id: competitorId },
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
      }
    }
  });

  if (!competitor) {
    throw new Error('Competitor not found');
  }

  const isInitialScan = !competitor.lastScannedAt;
  const previousLatestByUrl = await getLatestSnapshotsByUrl(competitor.id);
  const discoveredUrls = await discoverCompetitorUrls(competitor.homepageUrl, competitor.priority);
  const currentUrlSet = new Set(discoveredUrls);
  const createdSnapshots = [];
  const createdChanges = [];

  for (const url of discoveredUrls) {
    const snapshotData = await fetchCompetitorSnapshot(url, competitor.homepageUrl);
    const snapshot = await prisma.competitorPageSnapshot.create({
      data: {
        competitorId: competitor.id,
        ...snapshotData
      }
    });
    createdSnapshots.push(snapshot);

    const previousSnapshot = previousLatestByUrl.get(snapshot.normalizedUrl) || null;
    const comparison = compareCompetitorSnapshots(previousSnapshot, snapshot, {
      initialScan: isInitialScan,
      competitorName: competitor.name,
      homepageUrl: competitor.homepageUrl
    });
    const change = await createStoredChange(competitor, snapshot, previousSnapshot, comparison);
    if (change) {
      createdChanges.push(change);
    }
  }

  if (!isInitialScan) {
    for (const [normalizedUrl, previousSnapshot] of previousLatestByUrl.entries()) {
      if (previousSnapshot.isDeletedPage || currentUrlSet.has(normalizedUrl)) continue;

      const deletedSnapshot = await prisma.competitorPageSnapshot.create({
        data: {
          competitorId: competitor.id,
          url: previousSnapshot.url,
          normalizedUrl: previousSnapshot.normalizedUrl,
          finalUrl: previousSnapshot.finalUrl,
          statusCode: 0,
          title: previousSnapshot.title,
          h1: previousSnapshot.h1,
          h2List: previousSnapshot.h2List,
          h3List: previousSnapshot.h3List,
          metaDescription: previousSnapshot.metaDescription,
          canonical: previousSnapshot.canonical,
          faqQuestions: previousSnapshot.faqQuestions,
          contentText: previousSnapshot.contentText,
          wordCount: previousSnapshot.wordCount,
          contentHash: previousSnapshot.contentHash,
          structureHash: previousSnapshot.structureHash,
          ctaText: previousSnapshot.ctaText,
          internalLinks: previousSnapshot.internalLinks,
          pageType: previousSnapshot.pageType,
          topicKey: previousSnapshot.topicKey,
          semanticSummary: previousSnapshot.semanticSummary,
          fetchError: 'URL disappeared from competitor discovery set',
          isDeletedPage: true
        }
      });

      const comparison = compareCompetitorSnapshots(previousSnapshot, deletedSnapshot, {
        initialScan: false,
        competitorName: competitor.name,
        homepageUrl: competitor.homepageUrl
      });
      const change = await createStoredChange(competitor, deletedSnapshot, previousSnapshot, comparison);
      if (change) {
        createdChanges.push(change);
      }
    }
  }

  const latestSnapshotsByUrl = await getLatestSnapshotsByUrl(competitor.id);
  const activeSnapshots = [...latestSnapshotsByUrl.values()].filter((snapshot) => !snapshot.isDeletedPage);
  const { clusters, createdClusterChanges } = await syncTopicClusters(competitor, activeSnapshots, { initialScan: isInitialScan });
  createdChanges.push(...createdClusterChanges);
  const comparisons = await syncCompetitorComparisons(competitor, activeSnapshots);

  const sortedChanges = sortChangesByImportance(createdChanges);
  await enrichImportantChangesWithLlm(competitor, sortedChanges);
  const importantChanges = sortedChanges.filter((change) => change.isImportant);
  const stats = {
    importantChanges: importantChanges.length,
    newPages: createdChanges.filter((change) => change.changeType === 'newPage').length,
    newClusters: createdChanges.filter((change) => change.changeType === 'newCluster').length
  };
  const lastSeverity = sortedChanges.reduce((max, change) => pickHigherSeverity(max, change.severity), competitor.lastSeverity || 'info');
  const summary = buildHomepageSummary(competitor, stats);

  await prisma.competitor.update({
    where: { id: competitor.id },
    data: {
      lastScannedAt: new Date(),
      nextScanAt: getNextScanAt(competitor.scanFrequency),
      lastStatus: importantChanges.some((change) => change.severity === 'critical') ? 'warning' : 'healthy',
      lastPageCount: activeSnapshots.length,
      lastChangeCount: createdChanges.length,
      lastClusterCount: clusters.length,
      lastSummary: summary,
      lastSeverity,
      lastImportantChangeAt: importantChanges[0] ? new Date() : competitor.lastImportantChangeAt
    }
  });

  if (importantChanges.length > 0 && competitor.project.user.notificationsEnabled && options.notify !== false) {
    try {
      const message = formatCompetitorTelegramMessage(competitor, importantChanges, summary);
      await notifyUser(competitor.project.user.telegramId, message);
      await prisma.competitorPageChange.updateMany({
        where: {
          id: {
            in: importantChanges.map((change) => change.id)
          }
        },
        data: {
          notifiedAt: new Date()
        }
      });
    } catch (error) {
      logger.error({ error, competitorId: competitor.id }, 'Failed to send Competitor Watcher notification');
    }
  }

  const hydratedCompetitor = await prisma.competitor.findUnique({
    where: { id: competitor.id },
    include: {
      pageChanges: {
        orderBy: { detectedAt: 'desc' },
        take: 6
      },
      topicClusters: {
        where: { pageCount: { gt: 0 } },
        orderBy: { pageCount: 'desc' },
        take: 6
      },
      comparisons: true
    }
  });

  return {
    competitor: hydratedCompetitor,
    changes: sortedChanges,
    weeklySummary: await getCompetitorWeeklySummary(competitor.id, 7)
  };
}

export async function createCompetitor(projectId, data) {
  await ensureCompetitorWatcherSchemaReady();

  const homepageUrl = buildRootUrl(data.homepageUrl);
  const frequency = data.scanFrequency || '1d';
  const domain = normalizeDomain(homepageUrl);
  const competitor = await prisma.competitor.create({
    data: {
      projectId,
      name: sanitizeText(data.name || domain, 160) || domain,
      domain,
      normalizedDomain: domain,
      homepageUrl,
      priority: data.priority || 'medium',
      scanFrequency: frequency,
      frequencyMinutes: COMPETITOR_FREQUENCIES[frequency] || COMPETITOR_FREQUENCIES['1d'],
      notes: data.notes || null,
      nextScanAt: new Date()
    }
  });

  await scanCompetitor(competitor.id, { notify: false });

  return prisma.competitor.findUnique({
    where: { id: competitor.id },
    include: {
      pageChanges: {
        orderBy: { detectedAt: 'desc' },
        take: 6
      },
      topicClusters: {
        where: { pageCount: { gt: 0 } },
        orderBy: { pageCount: 'desc' },
        take: 6
      },
      comparisons: true
    }
  });
}

export async function updateCompetitor(competitorId, data) {
  await ensureCompetitorWatcherSchemaReady();

  const updateData = {};
  if (typeof data.name === 'string') {
    const normalizedName = sanitizeText(data.name, 160);
    if (normalizedName) {
      updateData.name = normalizedName;
    }
  }
  if (typeof data.notes === 'string') {
    updateData.notes = data.notes || null;
  }
  if (data.priority) {
    updateData.priority = data.priority;
  }
  if (data.scanFrequency) {
    updateData.scanFrequency = data.scanFrequency;
    updateData.frequencyMinutes = COMPETITOR_FREQUENCIES[data.scanFrequency] || COMPETITOR_FREQUENCIES['1d'];
    updateData.nextScanAt = getNextScanAt(data.scanFrequency);
  }
  if (typeof data.isActive === 'boolean') {
    updateData.isActive = data.isActive;
    if (data.isActive) {
      updateData.nextScanAt = new Date();
    }
  }
  if (data.homepageUrl) {
    const homepageUrl = buildRootUrl(data.homepageUrl);
    const domain = normalizeDomain(homepageUrl);
    updateData.homepageUrl = homepageUrl;
    updateData.domain = domain;
    updateData.normalizedDomain = domain;
  }

  return prisma.competitor.update({
    where: { id: competitorId },
    data: updateData,
    include: {
      pageChanges: {
        orderBy: { detectedAt: 'desc' },
        take: 6
      },
      topicClusters: {
        where: { pageCount: { gt: 0 } },
        orderBy: { pageCount: 'desc' },
        take: 6
      },
      comparisons: true
    }
  });
}

export async function deleteCompetitor(competitorId) {
  await ensureCompetitorWatcherSchemaReady();
  return prisma.competitor.delete({
    where: { id: competitorId }
  });
}

export async function getProjectCompetitors(projectId) {
  await ensureCompetitorWatcherSchemaReady();

  const competitors = await prisma.competitor.findMany({
    where: { projectId },
    orderBy: { createdAt: 'desc' },
    include: {
      pageChanges: {
        orderBy: { detectedAt: 'desc' },
        take: 6
      },
      topicClusters: {
        where: { pageCount: { gt: 0 } },
        orderBy: { pageCount: 'desc' },
        take: 6
      },
      comparisons: true
    }
  });

  return competitors.map((competitor) => ({
    ...competitor,
    comparisons: [...competitor.comparisons].sort((left, right) => (right.theirCoverage - right.ourCoverage) - (left.theirCoverage - left.ourCoverage))
  }));
}

export async function getCompetitorChanges(competitorId, limit = 20) {
  await ensureCompetitorWatcherSchemaReady();
  return prisma.competitorPageChange.findMany({
    where: { competitorId },
    orderBy: { detectedAt: 'desc' },
    take: limit
  });
}

export async function getCompetitorComparison(competitorId) {
  await ensureCompetitorWatcherSchemaReady();
  const comparisons = await prisma.competitorComparison.findMany({
    where: { competitorId }
  });
  return comparisons.sort((left, right) => (right.theirCoverage - right.ourCoverage) - (left.theirCoverage - left.ourCoverage));
}

export async function getCompetitorWeeklySummary(competitorId, days = 7) {
  await ensureCompetitorWatcherSchemaReady();

  const competitor = await prisma.competitor.findUnique({
    where: { id: competitorId }
  });
  if (!competitor) {
    throw new Error('Competitor not found');
  }

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const changes = await prisma.competitorPageChange.findMany({
    where: {
      competitorId,
      detectedAt: { gte: since }
    },
    orderBy: { detectedAt: 'desc' },
    take: 50
  });

  const comparisons = await getCompetitorComparison(competitorId);
  const importantChanges = changes.filter((change) => change.isImportant);
  const criticalChanges = importantChanges.filter((change) => change.severity === 'critical');
  const newClusters = importantChanges.filter((change) => change.changeType === 'newCluster').length;
  const newPages = importantChanges.filter((change) => change.changeType === 'newPage').length;
  const gaps = comparisons.filter((item) => item.theirCoverage > item.ourCoverage).slice(0, 3);

  const fallbackSummary = {
    periodDays: days,
    headline: `${competitor.name}: ${importantChanges.length} значимых сигналов за ${days} дн.`,
    metrics: {
      importantChanges: importantChanges.length,
      criticalChanges: criticalChanges.length,
      newPages,
      newClusters,
      topicGaps: gaps.length
    },
    bullets: [
      importantChanges[0]?.title || 'Пока без сильных изменений.',
      criticalChanges[0]?.summary || null,
      gaps[0] ? `Главный gap: ${gaps[0].theirTopic} (${gaps[0].theirCoverage} vs ${gaps[0].ourCoverage})` : null
    ].filter(Boolean),
    recommendations: gaps.map((gap) => gap.recommendation)
  };

  if (importantChanges.length === 0) {
    return fallbackSummary;
  }

  try {
    const llmSummary = await buildCompetitorWeeklySummaryWithLlm({
      competitor,
      changes: importantChanges.slice(0, 6),
      comparisons: gaps,
      fallbackSummary
    });

    if (!llmSummary) {
      return fallbackSummary;
    }

    return {
      ...fallbackSummary,
      headline: llmSummary.headline || fallbackSummary.headline,
      bullets: llmSummary.bullets?.length ? llmSummary.bullets : fallbackSummary.bullets,
      recommendations: llmSummary.recommendations?.length ? llmSummary.recommendations : fallbackSummary.recommendations,
      llmModel: llmSummary.llmModel
    };
  } catch (error) {
    logger.debug({ error, competitorId }, 'Falling back to rule-based weekly summary');
    return fallbackSummary;
  }
}

export async function processDueCompetitorScans() {
  await ensureCompetitorWatcherSchemaReady();

  const dueCompetitors = await prisma.competitor.findMany({
    where: {
      isActive: true,
      nextScanAt: {
        lte: new Date()
      }
    },
    orderBy: { nextScanAt: 'asc' },
    take: SCAN_BATCH_SIZE
  });

  for (const competitor of dueCompetitors) {
    try {
      await scanCompetitor(competitor.id);
    } catch (error) {
      logger.error({ error, competitorId: competitor.id }, 'Competitor scan failed');
      await prisma.competitor.update({
        where: { id: competitor.id },
        data: {
          lastScannedAt: new Date(),
          nextScanAt: getNextScanAt(competitor.scanFrequency),
          lastStatus: 'error',
          lastSeverity: 'critical',
          lastSummary: 'Scan failed. Проверьте доступность сайта конкурента и настройки модуля.'
        }
      });
    }
  }

  return dueCompetitors.length;
}
