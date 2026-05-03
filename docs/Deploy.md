# Deploy Bitcoin API

Первичный деплой Bitcoin API на сервер: настройка ufw (Cloudflare-only), установка стека (Node 22, Postgres 17 + pgvector, Redis), сборка api/exchanges/web-client, конфигурация Nginx + certbot (DNS-01) как reverse proxy для bitcoin-api.net, systemd сервисы и Makefile-команды для последующих обновлений.

## Контекст

- Сервер: указан в `.env` (Hetzner, Ubuntu, root)
- Путь на сервере: `/var/www/bitcoin_api` (Nginx запускается под `www-data` и не имеет траверс-доступа в `/root` (mode 700) — поэтому проект живёт в `/var/www`, не в `/root`)
- Стек: Node 22, Postgres 17 + pgvector (PGDG repo), Redis, Fastify (API на :8000), Astro static (web-client), exchanges воркер
- Домен: `bitcoin-api.net` через Cloudflare (SSL/proxy on)
- Reverse proxy: **Nginx** + **certbot** с **Let's Encrypt** (DNS-01 challenge через Cloudflare API token, т.к. Proxy ON блокирует HTTP-01)
- CF SSL/TLS mode: **Full (strict)**

## Принцип: минимум привязки к Cloudflare

Стек спроектирован так, чтобы CF можно было выключить/заменить за минуты:

- **Сертификат** — Let's Encrypt, не CF Origin Cert (стандартный публичный CA, доверяется всеми браузерами напрямую без CF посередине)
- **DNS-01 plugin** — `python3-certbot-dns-cloudflare` сейчас, при миграции меняется на любой другой (`certbot-dns-route53`, `certbot-dns-digitalocean`, `certbot-dns-hetzner`, и т.д.) — `apt install` другого плагина + один токен
- **UFW Cloudflare-only allowlist** — единственное место с CF IP. При уходе с CF: `ufw allow 80,443/tcp` всем и удалить CF правила (одна команда)
- **Никаких CF Workers, R2, KV, Pages, Tunnel, Origin Cert** в архитектуре приложения

Сценарий миграции с CF (если потребуется):

1. Поменять nameservers домена у регистратора
2. Поменять certbot DNS плагин и креды (`/etc/letsencrypt/cloudflare.ini` → новый файл)
3. Открыть UFW для всех на 80/443

## Архитектура трафика

```mermaid
flowchart LR
    User[User] -->|HTTPS| CF[Cloudflare]
    CF -->|HTTPS Let's Encrypt| Nginx[Nginx :443]
    Nginx -->|/api/*| API[Fastify :8000]
    Nginx -->|/| Web[Astro static dist]
    API --> PG[(Postgres 17 + pgvector)]
    API --> Redis[(Redis)]
    Exch[exchanges worker] --> PG
    Exch --> Redis
```

## DNS + CF setup (вручную в Cloudflare)

- `A bitcoin-api.net` → IP сервера, **Proxy ON**
- `A www.bitcoin-api.net` → IP сервера, Proxy ON
- SSL/TLS mode: **Full (strict)**
- Создать API token: My Profile → API Tokens → Create Token, permissions: `Zone:DNS:Edit` для зоны `bitcoin-api.net`. Сохранить токен (хранится в `.env` как `CF_API_KEY`).

---

## Шаги

> Сервер: Ubuntu 22.04 LTS (Hetzner). Все шаги под `root`.

### 1. UFW (Cloudflare-only) — следуя [.cursor/rules/shared/devops/ufw/cloudflare-access-only.mdc](../.cursor/rules/shared/devops/ufw/cloudflare-access-only.mdc)

На сервере:

- `ufw default deny incoming`
- `ufw default allow outgoing`
- `ufw allow 22/tcp comment "SSH"` (иначе залочимся!)
- Скачать CF IPv4/IPv6: `curl -s https://www.cloudflare.com/ips-v{4,6} > /tmp/cloudflare_ips_v{4,6}.txt`
- Применить allow на 80/443 только с CF IP: `cat /tmp/cloudflare_ips_v4.txt | xargs -I {} ufw allow from {} to any port 80 proto tcp comment "Cloudflare IPv4"` (аналогично для 443 и v6)
- `echo y | ufw enable`, `ufw status numbered`
- Postgres (5432) и Redis (6379) — НЕ открывать наружу (только localhost; UFW сам режет, плюс ниже bind 127.0.0.1)

### 2. Системные пакеты

- `apt update && apt upgrade -y`
- `apt install -y curl git build-essential ca-certificates gnupg`
- Node 22: через NodeSource (`curl -fsSL https://deb.nodesource.com/setup_22.x | bash -` → `apt install -y nodejs`)
- Проверить `node -v` (>=22.12) и `npm -v` (>=10.9) per [package.json](../package.json) engines (по факту встаёт Node 22.22.x / npm 10.9.x)

