# Созвон
Простое веб-приложение для запуска групповых видеозвонков. Стартовая страница создаёт ссылку на комнату, а дальше пользователи проходят стандартный экран подготовки и подключаются к разговору.

## Технологии

- [Next.js](https://nextjs.org/)
- React 18
- Типизация на TypeScript
- go livekit

## Локальный запуск

1. Установите зависимости: `pnpm install`.
2. Скопируйте `.env.example` в `.env.local` и заполните значения, соответствующие вашему серверу.
3. Запустите дев-сервер: `pnpm dev` и откройте [http://localhost:3000](http://localhost:3000).

## Telegram бот

- Добавьте в `.env` значения `TELEGRAM_BOT_TOKEN` (токен из BotFather) и `TELEGRAM_CALL_BASE_URL` (публичный URL приложения, например `https://meet.example.com`).
- В BotFather включите Inline Mode для бота (`/setinline`).
- Установите вебхук на эндпоинт `/api/telegram`, передав `allowed_updates=["inline_query"]`, например:

  ```bash
  curl "https://api.telegram.org/bot<TELEGRAM_BOT_TOKEN>/setWebhook" \
    -H 'Content-Type: application/json' \
    -d '{"url":"https://meet.example.com/api/telegram","allowed_updates":["inline_query"]}'
  ```

После этого в чатах можно писать `@вашбот` и получить готовую ссылку на новую комнату для созвона.

## Структура

- `app/` — страницы и API-роуты Next.js.
- `lib/` — вспомогательные хуки и утилиты клиентской части.
- `styles/` — CSS-модули для интерфейса.
