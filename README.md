# Система контроля версий шаблонов документов

Веб-приложение для управления шаблонами документов с поддержкой версионности, полнотекстового поиска и хранения файлов.

## Возможности

- **Управление шаблонами** — создание, редактирование, удаление шаблонов документов
- **Версионность** — автоматическое отслеживание версий и история изменений
- **Сравнение версий** — визуальное сравнение содержимого между версиями
- **Продвинутый поиск** — полнотекстовый поиск по Elasticsearch с фильтрами
- **Превью файлов** — предпросмотр документов (PDF, Office) в браузере
- **Экспорт данных** — экспорт шаблонов и статистики
- **Realtime-уведомления** — обновления через Socket.IO
- **Аутентификация** — регистрация, вход, управление профилем

## Технологический стек

| Компонент | Технологии |
|-----------|------------|
| Backend | Node.js, Express, TypeScript |
| Frontend | React, TypeScript, Material UI |
| База данных | MongoDB (Mongoose) |
| Поиск | Elasticsearch |
| Очереди | Redis, BullMQ |
| Хранилище | Локальное или S3-совместимое (Yandex Cloud) |

## Требования

- Node.js 18+
- Docker и Docker Compose (для запуска в контейнерах)
- MongoDB 6+, Redis 7+, Elasticsearch 8.11 (при локальной установке)

## Быстрый старт (Docker)

1. Клонируйте репозиторий и перейдите в каталог проекта:
   ```bash
   cd templates-versions-system
   ```

2. Создайте файл конфигурации:
   ```bash
   cp .env.example .env
   ```
   Отредактируйте `.env` и задайте пароли (`ELASTIC_PASSWORD`, `JWT_SECRET` и др.).

3. Запустите все сервисы:
   ```bash
   docker compose up -d
   ```

4. Приложение будет доступно:
   - **Фронтенд**: http://localhost (порт 80)
   - **API**: http://localhost:3000/api
   - **Swagger UI**: http://localhost:3000/api-docs

## Локальная разработка

### Backend

1. Установите зависимости:
   ```bash
   cd backend
   npm install
   ```

2. Скопируйте конфигурацию:
   ```bash
   cp .env.example .env
   ```
   Настройте переменные под локальные MongoDB, Redis, Elasticsearch.

3. Запустите сервер:
   ```bash
   npm run dev
   ```

4. (Опционально) Запустите воркер очередей в отдельном терминале:
   ```bash
   npm run worker
   ```

### Frontend

1. Установите зависимости:
   ```bash
   cd frontend
   npm install
   ```

2. Создайте `.env`:
   ```bash
   cp .env.example .env
   ```
   Для локальной разработки: `REACT_APP_API_URL=http://localhost:3000/api`

3. Запустите приложение:
   ```bash
   npm start
   ```

   Фронтенд откроется по адресу http://localhost:3001 (или другому порту).

### Тесты

**Backend:**
```bash
cd backend
npm test
```

**Frontend:**
```bash
cd frontend
npm test
```

## Структура проекта

```
templates-versions-system/
├── backend/              # API и бизнес-логика
│   ├── src/
│   │   ├── controllers/  # Обработчики запросов
│   │   ├── models/       # Mongoose-модели
│   │   ├── services/     # Сервисы (файлы, поиск, PDF и т.д.)
│   │   ├── routes/       # Маршруты
│   │   ├── middleware/   # Авторизация, валидация
│   │   └── swagger/      # Документация API
│   └── ...
├── frontend/             # React SPA
│   └── src/
│       ├── components/   # Компоненты UI
│       ├── contexts/     # React-контексты
│       ├── services/     # API-клиент
│       └── ...
├── docs/                 # Документация
└── docker-compose.yml    # Оркестрация контейнеров
```

## Переменные окружения

Основные переменные (полный список — в `.env.example`):

| Переменная | Описание |
|------------|----------|
| `MONGODB_URI` | URI подключения к MongoDB |
| `REDIS_URL` | URL Redis |
| `ELASTICSEARCH_URL` | URL Elasticsearch |
| `ELASTIC_PASSWORD` | Пароль пользователя elastic |
| `JWT_SECRET` | Секрет для JWT-токенов |
| `STORAGE_TYPE` | `local` или `s3` |
| `REACT_APP_API_URL` | URL API для фронтенда |

## API

Документация API доступна в Swagger UI после запуска backend:
- http://localhost:3000/api-docs

## Лицензия

MIT