### 3. Postgres 17 + pgvector (через PGDG)

- `apt install -y postgresql-common`
- `/usr/share/postgresql-common/pgdg/apt.postgresql.org.sh -y` (добавит PGDG репо)
- `apt install -y postgresql-17 postgresql-17-pgvector`
- Сгенерировать сильный пароль и сохранить локально (используется в `.env` ниже): `openssl rand -base64 32 | tr -d '/+=' | head -c 40 > /root/.pg_password && chmod 600 /root/.pg_password`
- Создать роль/БД/extension:

```bash
PG_PASS=$(cat /root/.pg_password)
sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
CREATE USER bitcoin_api WITH PASSWORD '${PG_PASS}';
CREATE DATABASE bitcoin_api OWNER bitcoin_api;
\c bitcoin_api
CREATE EXTENSION IF NOT EXISTS vector;
SQL
```

- `pg_hba.conf` (`/etc/postgresql/17/main/pg_hba.conf`) — по умолчанию `host ... 127.0.0.1/32 scram-sha-256` (ок, не трогать). `listen_addresses` оставить `localhost`.
- Проверка: `PGPASSWORD=$(cat /root/.pg_password) psql -h 127.0.0.1 -U bitcoin_api -d bitcoin_api -c '\dx'` → видно `vector`.

### 4. Redis

- `apt install -y redis-server` (Ubuntu 22.04 ставит 6.0.x)
- `/etc/redis/redis.conf`: `bind 127.0.0.1 ::1` (именно с пробелом, без `-`), `protected-mode yes`
- `systemctl enable --now redis-server && systemctl restart redis-server`
- Проверка: `redis-cli ping` → `PONG`, `ss -tlnp | grep 6379` → bind только на 127.0.0.1/::1

### 5. Код проекта (уже на сервере в `/var/www/bitcoin_api`)

- `cd /var/www/bitcoin_api`
- `git pull --ff-only origin main`
- Submodules `.cursor/rules/shared/{development,devops}` — для рантайма НЕ нужны, нужны только если работаешь с правилами с сервера. Если есть доступ к Bitbucket — `git submodule update --init --recursive`, иначе пропустить.
- `npm ci`
- Создать `/var/www/bitcoin_api/.env` (production, не из dev). Минимум что меняется относительно dev:
  - новый `SECRET_KEY` (`openssl rand -base64 64`)
  - `ENVIRONMENT=production`, `NODE_ENV=production`, `HOST=127.0.0.1` (Nginx проксирует с `127.0.0.1:8000`)
  - `DATABASE_URL=postgresql://bitcoin_api:$(cat /root/.pg_password)@localhost:5432/bitcoin_api`
  - `REDIS_URL=redis://localhost:6379`
  - `SITE_URL=https://bitcoin-api.net`, `PUBLIC_API_URL=https://bitcoin-api.net/api`, `API_BROWSER_URL=https://bitcoin-api.net/api`, `WS_API_BROWSER_URL=wss://bitcoin-api.net/api`, `VITE_*` аналогично
  - `GOOGLE_REDIRECT_URL=https://bitcoin-api.net/api/v1/auth/google/callback`
  - `CORS_ORIGIN=https://bitcoin-api.net`
  - прод `RESEND_API_KEY`, `GEMINI_API_KEY`, `GOOGLE_CLIENT_ID/SECRET`
  - `LOG_LEVEL=info`
- `chmod 600 /var/www/bitcoin_api/.env`
- `npm run prisma:generate`
- `npm run prisma:push` (накатит extensions + схему + hnsw indexes одним скриптом)
- Билд бэкенда. Корневой `npm run build` собирает только `shared` (root [tsconfig.json](../tsconfig.json) ссылается только на `./shared`). Поэтому api/exchanges нужно билдить отдельно:
  - `npx tsc --build apps/api` → `apps/api/src/app.js`
  - `npx tsc --build apps/exchanges` → `apps/exchanges/src/last-price.app.js` (на момент написания TS6307 warning про `shared/generated/prisma/client.ts` — не блокирует emit; см. [apps/exchanges/tsconfig.json](../apps/exchanges/tsconfig.json))
- `npm run build --workspace=apps/web-client` (Astro static → `apps/web-client/dist`)
- TODO для будущего рефакторинга: добавить `apps/api` и `apps/exchanges` в `references` корневого `tsconfig.json`, чтобы `npm run build` собирал всё одной командой; и поправить include в `apps/exchanges/tsconfig.json` (TS6307).

### 6. Nginx + Let's Encrypt (certbot DNS-01 через Cloudflare API)

#### 6.1 Установка

- `apt install -y nginx certbot python3-certbot-dns-cloudflare`

#### 6.2 Получить LE сертификат через DNS-01

- Создать `/etc/letsencrypt/cloudflare.ini`:

