import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // ==================== ТАРИФНЫЕ ПЛАНЫ ====================
  const plans = [
    {
      slug: 'free',
      name: 'Бесплатный',
      maxChars: 3000,
      maxGenerationsPerMonth: 5,
      maxGenerationsPerDay: 2,
      maxKeywords: 20,
      allowedModels: ['google/gemini-3-flash-preview', 'x-ai/grok-2-1212'],
      canCheckSpam: false,
      canOptimizeRelevance: false,
      canUseGeoMode: false,
      canGenerateFaq: false,
      canUseSocialPack: false,
      priceRub: 0,
      durationDays: 0,
      isDefault: true,
      isActive: true,
    },
    {
      slug: 'pro',
      name: 'Pro',
      maxChars: 8000,
      maxGenerationsPerMonth: 100,
      maxGenerationsPerDay: 20,
      maxKeywords: 50,
      allowedModels: [
        'google/gemini-3-flash-preview',
        'google/gemini-pro-1.5',
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'anthropic/claude-3.5-sonnet',
        'x-ai/grok-2-1212',
      ],
      canCheckSpam: true,
      canOptimizeRelevance: true,
      canUseGeoMode: true,
      canGenerateFaq: true,
      canUseSocialPack: true,
      priceRub: 990,
      durationDays: 30,
      isDefault: false,
      isActive: true,
    },
    {
      slug: 'unlimited',
      name: 'Unlimited',
      maxChars: 15000,
      maxGenerationsPerMonth: 0, // unlimited
      maxGenerationsPerDay: 0, // unlimited
      maxKeywords: 0, // unlimited
      allowedModels: [
        'google/gemini-3-flash-preview',
        'google/gemini-pro-1.5',
        'google/gemini-2.0-pro-exp-02-05',
        'openai/gpt-4o',
        'openai/gpt-4o-mini',
        'openai/o1-mini',
        'anthropic/claude-3.5-sonnet',
        'anthropic/claude-3-opus',
        'anthropic/claude-3.5-haiku',
        'x-ai/grok-2-1212',
        'x-ai/grok-beta',
        'deepseek/deepseek-r1',
        'deepseek/deepseek-chat',
        'qwen/qwen-max',
        'meta-llama/llama-3.3-70b-instruct',
      ],
      canCheckSpam: true,
      canOptimizeRelevance: true,
      canUseGeoMode: true,
      canGenerateFaq: true,
      canUseSocialPack: true,
      priceRub: 2990,
      durationDays: 30,
      isDefault: false,
      isActive: true,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: plan,
      create: plan,
    });
    console.log(`  ✅ Plan "${plan.name}" created/updated`);
  }

  // ==================== СИСТЕМНЫЕ НАСТРОЙКИ ====================
  await prisma.systemSetting.upsert({
    where: { id: 'global' },
    update: {},
    create: {
      id: 'global',
      telegramLink: 'https://t.me/bankkz_admin',
      spamCheckModel: 'x-ai/grok-2-1212',
    },
  });
  console.log('  ✅ System settings initialized');

  console.log('🎉 Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
