import { expect, test } from 'vitest';
import { compareSnapshots, normalizeUrl } from '../../services/monitoringService.js';

test('normalizeUrl removes hashes and trailing slash', () => {
  expect(normalizeUrl('HTTPS://Example.com/pricing/#section')).toBe('https://example.com/pricing');
});

test('normalizeUrl rejects non-http protocols', () => {
  expect(() => normalizeUrl('ftp://example.com/file')).toThrow(/HTTP and HTTPS/);
});

test('compareSnapshots creates focused critical availability alert', () => {
  const previous = {
    id: 'prev',
    url: 'https://example.com/pricing',
    finalUrl: 'https://example.com/pricing',
    statusCode: 200,
    title: 'SEO Monitoring for Teams',
    h1: 'SEO Monitoring',
    metaDescription: 'Track page changes.',
    canonical: 'https://example.com/pricing',
    robotsMeta: 'index,follow',
    wordCount: 650,
    contentText: 'Useful content '.repeat(60),
    hasFaq: true,
    hasSchema: true
  };

  const current = {
    ...previous,
    statusCode: 404,
    canonical: 'https://example.com/new-pricing'
  };

  const diff = compareSnapshots(previous, current);

  expect(diff).toBeTruthy();
  expect(diff.severity).toBe('critical');
  expect(diff.changeTypes).toContain('status');
  expect(diff.changeTypes).not.toContain('canonical');
  expect(diff.title).toContain('Критично');
  expect(diff.summary).toContain('Что сделать');
  expect(diff.diff.readable.action).toContain('Проверьте доступность URL');
});

test('compareSnapshots marks warning for meaningful title change', () => {
  const previous = {
    id: 'prev',
    url: 'https://example.com/blog',
    finalUrl: 'https://example.com/blog',
    statusCode: 200,
    title: 'SEO Monitoring for Teams',
    h1: 'SEO Monitoring for Teams',
    metaDescription: 'Track page changes.',
    canonical: 'https://example.com/blog',
    robotsMeta: 'index,follow',
    wordCount: 400,
    contentText: 'Long body '.repeat(80),
    hasFaq: false,
    hasSchema: true
  };

  const current = {
    ...previous,
    title: 'SEO Alerts and Monitoring Platform'
  };

  const diff = compareSnapshots(previous, current);

  expect(diff).toBeTruthy();
  expect(diff.severity).toBe('warning');
  expect(diff.changeTypes[0]).toBe('title');
  expect(diff.diff.readable.primaryChange).toContain('Title');
});

test('compareSnapshots marks recovery as info alert', () => {
  const previous = {
    id: 'prev',
    url: 'https://example.com/status',
    finalUrl: 'https://example.com/status',
    statusCode: 0,
    title: null,
    h1: null,
    metaDescription: null,
    canonical: null,
    robotsMeta: null,
    wordCount: 0,
    contentText: null,
    hasFaq: false,
    hasSchema: false,
    fetchError: 'Request timed out'
  };

  const current = {
    ...previous,
    statusCode: 200,
    title: 'Status page',
    h1: 'Status',
    wordCount: 180,
    contentText: 'Service is healthy '.repeat(20),
    fetchError: null
  };

  const diff = compareSnapshots(previous, current);

  expect(diff).toBeTruthy();
  expect(diff.severity).toBe('info');
  expect(diff.title).toContain('снова отвечает');
  expect(diff.diff.readable.impact).toContain('снова отвечает');
});
