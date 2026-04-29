import { expect, test } from 'vitest';
import {
  classifyCompetitorPageType,
  compareCompetitorSnapshots,
  deriveTopicKey,
  normalizeUrl
} from '../../services/competitorWatcherService.js';

test('normalizeUrl normalizes competitor URLs', () => {
  expect(normalizeUrl('HTTPS://Competitor.com/pricing/?utm_source=test#section')).toBe('https://competitor.com/pricing');
});

test('classifyCompetitorPageType detects strategic comparison pages', () => {
  expect(
    classifyCompetitorPageType({
      url: 'https://competitor.com/compare/seoau-vs-competitor',
      title: 'SEOau vs Competitor',
      h1: 'Compare SEOau vs Competitor'
    })
  ).toBe('comparison');
});

test('deriveTopicKey keeps page type context for competitor coverage', () => {
  const topicKey = deriveTopicKey({
    url: 'https://competitor.com/integrations/slack',
    title: 'Slack Integration',
    h1: 'Connect Slack to Alerts',
    h2List: ['Two-way sync', 'Instant alerts'],
    pageType: 'integration'
  });

  expect(topicKey).toMatch(/^integration:/);
  expect(topicKey).toMatch(/slack|alerts/);
});

test('compareCompetitorSnapshots marks new strategic page as important', () => {
  const current = {
    url: 'https://competitor.com/pricing',
    normalizedUrl: 'https://competitor.com/pricing',
    pageType: 'pricing',
    topicKey: 'pricing:plans',
    wordCount: 700,
    h2List: ['Plans', 'FAQ'],
    h3List: [],
    faqQuestions: ['How much does it cost?'],
    isDeletedPage: false
  };

  const diff = compareCompetitorSnapshots(null, current, {
    initialScan: false,
    competitorName: 'Competitor'
  });

  expect(diff).toBeTruthy();
  expect(diff.changeType).toBe('newPage');
  expect(diff.isImportant).toBe(true);
  expect(diff.severity).toBe('critical');
});

test('compareCompetitorSnapshots detects FAQ and title shifts', () => {
  const previous = {
    url: 'https://competitor.com/features/monitoring',
    normalizedUrl: 'https://competitor.com/features/monitoring',
    title: 'SEO Monitoring',
    h1: 'SEO Monitoring',
    h2List: ['Overview', 'Use cases'],
    h3List: [],
    faqQuestions: [],
    canonical: 'https://competitor.com/features/monitoring',
    pageType: 'feature',
    topicKey: 'feature:monitoring',
    wordCount: 500,
    isDeletedPage: false
  };

  const current = {
    ...previous,
    title: 'SEO Monitoring Platform for Agencies',
    h2List: ['Overview', 'Use cases', 'ROI'],
    faqQuestions: ['Can agencies white-label monitoring?', 'How fast are alerts?'],
    wordCount: 740
  };

  const diff = compareCompetitorSnapshots(previous, current, {
    initialScan: false,
    competitorName: 'Competitor'
  });

  expect(diff).toBeTruthy();
  expect(diff.isImportant).toBe(true);
  expect(diff.changeTypes).toContain('title');
  expect(diff.changeTypes).toContain('faq');
});
