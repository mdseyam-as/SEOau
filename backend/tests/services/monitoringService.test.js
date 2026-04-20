import test from 'node:test';
import assert from 'node:assert/strict';
import { compareSnapshots, normalizeUrl } from '../../services/monitoringService.js';

test('normalizeUrl removes hashes and trailing slash', () => {
  assert.equal(
    normalizeUrl('HTTPS://Example.com/pricing/#section'),
    'https://example.com/pricing'
  );
});

test('compareSnapshots marks critical issues for broken status and canonical change', () => {
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

  assert.ok(diff);
  assert.equal(diff.severity, 'critical');
  assert.ok(diff.changeTypes.includes('status'));
  assert.ok(diff.changeTypes.includes('canonical'));
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

  assert.ok(diff);
  assert.equal(diff.severity, 'warning');
  assert.equal(diff.changeTypes[0], 'title');
});
