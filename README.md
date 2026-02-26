# Система управления шаблонами документов (Templates Versions System)

Веб-приложение для хранения, версионирования и поиска шаблонов документов (PDF, DOCX, XLSX и др.) с полнотекстовым поиском, сравнением версий и хранением файлов локально или в S3-совместимом хранилище.

---

## Содержание

- [О проекте](#о-проекте)
- [Функциональность](#функциональность)
- [Стек технологий](#стек-технологий)
- [Структура репозитория](#структура-репозитория)
- [Требования](#требования)
- [Быстрый старт (Docker)](#быстрый-старт-docker)
- [Локальная разработка](#локальная-разработка)
- [Переменные окружения](#переменные-окружения)
- [API](#api)
- [Тестирование](#тестирование)
- [Мониторинг и метрики](#мониторинг-и-метрики)
- [Процесс разработки](#процесс-разработки)
- [Безопасность и конфиденциальность](#безопасность-и-конфиденциальность)
- [Лицензия](#лицензия)

---

## О проекте

**Система управления шаблонами документов** — это полнофункциональное приложение, позволяющее:

- загружать и хранить шаблоны документов в различных форматах;
- вести историю версий каждого шаблона с описанием изменений;
- искать шаблоны по тексту (полнотекстовый поиск через Elasticsearch);
- сравнивать две версии одного шаблона и получать отчёт об отличиях;
- управлять метаданными: категория, отдел, теги, статус (черновик / утверждён / устарел);
- хранить файлы локально на диске или в S3-совместимом хранилище (в т.ч. Yandex Cloud Object Storage);
- использовать аутентификацию по JWT и реальное время (Socket.IO) для уведомлений.

Проект состоит из **бэкенда** (Node.js + Express + TypeScript), **фронтенда** (React + TypeScript + MUI) и инфраструктуры (MongoDB, Redis, Elasticsearch), оркестрируемой через Docker Compose.

---

## Функциональность

### Шаблоны

- **Создание** — загрузка файла и заполнение названия, описания, категории, отдела, тегов, статуса.
- **Редактирование** — обновление метаданных и/или загрузка нового файла (создаётся новая версия).
- **Удаление** — удаление шаблона и всех его версий.
- **Список с пагинацией** — фильтрация по категории, отделу, статусу; сортировка.

### Версии

- **История версий** — просмотр всех версий шаблона с датами и описанием изменений.
- **Загрузка новой версии** — добавление новой версии с файлом и комментарием.
- **Восстановление версии** — сделать выбранную версию текущей (с созданием новой записи в истории).
- **Сравнение версий** — сравнение двух версий с детальным отчётом об изменениях (в т.ч. для документов Office/PDF).

### Поиск

- **Полнотекстовый поиск** — по названию, описанию, тегам через Elasticsearch.
- **Расширенный поиск** — подсветка совпадений, нечёткий поиск, выбор полей.
- **Автодополнение** — подсказки по полям (name, category, tags).

### Файлы

- **Скачивание** — получение текущего файла шаблона по ID.
- **Предпросмотр** — просмотр файла в браузере (PDF, изображения, текст и т.д.).
- **Хранение** — локальная папка (`STORAGE_TYPE=local`) или S3-совместимое хранилище (`STORAGE_TYPE=s3`).

### Справочники и статистика

- **Категории, отделы, теги** — API для получения списков и популярных тегов.
- **Статистика** — количество шаблонов по статусу, категории, отделу; общее число версий.

### Аутентификация и пользователи

- **Регистрация и вход** по JWT.
- **Защита API** — маршруты шаблонов требуют валидный JWT (кроме health и auth).
- **Профиль пользователя** — просмотр и обновление данных (на фронтенде).

### Дополнительно

- **Health check** — эндпоинт `/health` с проверкой MongoDB и Elasticsearch.
- **Swagger** — интерактивная документация API (после запуска доступна по указанному в приложении пути, обычно `/api-docs` или аналогично).
- **Метрики Prometheus** — эндпоинт `/metrics` для сбора метрик.
- **Очереди (BullMQ + Redis)** — фоновая обработка задач при необходимости (например, индексация в Elasticsearch).
- **Socket.IO** — уведомления в реальном времени на фронтенде.

---

## Стек технологий

| Компонент   | Технологии |
|------------|------------|
| Backend    | Node.js 20, Express, TypeScript, Mongoose, JWT, BullMQ, Socket.IO |
| Frontend   | React 18, TypeScript, Material UI (MUI), React Query, Axios, Socket.IO Client |
| Базы данных| MongoDB 6, Redis 7, Elasticsearch 8.11 |
| Хранение   | Локальная ФС или S3-совместимое (AWS SDK), поддержка Yandex Cloud |
| Документы  | mammoth (DOCX), pdf-parse, fast-xml-parser, xlsx (JSZip и др.) для сравнения версий |
| Инфраструктура | Docker, Docker Compose, Nginx (для фронта в production) |
| CI/CD      | GitHub Actions (тесты на push/PR в main, develop) |

---

## Структура репозитория

```text
templates-versions-system/
├── backend/                    # Backend (Node.js + Express + TypeScript)
│   ├── src/
│   │   ├── app.ts              # Точка входа, Express, CORS, Swagger, health, metrics
│   │   ├── worker.ts           # Воркер очередей (BullMQ)
│   │   ├── routes/             # Маршруты (templates, auth)
│   │   ├── controllers/        # Контроллеры и обработчики (CRUD, поиск, версии, файлы)
│   │   ├── models/             # Mongoose-модели (Template, TemplateVersion, User)
│   │   ├── services/           # Elasticsearch, Redis, FileStorage, сравнение версий, PDF/Office
│   │   ├── middleware/         # auth, validators
│   │   ├── queue/              # BullMQ jobs и подключение к Redis
│   │   ├── swagger/            # OpenAPI (swagger.yaml), setup
│   │   ├── logger/             # Winston
│   │   ├── monitoring/         # Prometheus metrics
│   │   └── __tests__/          # Unit и интеграционные тесты
│   ├── Dockerfile
│   ├── package.json
│   └── .env.example
├── frontend/                   # Frontend (React + MUI)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/         # Auth (Login, Register, Profile), TemplateManager (список, карточки, формы, поиск, версии, экспорт)
│   │   ├── contexts/           # AuthContext
│   │   ├── services/           # api (axios)
│   │   ├── realtime/           # socket (Socket.IO client)
│   │   └── providers/          # ReactQueryProvider
│   ├── Dockerfile              # Multi-stage: build React, затем Nginx
│   ├── nginx.conf
│   ├── package.json
│   └── .env.example
├── docs/
│   └── dev/
│       └── development-process.md   # Правила разработки (ветки, коммиты, PR, безопасность)
├── .github/
│   ├── workflows/
│   │   └── tests.yml           # GitHub Actions: тесты backend при push/PR
│   ├── ISSUE_TEMPLATE/         # Шаблоны issue (feat, bug, fix, docs, refactor)
│   ├── PULL_REQUEST_TEMPLATE.md
│   └── dependabot.yml
├── docker-compose.yml          # backend, frontend, mongodb, redis, elasticsearch
├── .env.example                # Переменные для docker-compose и сервисов
└── README.md                   # Этот файл
```

---

## Требования

- **Docker и Docker Compose** — для запуска всего стека.
- **Node.js 18+** (рекомендуется 20) и **npm** — для локальной разработки без Docker.
- **MongoDB 6**, **Redis 7**, **Elasticsearch 8.x** — при локальном запуске бэкенда без Docker (см. раздел «Локальная разработка»).

---

## Быстрый старт (Docker)

1. **Клонировать репозиторий и перейти в каталог:**

   ```bash
   git clone <url-репозитория> templates-versions-system
   cd templates-versions-system
   ```

2. **Создать файл `.env` из примера и при необходимости отредактировать:**

   ```bash
   cp .env.example .env
   ```

   Обязательно задайте надёжные значения для:
   - `JWT_SECRET`
   - `ELASTIC_PASSWORD` и `ELASTICSEARCH_PASSWORD` (для Elasticsearch с включённой безопасностью)

3. **Запустить все сервисы:**

   ```bash
   docker compose up -d
   ```

   Будут запущены: backend (порт 3000), frontend (порт 80), MongoDB (27017), Redis (6379), Elasticsearch (9200).

4. **Проверить работу:**

   - Фронтенд: в браузере открыть `http://localhost` (или `http://localhost:80`).
   - API: например, `http://localhost:3000/health` (если обращаетесь напрямую к backend) или через Nginx фронта: `http://localhost/api/...` (в зависимости от конфигурации прокси).
   - Swagger: см. URL в логах backend или типичный путь вида `/api-docs` на backend.

5. **Остановить:**

   ```bash
   docker compose down
   ```

   Данные MongoDB, Redis и Elasticsearch сохраняются в именованных томах Docker.

---

## Локальная разработка

### Backend

1. Установите и запустите **MongoDB**, **Redis** и **Elasticsearch** (локально или в Docker только для этих сервисов).

2. Перейдите в каталог backend и установите зависимости:

   ```bash
   cd backend
   npm install
   ```

3. Создайте `.env` из примера и настройте под локальный запуск:

   ```bash
   cp .env.example .env
   ```

   Пример для локальных сервисов:
   - `MONGODB_URI=mongodb://localhost:27017/template-manager`
   - `REDIS_URL=redis://localhost:6379`
   - `ELASTICSEARCH_URL=http://localhost:9200` (или `https://localhost:9200` с учётом вашей настройки Elasticsearch)
   - Укажите `ELASTICSEARCH_USERNAME`, `ELASTICSEARCH_PASSWORD` и при необходимости `ELASTICSEARCH_TLS_SKIP_VERIFY=true`.

4. Запуск в режиме разработки (с перезагрузкой при изменении файлов):

   ```bash
   npm run dev
   ```

   Бэкенд будет доступен на `http://localhost:3000` (или на порту из `PORT` в `.env`).

5. Сборка и запуск production-сборки:

   ```bash
   npm run build
   npm start
   ```

6. Опционально — заполнение БД тестовыми данными (если реализован seed):

   ```bash
   npm run seed
   ```

### Frontend

1. В корне проекта:

   ```bash
   cd frontend
   npm install
   ```

2. Создайте `.env` из примера (при необходимости):

   ```bash
   cp .env.example .env
   ```

   Для локальной разработки обычно используется proxy к backend (в `package.json` указан `"proxy": "http://localhost:3000"`), поэтому `REACT_APP_API_URL` может быть пустым или `/api`.

3. Запуск в режиме разработки:

   ```bash
   npm start
   ```

   Приложение откроется на `http://localhost:3000` (порт может отличаться, если 3000 занят бэкендом — тогда смотрите вывод в консоли).

4. Сборка для production:

   ```bash
   npm run build
   ```

   Собранные файлы окажутся в `frontend/build`. Их можно раздавать через Nginx по конфигурации из `frontend/nginx.conf` (проксирование `/api` на backend).

### Воркер очередей (при использовании фоновых задач)

В отдельном терминале в каталоге `backend`:

```bash
npm run worker
```

---

## Переменные окружения

### Корневой `.env` (для Docker Compose)

Используется при запуске `docker compose`. Скопируйте из `.env.example`.

| Переменная | Описание | Пример |
|------------|----------|--------|
| `NODE_ENV` | Окружение (production/development) | `production` |
| `PORT` | Порт backend | `3000` |
| `CORS_ORIGIN` | Разрешённые источники для CORS (через запятую) | `http://localhost,http://localhost:3001` |
| `MONGODB_URI` | Подключение к MongoDB | `mongodb://mongodb:27017/template-manager` |
| `REDIS_URL`, `REDIS_HOST`, `REDIS_PORT` | Подключение к Redis | `redis://redis:6379`, `redis`, `6379` |
| `ELASTICSEARCH_URL`, `ELASTICSEARCH_USERNAME`, `ELASTICSEARCH_PASSWORD` | Подключение к Elasticsearch | `http://elasticsearch:9200`, `elastic`, `***` |
| `ELASTICSEARCH_CA_FINGERPRINT`, `ELASTICSEARCH_TLS_SKIP_VERIFY` | TLS для Elasticsearch | пусто, `true` |
| `STORAGE_TYPE` | Тип хранилища: `local` или `s3` | `local` |
| `UPLOAD_PATH` | Локальная папка загрузок (при `local`) | `./uploads` |
| `BASE_URL` | Базовый URL приложения (для ссылок на файлы) | `http://localhost:3000` |
| `JWT_SECRET`, `JWT_EXPIRE` | Секрет и срок жизни JWT | секрет, `7d` |
| `LOG_LEVEL`, `LOG_DIR` | Уровень логирования и каталог логов | `info`, `./logs` |
| `S3_*` | Параметры S3-совместимого хранилища (bucket, region, ключи, endpoint) | см. `.env.example` |
| `REACT_APP_API_URL` | URL API для фронта (передаётся при сборке Docker) | `/api` |
| `MONGO_INITDB_DATABASE` | Имя БД MongoDB при инициализации | `template-manager` |
| `ELASTIC_PASSWORD` | Пароль пользователя `elastic` в Elasticsearch | задать вручную |

### Backend `.env` (локальная разработка и тесты)

См. файл `backend/.env.example`. Помимо перечисленных выше, могут использоваться:

- `MONGODB_TEST_URI` — URI MongoDB для тестов (в CI подставляется через GitHub Actions).

Все секреты и пароли должны храниться только в `.env`; файл `.env` не коммитится в репозиторий.

---

## API

- **Документация** — после запуска backend откройте Swagger UI (путь указывается в приложении, часто `/api-docs` на порту backend).
- **Спецификация** — OpenAPI 3.0 в `backend/src/swagger/swagger.yaml`.

Основные группы эндпоинтов:

- **Health:** `GET /health` — состояние системы (MongoDB, Elasticsearch).
- **Auth:** регистрация, вход (JWT), профиль — под префиксом `/api/auth`.
- **Templates:** CRUD, список с пагинацией и фильтрами — под префиксом `/api` (защищены JWT).
- **Search:** `/api/templates/search`, `/api/templates/search/enhanced`, `/api/templates/autocomplete`.
- **Versions:** получение списка версий, загрузка новой версии, восстановление версии, сравнение двух версий.
- **Files:** скачивание файла, предпросмотр.
- **Metadata & Stats:** категории, отделы, теги, статистика по шаблонам.
- **Metrics:** `GET /metrics` — Prometheus-метрики (если включены).

Аутентификация: заголовок `Authorization: Bearer <JWT>`.

---

## Тестирование

### Backend

- Запуск всех тестов (с предварительной настройкой тестовой БД):

  ```bash
  cd backend
  npm run test
  ```

  В проекте используется скрипт `test:setup` (например, `./scripts/setup-test-mongodb.sh`) и переменные окружения для тестовой MongoDB/Redis (в CI задаются в `tests.yml`).

- Дополнительные скрипты из `package.json`:
  - `npm run test:watch` — тесты в режиме наблюдения;
  - `npm run test:coverage` — с отчётом покрытия;
  - `npm run test:integration` — только интеграционные тесты (по паттерну `__tests__/.*.integration.test.ts`).

В CI (GitHub Actions) при push и pull request в ветки `main` и `develop` поднимаются сервисы MongoDB и Redis, копируется `backend/.env.example` в `.env`, устанавливаются зависимости и запускаются тесты с заданными переменными окружения (в т.ч. `MONGODB_URI`, `REDIS_URL`, `JWT_SECRET`; Elasticsearch в тестах может быть заглушен или отключён в зависимости от реализации).

### Frontend

- Запуск тестов React (Jest + React Testing Library):

  ```bash
  cd frontend
  npm test
  ```

---

## Мониторинг и метрики

- **Health:** `GET /health` — использование в оркестраторах и балансировщиках для проверки готовности и зависимости от MongoDB и Elasticsearch.
- **Prometheus:** эндпоинт `GET /metrics` отдаёт метрики в формате Prometheus (сбор через `prom-client` и middleware в Express). Используйте для построения графиков и алертов в Grafana/Prometheus.

---

## Процесс разработки

Подробное описание правил разработки см. в **[docs/dev/development-process.md](docs/dev/development-process.md)**. Кратко:

- **Задачи** оформляются в виде Issue с префиксами: `[FEAT]`, `[BUG]`, `[FIX]`, `[DOCS]`, `[REFACTOR]`.
- **Ветки:** от `main` создаются ветки с именами `feature/...`, `bugfix/...`, `hotfix/...`, `docs/...`, `refactor/...`.
- **Коммиты:** в стиле Conventional Commits — `feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:` и т.д.
- **Pull Request:** привязка к Issue, прохождение CI, минимум один апрув. Шаблон PR — `.github/PULL_REQUEST_TEMPLATE.md`.
- **Секреты:** пароли, API-ключи и персональные данные не коммитятся; используются `.env` и GitHub Secrets.

---

## Безопасность и конфиденциальность

- Не коммитьте файлы `.env` и любые файлы с паролями, ключами или персональными данными.
- В production обязательно смените `JWT_SECRET` и пароли Elasticsearch (`ELASTIC_PASSWORD`, `ELASTICSEARCH_PASSWORD`).
- CORS настраивается через `CORS_ORIGIN`; в production укажите только доверенные домены.
- Загрузка файлов ограничивается (размер и типы) на уровне backend (multer, validators); при использовании Nginx учтите `client_max_body_size` (в проекте задано 50M).

---

## Лицензия

Проект распространяется под лицензией MIT (см. описание в Swagger и при необходимости файл LICENSE в корне репозитория).

---

*При возникновении вопросов или предложений по улучшению создавайте Issue или обсуждение в репозитории.*
