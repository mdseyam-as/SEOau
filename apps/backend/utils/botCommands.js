import TelegramBot from 'node-telegram-bot-api';

const WEBAPP_URL = process.env.WEBAPP_URL || process.env.FRONTEND_URL;

export function setupWebAppCommands(bot) {
    if (!bot) {
        console.error('Bot not initialized');
        return;
    }

    // /start command - показываем кнопку WebApp
    bot.onText(/\/start/, async (msg) => {
        const chatId = msg.chat.id;
        const userName = msg.from.first_name || 'Пользователь';

        console.log('⚡ /start from:', {
            user: msg.from?.username,
            chatId
        });

        await bot.sendMessage(chatId, `Привет, ${userName}! 👋\n\nДобро пожаловать в SEO Generator.\nОткройте приложение для генерации SEO-контента.`, {
            reply_markup: {
                inline_keyboard: [[
                    {
                        text: "🚀 Открыть приложение",
                        web_app: { url: WEBAPP_URL }
                    }
                ]]
            }
        });
    });

    console.log('✅ Telegram WebApp commands configured');
    console.log(`   WebApp URL: ${WEBAPP_URL}`);
}