```ini
dns_cloudflare_api_token = <CF_API_TOKEN>
```

- `chmod 600 /etc/letsencrypt/cloudflare.ini`
- Выпустить сертификат:

```bash
certbot certonly \
  --dns-cloudflare \
  --dns-cloudflare-credentials /etc/letsencrypt/cloudflare.ini \
  --dns-cloudflare-propagation-seconds 30 \
  -d bitcoin-api.net -d www.bitcoin-api.net \
  --agree-tos -m admin@bitcoin-api.net --non-interactive
```

- Сертификаты лягут в `/etc/letsencrypt/live/bitcoin-api.net/{fullchain,privkey}.pem`
- Auto-renewal: certbot ставит systemd timer `certbot.timer` автоматически — проверить `systemctl list-timers | grep certbot`. Renewal будет тоже через DNS-01 (метод запоминается).

#### 6.3 Nginx конфиг

`/etc/nginx/sites-available/bitcoin-api`:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name bitcoin-api.net www.bitcoin-api.net;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name bitcoin-api.net www.bitcoin-api.net;

    ssl_certificate     /etc/letsencrypt/live/bitcoin-api.net/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/bitcoin-api.net/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Закрыто от индексации до публичного релиза. Снять перед открытием проекта.
    add_header X-Robots-Tag "noindex, nofollow, noarchive, nosnippet" always;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1024;

    root /var/www/bitcoin_api/apps/web-client/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 300s;
        proxy_send_timeout 300s;
    }

    location / {
        try_files $uri $uri/ $uri.html /index.html;
    }
}
```

- `ln -s /etc/nginx/sites-available/bitcoin-api /etc/nginx/sites-enabled/`
- `rm /etc/nginx/sites-enabled/default`
- `nginx -t && systemctl reload nginx`

#### 6.4 Reload nginx после renewal

Certbot после renewal должен дёргать `nginx -s reload`. Создать `/etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh`:

```bash
#!/bin/bash
systemctl reload nginx
```

- `chmod +x /etc/letsencrypt/renewal-hooks/deploy/nginx-reload.sh`
- Тест: `certbot renew --dry-run`

### 7. systemd сервисы

Создать два юнита (per [.cursor/rules/shared/development/makefile.mdc](../.cursor/rules/shared/development/makefile.mdc) — `systemctl` для долгоживущих процессов):

`/etc/systemd/system/bitcoin-api.service`:

```ini
[Unit]
Description=Bitcoin API (Fastify)
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
WorkingDirectory=/var/www/bitcoin_api/apps/api
EnvironmentFile=/var/www/bitcoin_api/.env
ExecStart=/usr/bin/node src/app.js
Restart=always
RestartSec=3
User=root

[Install]
WantedBy=multi-user.target
```

`/etc/systemd/system/bitcoin-exchanges.service` — аналогично, `ExecStart=/usr/bin/node src/last-price.app.js`, `WorkingDirectory=/var/www/bitcoin_api/apps/exchanges`.

- `systemctl daemon-reload`
- `systemctl enable --now bitcoin-api bitcoin-exchanges`
- Проверить: `systemctl status bitcoin-api bitcoin-exchanges`, `journalctl -u bitcoin-api -n 50`

### 8. Makefile команды для будущих апдейтов

Добавить в [Makefile](../Makefile) (по соглашению из правила — короткие имена `pb-*` = pull+build):

- `pb-api` — git pull, npm ci (если изменился lock), `npm run build`, `systemctl restart bitcoin-api`, sleep 5, status
- `pb-exchanges` — то же для `bitcoin-exchanges`
- `pb-web` — git pull, `npm run build --workspace=apps/web-client` (Nginx сам отдаст новые файлы)
- `pb-all` — git pull один раз, билд всего, restart обоих сервисов

### 9. Проверки

- `curl -I https://bitcoin-api.net` → 200 (web-client)
- `curl https://bitcoin-api.net/api/ping` → 200 `"ok"`
- В CF dashboard: Analytics показывает запросы
- `ufw status` → только 22 + CF IPs на 80/443
- `ss -tlnp | grep -E '5432|6379'` → bind только 127.0.0.1
- Прямой доступ `curl http://<IP>:443` с другого хоста → должен **зависнуть/timeout** (UFW режет не-CF)

## Известные issue (не блокеры деплоя)

- `GET /api/documentation/` → 500 (`route /api/documentation/ is missing schema.operationId`). Причина: глобальный `@fastify/rate-limit` (`apps/api/src/plugins/rate-limit/rate-limit.rest.ts`, `global: true`) дёргает `getOperationId(req)` на каждом запросе, swagger-ui роуты схемы не имеют. Фикс: per-route opt-out через `config.rateLimit = false` для префиксов `/api/documentation` и `/mcp`. Отдельная задача.
