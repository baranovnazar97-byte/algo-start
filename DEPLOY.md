# Развёртывание и еженедельное обновление

## Вариант для текущего VPS одной командой

Сервер: `root@81.90.25.140`. Из терминала PowerShell в корне проекта:

```powershell
.\release.cmd "Адаптирован интерфейс игровых заданий"
```

Сценарий использует репозиторий
<https://github.com/baranovnazar97-byte/gaming-simulator>, а затем загружает
проверенную версию на VPS. На совершенно пустой Ubuntu он установит Docker,
Docker Compose, создаст случайные пароли production, соберёт три контейнера и
опубликует сайт на `http://81.90.25.140`.

Контейнеры:

- `frontend`: Nginx со статической React-сборкой, наружу открыт порт 80;
- `backend`: NestJS, доступен только внутри Docker-сети;
- `db`: PostgreSQL, доступна только backend и хранит данные в постоянном томе.

Перед каждым повторным обновлением создаётся дамп PostgreSQL в
`/opt/algorithmika/backups`. Production-файл `.env`, база и старый релиз не
перезаписываются. Если новые контейнеры не стали здоровыми, сценарий пытается
вернуть предыдущую версию кода. База автоматически назад не откатывается.

Пока домена нет, доступ идёт по обычному HTTP. Не используйте реальные детские
данные до подключения домена и HTTPS.

Ниже также оставлен ручной вариант для Ubuntu с доменом и Nginx на хосте. Контейнер с сайтом слушает только `127.0.0.1:8080`, а Nginx принимает публичный HTTPS-трафик.

## 1. Что потребуется

- VPS с 2 ГБ RAM и 15–20 ГБ диска;
- домен, A-запись которого указывает на IP сервера;
- Docker Engine и плагин Docker Compose;
- Git;
- открытые TCP-порты 22, 80 и 443.

На сервере проверьте:

```bash
docker --version
docker compose version
git --version
```

## 2. Первый запуск

Клонируйте репозиторий в постоянную папку:

```bash
sudo mkdir -p /opt/algorithmika
sudo chown "$USER":"$USER" /opt/algorithmika
git clone YOUR_REPOSITORY_URL /opt/algorithmika
cd /opt/algorithmika
cp .env.example .env
```

Отредактируйте `.env`:

```dotenv
APP_BIND_ADDRESS=127.0.0.1
APP_PORT=8080
FRONTEND_URL=https://example.ru
TRUST_PROXY_HOPS=2
POSTGRES_USER=postgres
POSTGRES_PASSWORD=root
DB_USER=postgres
DB_PASSWORD=root
JWT_SECRET=случайная_строка_не_короче_32_символов
```

Секрет можно получить командой `openssl rand -hex 32`. Файл `.env` не добавляется в Git.

Проверьте конфигурацию и запустите приложение:

```bash
docker compose --env-file .env config --quiet
docker compose --env-file .env up -d --build
```

Проверка:

```bash
docker compose ps
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/api/health
```

Все три сервиса должны иметь состояние `Up`/`healthy`.

## 3. Домен и HTTPS

Установите Nginx и Certbot на хосте. Пример `/etc/nginx/sites-available/algorithmika`:

```nginx
server {
    listen 80;
    server_name example.ru www.example.ru;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

После замены домена активируйте конфигурацию и проверьте её:

```bash
sudo ln -s /etc/nginx/sites-available/algorithmika /etc/nginx/sites-enabled/algorithmika
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d example.ru -d www.example.ru
```

Если хостинг предоставляет свою панель и HTTPS-прокси, достаточно направить домен на `127.0.0.1:8080` по инструкции провайдера.

## 4. Обычное еженедельное обновление

Сначала зафиксируйте и проверьте реальное изменение в Git. На сервере обновление выполняется двумя командами:

```bash
git pull --ff-only
docker compose --env-file .env up -d --build --remove-orphans
```

После обновления:

```bash
docker compose ps
curl --fail https://example.ru/api/health
docker compose logs --since=10m backend frontend
```

Compose заменяет только изменившиеся контейнеры. Именованный том `postgres_data` остаётся на месте.

## 5. Резервная копия базы

Перед изменениями схемы создайте папку и дамп:

```bash
mkdir -p backups
docker compose exec -T db pg_dump -U algorithmika -d algorithmika -Fc > "backups/algorithmika-$(date +%F-%H%M).dump"
```

Храните несколько копий вне VPS. Восстановление перезаписывает данные и должно выполняться только после отдельной проверки выбранного файла.

## 6. Откат

Рабочие релизы помечайте тегами в момент выпуска, например `v1.1.0`. Если новый релиз сломан:

```bash
git fetch --tags
git switch --detach v1.0.0
docker compose --env-file .env up -d --build --remove-orphans
```

После исправления вернитесь на ветку `main`. Откат кода не откатывает структуру и содержимое БД, поэтому перед изменениями схемы обязателен дамп.

## 7. Проверка через GitHub Actions

Файл `.github/workflows/deploy.yml` после каждого push в `main` повторно собирает
проект и запускает тесты на GitHub. Доступ к VPS в GitHub не сохраняется:
production обновляет локальная команда `release.cmd`. Это проще для учебного
проекта и не требует хранить закрытый SSH-ключ в настройках репозитория.

## 8. Диагностика

```bash
docker compose ps
docker compose logs --tail=200 backend
docker compose logs --tail=200 db
docker compose exec db pg_isready -U algorithmika -d algorithmika
docker compose config
```

- `backend` не стартует: проверьте `JWT_SECRET`, параметры PostgreSQL и журнал сервера.
- `db` unhealthy: проверьте пароль, место на диске и права тома.
- API работает, а сайт нет: проверьте Nginx хоста и контейнер `frontend`.
- домен открывается без HTTPS: проверьте A-запись, порты 80/443 и Certbot.
