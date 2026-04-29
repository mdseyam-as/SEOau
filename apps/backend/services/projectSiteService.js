import crypto from 'crypto';
import { ensureProjectSiteSchemaReady } from '../lib/projectSiteSchema.js';
import { prisma } from '../lib/prisma.js';
import logger from '../utils/logger.js';
import {
  classifyCompetitorPageType,
  deriveTopicKey,
  normalizeUrl
} from './competitorWatcherService.js';

const PROJECT_SITE_FREQUENCIES = {
  '15m': 15,
  '1h': 60,
  '1d': 24 * 60
};

const SCAN_TIMEOUT_MS = 15000;
const SCAN_BATCH_SIZE = 4;
const MAX_SITEMAP_FILES = 6;
const MAX_PROJECT_SITE_URLS = 60;
const MAX_INTERNAL_LINKS = 50;

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

function uniqueValues(values) {
  return [...new Set(values.filter(Boolean))];
}

function getWords(value = '') {
  return sanitizeText(value, 50000)
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

function hashValue(value = '') {
  return crypto.createHash('sha1').update(String(value)).digest('hex');
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

function getUrlPath(url) {
  try {
    const { pathname } = new URL(url);
    return pathname || '/';
  } catch {
    return url;
  }
}

function normalizeDomain(input) {
  const hostname = new URL(normalizeUrl(input)).hostname.toLowerCase();
  return hostname.replace(/^www\./, '');
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

async function fetchText(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': 'SEOau Project Site/1.0 (+https://seoau.app)',
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

function scoreSiteUrl(url, domain) {
  const path = getUrlPath(url).toLowerCase();
  let score = path === '/' ? 100 : 0;
  if (path.includes('pricing') || path.includes('price') || path.includes('tariff')) score += 80;
  if (path.includes('integr') || path.includes('feature') || path.includes('solution')) score += 60;
  if (path.includes('industry') || path.includes('use-case') || path.includes('case')) score += 55;
  if (path.includes('blog') || path.includes('docs') || path.includes('help')) score += 20;
  score -= path.split('/').length * 4;
  if (!isSameDomain(url, domain)) score -= 200;
  return score;
}

function rankUrls(urls, domain) {
  return [...urls].sort((left, right) => scoreSiteUrl(right, domain) - scoreSiteUrl(left, domain));
}

async function discoverProjectSiteUrls(homepageUrl) {
  const rootUrl = buildRootUrl(homepageUrl);
  const domain = normalizeDomain(homepageUrl);
  const discovered = new Set([normalizeUrl(rootUrl)]);
  const sitemapQueue = [normalizeUrl(new URL('/sitemap.xml', rootUrl).toString())];
  const visitedSitemaps = new Set();

  while (sitemapQueue.length > 0 && visitedSitemaps.size < MAX_SITEMAP_FILES && discovered.size < MAX_PROJECT_SITE_URLS * 2) {
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
      logger.debug({ error, sitemapUrl }, 'Failed to fetch project sitemap');
    }
  }

  if (discovered.size <= 1) {
    try {
      const { response, text } = await fetchText(rootUrl);
      extractInternalLinks(text, response?.url || rootUrl, domain).forEach((url) => discovered.add(url));
    } catch (error) {
      logger.debug({ error, rootUrl }, 'Failed to fallback-crawl project homepage');
    }
  }

  return rankUrls(discovered, domain).slice(0, MAX_PROJECT_SITE_URLS);
}

async function fetchProjectSiteSnapshot(url, homepageUrl) {
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
      fetchError: error.message || 'Failed to fetch project page',
      isDeletedPage: false
    };
  }
}

async function getLatestSnapshotsByUrl(projectSiteId) {
  const snapshots = await prisma.projectSitePageSnapshot.findMany({
    where: { projectSiteId },
    orderBy: { scannedAt: 'desc' }
  });

  const byUrl = new Map();
  for (const snapshot of snapshots) {
    if (!byUrl.has(snapshot.normalizedUrl)) {
      byUrl.set(snapshot.normalizedUrl, snapshot);
    }
  }

  return byUrl;
}

function pageTypePriority(pageType = 'page') {
  const priorities = {
    homepage: 100,
    pricing: 90,
    comparison: 85,
    integration: 80,
    'use-case': 76,
    industry: 72,
    feature: 68,
    product: 64,
    blog: 40,
    page: 30
  };

  return priorities[pageType] || 20;
}

function buildTopicCoverage(currentPages) {
  const counts = new Map();
  for (const page of currentPages) {
    const topicKey = page.topicKey || deriveTopicKey({
      url: page.url,
      title: page.title || '',
      h1: page.h1 || '',
      h2List: page.h2List || [],
      pageType: page.pageType || classifyCompetitorPageType({ url: page.url, title: page.title || '', h1: page.h1 || '' })
    });

    const existing = counts.get(topicKey) || {
      topicKey,
      label: getTopicLabel(topicKey),
      pageType: String(topicKey).split(':')[0] || page.pageType || 'page',
      count: 0
    };
    existing.count += 1;
    counts.set(topicKey, existing);
  }

  return [...counts.values()].sort((left, right) => right.count - left.count).slice(0, 12);
}

function getCurrentPagesFromMap(snapshotMap) {
  return [...snapshotMap.values()]
    .filter((snapshot) => !snapshot.isDeletedPage)
    .sort((left, right) => {
      const priorityDelta = pageTypePriority(right.pageType) - pageTypePriority(left.pageType);
      if (priorityDelta !== 0) return priorityDelta;
      if ((right.wordCount || 0) !== (left.wordCount || 0)) {
        return (right.wordCount || 0) - (left.wordCount || 0);
      }
      return scoreSiteUrl(right.url, normalizeDomain(right.url)) - scoreSiteUrl(left.url, normalizeDomain(left.url));
    });
}

function buildSiteSummary(site, currentPages, topicCoverage) {
  if (!currentPages.length) {
    return `${site.name || site.domain}: пока нет активных страниц для анализа.`;
  }

  return `${site.name || site.domain}: ${currentPages.length} страниц в покрытии и ${topicCoverage.length} тем в модуле "Мы".`;
}

async function hydrateProjectSiteEntity(site) {
  if (!site) return null;

  const latestByUrl = await getLatestSnapshotsByUrl(site.id);
  const currentPages = getCurrentPagesFromMap(latestByUrl);
  const topicCoverage = buildTopicCoverage(currentPages);

  return {
    ...site,
    currentPages: currentPages.slice(0, 60),
    topicCoverage,
    lastSummary: site.lastSummary || buildSiteSummary(site, currentPages, topicCoverage)
  };
}

function getNextScanAt(frequency) {
  const minutes = PROJECT_SITE_FREQUENCIES[frequency] || PROJECT_SITE_FREQUENCIES['1d'];
  return new Date(Date.now() + minutes * 60 * 1000);
}

function buildAnchorText(page) {
  const rawValue = sanitizeText(page.h1 || page.title || '', 120);
  if (rawValue) return rawValue;

  const path = getUrlPath(page.url)
    .split('/')
    .filter(Boolean)
    .pop();
  return sanitizeText(path?.replace(/[-_]+/g, ' ') || 'Внутренняя страница', 120);
}

function buildKeywordsForLink(page) {
  return uniqueValues(
    getWords([page.title, page.h1, ...(page.h2List || []).slice(0, 4)].join(' '))
      .filter((word) => word.length > 2)
      .slice(0, 6)
  );
}

function linkPriorityFromPage(page) {
  return Math.min(10, Math.max(1, Math.round(pageTypePriority(page.pageType) / 10)));
}

export async function getProjectSite(projectId) {
  await ensureProjectSiteSchemaReady();

  const site = await prisma.projectSite.findUnique({
    where: { projectId }
  });

  return hydrateProjectSiteEntity(site);
}

export async function createProjectSite(projectId, data) {
  await ensureProjectSiteSchemaReady();

  const homepageUrl = buildRootUrl(data.homepageUrl);
  const frequency = data.scanFrequency || '1d';
  const domain = normalizeDomain(homepageUrl);
  const projectSite = await prisma.projectSite.create({
    data: {
      projectId,
      name: sanitizeText(data.name || domain, 160) || domain,
      domain,
      normalizedDomain: domain,
      homepageUrl,
      scanFrequency: frequency,
      frequencyMinutes: PROJECT_SITE_FREQUENCIES[frequency] || PROJECT_SITE_FREQUENCIES['1d'],
      nextScanAt: new Date()
    }
  });

  await scanProjectSite(projectSite.id);
  return getProjectSite(projectId);
}

export async function updateProjectSite(siteId, data) {
  await ensureProjectSiteSchemaReady();

  const updateData = {};
  if (typeof data.name === 'string') {
    updateData.name = sanitizeText(data.name, 160) || null;
  }
  if (data.scanFrequency) {
    updateData.scanFrequency = data.scanFrequency;
    updateData.frequencyMinutes = PROJECT_SITE_FREQUENCIES[data.scanFrequency] || PROJECT_SITE_FREQUENCIES['1d'];
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

  const updated = await prisma.projectSite.update({
    where: { id: siteId },
    data: updateData
  });

  return hydrateProjectSiteEntity(updated);
}

export async function deleteProjectSite(siteId) {
  await ensureProjectSiteSchemaReady();
  return prisma.projectSite.delete({
    where: { id: siteId }
  });
}

export async function scanProjectSite(siteId) {
  await ensureProjectSiteSchemaReady();

  const site = await prisma.projectSite.findUnique({
    where: { id: siteId }
  });

  if (!site) {
    throw new Error('Project site not found');
  }

  const previousLatestByUrl = await getLatestSnapshotsByUrl(site.id);
  const isInitialScan = !site.lastScannedAt;
  const discoveredUrls = await discoverProjectSiteUrls(site.homepageUrl);
  const currentUrlSet = new Set(discoveredUrls);

  for (const url of discoveredUrls) {
    const snapshotData = await fetchProjectSiteSnapshot(url, site.homepageUrl);
    await prisma.projectSitePageSnapshot.create({
      data: {
        projectSiteId: site.id,
        ...snapshotData
      }
    });
  }

  if (!isInitialScan) {
    for (const [normalizedUrl, previousSnapshot] of previousLatestByUrl.entries()) {
      if (previousSnapshot.isDeletedPage || currentUrlSet.has(normalizedUrl)) continue;

      await prisma.projectSitePageSnapshot.create({
        data: {
          projectSiteId: site.id,
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
          fetchError: 'URL disappeared from project site discovery set',
          isDeletedPage: true
        }
      });
    }
  }

  const currentPages = getCurrentPagesFromMap(await getLatestSnapshotsByUrl(site.id));
  const topicCoverage = buildTopicCoverage(currentPages);
  const lastStatus = currentPages.length > 0 && currentPages.every((page) => (page.statusCode || 0) >= 200 && (page.statusCode || 0) < 400)
    ? 'healthy'
    : currentPages.length > 0
      ? 'warning'
      : 'error';

  const lastSummary = buildSiteSummary(site, currentPages, topicCoverage);
  await prisma.projectSite.update({
    where: { id: site.id },
    data: {
      lastScannedAt: new Date(),
      nextScanAt: getNextScanAt(site.scanFrequency),
      lastStatus,
      lastPageCount: currentPages.length,
      lastSummary
    }
  });

  return getProjectSite(site.projectId);
}

export async function importProjectSiteLinks(siteId, userId) {
  await ensureProjectSiteSchemaReady();

  const site = await prisma.projectSite.findUnique({
    where: { id: siteId }
  });

  if (!site) {
    throw new Error('Project site not found');
  }

  const latestByUrl = await getLatestSnapshotsByUrl(site.id);
  const currentPages = getCurrentPagesFromMap(latestByUrl);
  const existingLinks = await prisma.internalLinks.findMany({
    where: { userId },
    select: { id: true, url: true }
  });

  const existingUrlSet = new Set(existingLinks.map((link) => link.url));
  const remainingSlots = Math.max(0, MAX_INTERNAL_LINKS - existingLinks.length);
  const candidates = currentPages
    .filter((page) => !existingUrlSet.has(page.url))
    .sort((left, right) => pageTypePriority(right.pageType) - pageTypePriority(left.pageType));

  const toCreate = candidates.slice(0, remainingSlots).map((page) => ({
    userId,
    url: page.url,
    anchorText: buildAnchorText(page),
    keywords: buildKeywordsForLink(page),
    priority: linkPriorityFromPage(page)
  }));

  if (toCreate.length > 0) {
    await prisma.internalLinks.createMany({
      data: toCreate
    });
  }

  await prisma.projectSite.update({
    where: { id: site.id },
    data: {
      lastImportedAt: new Date()
    }
  });

  return {
    imported: toCreate.length,
    skipped: Math.max(0, candidates.length - toCreate.length) + currentPages.filter((page) => existingUrlSet.has(page.url)).length,
    limitReached: toCreate.length < candidates.length,
    totalLinks: existingLinks.length + toCreate.length
  };
}

export async function processDueProjectSiteScans() {
  await ensureProjectSiteSchemaReady();

  const dueSites = await prisma.projectSite.findMany({
    where: {
      isActive: true,
      nextScanAt: {
        lte: new Date()
      }
    },
    orderBy: { nextScanAt: 'asc' },
    take: SCAN_BATCH_SIZE
  });

  for (const site of dueSites) {
    try {
      await scanProjectSite(site.id);
    } catch (error) {
      logger.error({ error, projectSiteId: site.id }, 'Project site scan failed');
      await prisma.projectSite.update({
        where: { id: site.id },
        data: {
          lastScannedAt: new Date(),
          nextScanAt: getNextScanAt(site.scanFrequency),
          lastStatus: 'error',
          lastSummary: 'Scan failed. Проверьте доступность сайта и настройки модуля "Мы".'
        }
      });
    }
  }

  return dueSites.length;
}
