# Интеграция с Telegram Bot

Это руководство поможет вам настроить SEO Generator как Telegram WebApp.

## Шаг 1: Создание Telegram Бота

1. Откройте [@BotFather](https://t.me/botfather) в Telegram
2. Отправьте команду`/newbot`
3. Следуйте инструкциям для создания бота
4. Сохраните полученный **BOT_TOKEN**

## Шаг 2: Настройка WebApp

1. В BotFather отправьте `/myapps`
2. Выберите `/newapp`
3. Выберите вашего бота
4. Укажите название Web App
5. Введите URL вашего развернутого приложения
6. Загрузите иконку (512x512 px)
7. Добавьте описание

## Шаг 3: Привязка WebApp к кнопке меню

1. В BotFather отправьте `/setmenubutton`
2. Выберите вашего бота
3. Укажите текст кнопки (например, "🚀 Открыть  генератор")
4. Введите URL WebApp

## Пример кода бота (на Node.js)

Создайте простой бот, который будет открывать WebApp:

```javascript
import TelegramBot from 'node-telegram-bot-api';

const token = 'YOUR_BOT_TOKEN';
const bot = new TelegramBot(token, { polling: true });

const webAppUrl = 'https://your-domain.com'; // URL вашего WebApp

bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  
  if (msg.text === '/start') {
    bot.sendMessage(chatId, 'Добро пожаловать в SEO Generator! 👋', {
      reply_markup: {
        inline_keyboard: [[
          {
            text: '🚀 Открыть генератор',
            web_app: { url: webAppUrl }
          }
        ]]
      }
    });
  }
});

console.log('Bot is running...');
```

## Валидация initData на Backend

Backend автоматически валидирует запросы от Telegram WebApp. Убедитесь, что:

1. В `.env` файле backend настроен `BOT_TOKEN`
2. Middleware `validateTelegramAuth` применён ко всем защищённым маршрутам
3. Frontend отправляет `initData` в header `X-Telegram-Init-Data`

## Проверка интеграции

1. Откройте бота в Telegram
2. Нажмите на кнопку меню или отправьте `/start`
3. Приложение должно открыться в WebApp
4. Проверьте автоматическую авторизацию (имя пользователя должно отображаться)

## Локальное тестирование

Для тестирования локально используйте ngrok:

```bash
ngrok http 5173
```

Полученный URL используйте как WebApp URL в BotFather.

## Дополнительные команды бота

```javascript
bot.onText(/\/start/, (msg) => {
  // Приветствие с WebApp кнопкой
});

bot.onText(/\/help/, (msg) => {
  bot.sendMessage(msg.chat.id, 
    'Справка по использованию SEO Generator...'
  );
});

bot.onText(/\/plans/, async (msg) => {
  // Показать доступные тарифные планы
  const response = await fetch(`${API_URL}/plans`);
  const { plans } = await response.json();
  
  let message = '📊 *Доступные тарифные планы:*\n\n';
  plans.forEach(plan => {
    message += `*${plan.name}* - ${plan.priceRub} ₽/мес\n`;
    message += `  Генераций в день: ${plan.maxGenerationsPerDay || '∞'}\n`;
    message += `  Макс. символов: ${plan.maxChars}\n\n`;
  });
  
  bot.sendMessage(msg.chat.id, message, { parse_mode: 'Markdown' });
});
```

## Обработка платежей

При успешном платеже через ЮKassa, webhook автоматически:
1. Обновит подписку пользователя в БД
2. Отправит уведомление через бота

Убедитесь, что бот запущен для отправки уведомлений.
