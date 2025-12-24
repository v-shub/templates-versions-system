#!/bin/bash
# Скрипт для запуска MongoDB через Docker для тестов

CONTAINER_NAME="test-mongodb"
IMAGE_NAME="mongo:7.0"
PORT=27017

# В CI окружении MongoDB уже доступен через GitHub Actions services
# Пропускаем запуск Docker контейнера
if [ -n "$CI" ]; then
  echo "Running in CI environment, MongoDB is provided by GitHub Actions services"
  echo "Skipping Docker container setup"
  exit 0
fi

# Проверяем, запущен ли контейнер
if docker ps | grep -q "$CONTAINER_NAME"; then
  echo "MongoDB container '$CONTAINER_NAME' is already running"
  exit 0
fi

# Проверяем, существует ли контейнер (но не запущен)
if docker ps -a | grep -q "$CONTAINER_NAME"; then
  echo "Starting existing MongoDB container '$CONTAINER_NAME'"
  docker start "$CONTAINER_NAME"
else
  echo "Creating and starting new MongoDB container '$CONTAINER_NAME'"
  docker run -d \
    --name "$CONTAINER_NAME" \
    -p "$PORT:27017" \
    "$IMAGE_NAME"
fi

# Ждем, пока MongoDB будет готов
echo "Waiting for MongoDB to be ready..."
for i in {1..30}; do
  if docker exec "$CONTAINER_NAME" mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "MongoDB is ready!"
    exit 0
  fi
  sleep 1
done

echo "MongoDB failed to start within 30 seconds"
exit 1

