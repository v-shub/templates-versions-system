FROM node:20-alpine

WORKDIR /app

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install

# Копируем исходный код
COPY . .

# Создаем директорию для загрузок
RUN mkdir -p uploads

# Собираем TypeScript код
RUN npm run build

# Копируем дополнительные файлы, которые не компилируются TypeScript
RUN cp -r src/swagger/swagger.yaml dist/swagger/ 2>/dev/null || mkdir -p dist/swagger && cp src/swagger/swagger.yaml dist/swagger/

# Открываем порт
EXPOSE 3000

# Команда запуска
CMD ["npm", "start"]
