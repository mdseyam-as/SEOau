import { AI_CONFIG, getApiKey, getHeaders } from '../config/ai.js';
import logger from '../utils/logger.js';

const DEFAULT_FREE_MODELS = [
  'nvidia/nemotron-3-super-120b-a12b:free',
  'qwen/qwen3-next-80b-a3b-instruct:free',
  'google/gemma-4-31b-it:free',
  'openrouter/free'
];

function getConfiguredModelChain() {
  const fromEnv = String(process.env.COMPETITOR_WATCHER_LLM_MODELS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  return [...new Set(fromEnv.length > 0 ? fromEnv : DEFAULT_FREE_MODELS)];
}

function stripCodeFences(value = '') {
  return String(value)
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();
}

function extractJson(text = '') {
  const cleaned = stripCodeFences(text);
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    throw new Error('No JSON object found in LLM response');
  }

  return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
}

async function runJsonRequest({ systemPrompt, userPrompt, maxTokens = 900, temperature = 0.2 }) {
  let apiKey;

  try {
    apiKey = await getApiKey();
  } catch (error) {
    logger.debug({ error }, 'Competitor Watcher LLM skipped: OpenRouter API key is unavailable');
    return null;
  }

  const models = getConfiguredModelChain();

  try {
    const response = await fetch(`${AI_CONFIG.openRouterBaseUrl}/chat/completions`, {
      method: 'POST',
      headers: getHeaders(apiKey, 'SEO Generator - Competitor Watcher'),
      body: JSON.stringify({
        model: models[0],
        models,
        temperature,
        max_tokens: maxTokens,
        provider: {
          allow_fallbacks: true
        },
        messages: [
          {
            role: 'system',
            content: systemPrompt
          },
          {
            role: 'user',
            content: userPrompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(`OpenRouter request failed (${response.status}): ${errorText}`);
    }

    const payload = await response.json();
    const text = payload?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('Empty LLM response');
    }

    return {
      model: payload?.model || payload?.provider?.model || null,
      data: extractJson(text)
    };
  } catch (error) {
    logger.warn({ error, models }, 'Competitor Watcher LLM request failed, using rule-based fallback');
    return null;
  }
}

export async function enrichCompetitorChangeWithLlm({ competitor, change }) {
  const llmResult = await runJsonRequest({
    systemPrompt: [
      'You are a competitive intelligence analyst for SEO and product marketing.',
      'Return valid JSON only.',
      'Keep insights concise, strategic, and low-noise.',
      'Do not invent facts outside the provided change payload.'
    ].join(' '),
    userPrompt: JSON.stringify({
      task: 'Enrich a competitor site change with a sharper title, summary, why-important explanation, and one recommendation.',
      competitor: {
        name: competitor.name,
        domain: competitor.domain
      },
      change
    }),
    maxTokens: 700,
    temperature: 0.15
  });

  if (!llmResult?.data) {
    return null;
  }

  return {
    title: llmResult.data.title,
    summary: llmResult.data.summary,
    whyImportant: llmResult.data.whyImportant,
    recommendation: llmResult.data.recommendation,
    llmModel: llmResult.model
  };
}

export async function buildCompetitorWeeklySummaryWithLlm({ competitor, changes, comparisons, fallbackSummary }) {
  const llmResult = await runJsonRequest({
    systemPrompt: [
      'You are a senior competitive intelligence strategist.',
      'Return valid JSON only.',
      'Write for founders, SEO leads, and product marketers.',
      'Prioritize strategic moves over cosmetic edits.'
    ].join(' '),
    userPrompt: JSON.stringify({
      task: 'Create a short weekly digest for competitor monitoring.',
      competitor: {
        name: competitor.name,
        domain: competitor.domain
      },
      recentImportantChanges: changes,
      topTopicGaps: comparisons,
      fallbackSummary
    }),
    maxTokens: 900,
    temperature: 0.2
  });

  if (!llmResult?.data) {
    return null;
  }

  return {
    headline: llmResult.data.headline,
    bullets: Array.isArray(llmResult.data.bullets) ? llmResult.data.bullets.filter(Boolean).slice(0, 4) : [],
    recommendations: Array.isArray(llmResult.data.recommendations) ? llmResult.data.recommendations.filter(Boolean).slice(0, 4) : [],
    llmModel: llmResult.model
  };
}

export function getCompetitorWatcherModelChain() {
  return getConfiguredModelChain();
}
