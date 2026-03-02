# Contributing Guide

Этот репозиторий приватный. Вклады принимаются от участников с доступом.

## Workflow
1. Создайте ветку от `main`.
2. Вносите изменения атомарно (одна задача - один PR).
3. Перед PR обновите ветку относительно актуального `main`.

Рекомендуемый нейминг веток:
- `feat/<short-description>`
- `fix/<short-description>`
- `refactor/<short-description>`
- `docs/<short-description>`

## Commit Convention
Рекомендуется формат Conventional Commits:
- `feat: ...`
- `fix: ...`
- `docs: ...`
- `refactor: ...`
- `test: ...`
- `chore: ...`

## Local Quality Checks
Перед созданием PR:
```bash
# frontend tests
npm run test

# backend tests
cd backend
npm run test
```

Если изменение затрагивает БД:
```bash
npm run db:generate
npm run db:push
```

## Pull Request Rules
- Название PR должно отражать результат изменения.
- В описании укажите:
  - что изменено;
  - зачем это нужно;
  - как проверить вручную;
  - есть ли влияние на миграции/ENV/API.
- Для UI/API изменений прикладывайте скриншоты или примеры запросов/ответов.

## Security and Secrets
- Не коммитьте реальные токены, ключи, пароли и `.env`.
- Для новых переменных окружения обновляйте `.env.example` и `backend/.env.example`.
- Критические уязвимости не публикуйте в обычных issue, используйте процесс из `SECURITY.md`.
