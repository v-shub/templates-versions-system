# Базовые правила процесса разработки

## 1. Создание задачи
```bash
# Все задачи начинаются с Issue
Title: [FEAT/BUG/FIX/DOCS/REFACTOR] Краткое описание
Description:
    - Что произошло / Что нужно
    - Шаги воспроизведения
    - Ожидаемое поведение
    - Фактическое поведение
    - Environment (OS, browser, версия)
Labels: backend, frontend, api, bug, enhancement, etc.
Assignee: @username
```

### Шаблоны Issue:

- [FEAT] - новая функциональность  
- [BUG] - исправление ошибки  
- [FIX] - технические правки  
- [DOCS] - документация
- [REFACTOR] - рефакторинг

## 2. Ветвление

Создается новая ветка. Вся работа ведется в ней.

```bash
# От основной ветки
git checkout main
git pull origin main
git checkout -b feature/template-search-123
# или
git checkout -b bugfix/upload-fix-456
```

### Конвенция именования веток:

- feature/ - новая функциональность  
- bugfix/ - исправление багов  
- hotfix/ - срочные исправления  
- docs/ - документация  
- refactor/ - рефакторинг

## 3. Именование коммитов
```text
feat: add advanced search with filters
fix: handle file upload validation
docs: update deployment instructions
refactor: extract template card to separate component
```

### Типы коммитов:

- feat: - новая функциональность  
- fix: - исправление ошибки  
- docs: - документация  
- style: - форматирование  
- refactor: - рефакторинг  
- test: - тесты  
- chore: - вспомогательные изменения

## 4. Pull Request
  
### Требования к PR:

- Ссылка на Issue в описании  
- Минимум 1 аппрув от другого члена команды  
- Все проверки CI/CD пройдены  
- Актуальность с main веткой

### Review процесс:

- Комментарии должны быть конкретными  
- Автор отвечает на комментарии в течение рабочего дня  

## 5. Защита данных

### НИКОГДА не коммитить:
- Пароли, API ключи
- Приватные SSL сертификаты
- Конфигурации с секретами
- Персональные данные

### Используйте:
- .env файлы (в .gitignore)
- GitHub Secrets
- Environment variables

## 6. Рабочие часы

- Основные: 10:00 - 18:00  
- Code Review: 12:00 - 14:00  
- Коммуникация: GitHub Discussions, Telegram
  
<br>

---
*Это living document. Предложения по улучшению процесса приветствуются через Issues или Discussions.*