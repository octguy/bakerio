# Bakerio Deployment

Docker Compose stacks for running Bakerio — a **local** stack for full-stack
development with production fidelity, and a **production** stack for the VPS behind
Nginx + Let's Encrypt.

```
docker-compose.local.yml    Full local stack (infra + backend + all 3 frontends)
docker-compose.prod.yml     Production stack (pulls pushed images, Nginx, Certbot)
up-local.sh                 One-command local bring-up (ordered build, seeds demo)
init-letsencrypt.sh         One-time TLS bootstrap on the VPS
nginx.conf                  Reverse proxy + TLS termination + ACME webroot
.env.prod.example           Template for the production runtime env
```

## What runs

Both stacks share the same infrastructure services; production adds the reverse proxy
and TLS:

| Service | Image | Role |
|---|---|---|
| `postgres` | `postgres:16-alpine` | Primary database (one DB, schema per module) |
| `redis` | `redis:7-alpine` | Cache, sessions, OTP |
| `rabbitmq` | `rabbitmq:3.13` | Message broker (transactional outbox → consumers) |
| `minio` | `minio/minio` | S3-compatible object storage for product images |
| `migrate` | `migrate/migrate:v4.17.0` | Applies `backend/db/migrations` on startup |
| `app` | backend image | The Go API |
| `order` | order frontend image | Customer storefront |
| `console` | console frontend image | Back-office console |
| `nginx` *(prod)* | `nginx:alpine` | Reverse proxy + TLS termination |
| `certbot` *(prod)* | `certbot/certbot` | Let's Encrypt issuance + auto-renew |
| `mailhog` *(local)* | `mailhog/mailhog` | Captures outgoing email for inspection |

In production the `web` branding site is hosted separately; only `order` and `console`
are containerized here.

## Local stack

Use this to run the whole platform on your machine the way CI builds it — the frontends
prerender against a **live** backend (no mock fallback), so the backend must be healthy
before they build. `up-local.sh` orchestrates that ordering for you.

```bash
cd deploy
./up-local.sh
```

What the script does:

1. Builds and starts infra + backend (`postgres`, `redis`, `rabbitmq`, `minio`,
   `mailhog`, `migrate`, `app`).
2. Waits for the backend `/health/ready` endpoint.
3. Seeds the demo catalog (idempotent) so frontend prerender sees real data.
4. Builds the frontends attached to the live Compose network so their build-time
   fetch to `http://app:8080` succeeds.
5. Starts the frontends.

URLs once it's up:

| Service | URL |
|---|---|
| `web` (branding) | <http://localhost:3001> |
| `order` (storefront) | <http://localhost:3002> |
| `console` (back-office) | <http://localhost:3003> |
| Backend API | <http://localhost:8080/api/v1> |
| Swagger UI | <http://localhost:8080/swagger/index.html> |
| MailHog | <http://localhost:8025> |
| MinIO console | <http://localhost:9001> (`minioadmin` / `minioadmin`) |
| RabbitMQ management | <http://localhost:15672> (`guest` / `guest`) |

Tear down with `docker compose -f docker-compose.local.yml down` (add `-v` to wipe
volumes / data).

## Production stack

Production runs pre-built images that the [CI/CD workflows](../.github/workflows/) push
on every merge to `main`. The VPS pulls those images and runs them behind Nginx with
Let's Encrypt TLS.

### 1. Configure the runtime env

```bash
cp .env.prod.example .env.prod
# Fill in every <placeholder>: Docker Hub user, JWT secret, DB/Redis/RabbitMQ/MinIO
# passwords, SMTP credentials, and the public URLs/domains.
```

`.env.prod` is gitignored — it holds real secrets and lives only on the VPS at
`/home/deploy/bakerio/deploy/.env.prod`.

Key variables (see [.env.prod.example](.env.prod.example) for the full list):

| Variable | Meaning |
|---|---|
| `DOCKER_USERNAME` / `IMAGE_TAG` | Which images to pull |
| `JWT_SECRET` / `JWT_EXPIRY` | Token signing |
| `DB_*`, `REDIS_PASSWORD`, `RABBITMQ_*`, `MINIO_*` | Infra credentials |
| `EMAIL_*` | SMTP server for transactional email |
| `API_URL`, `BRANDING_URL`, `ORDER_URL`, `CONSOLE_URL` | Public URLs baked into the frontends |

### 2. Bootstrap TLS (one time, on the VPS)

Nginx references certs that don't exist on a fresh box, but Certbot's HTTP-01 challenge
needs Nginx already serving `:80`. `init-letsencrypt.sh` breaks that deadlock: it plants
a temporary self-signed cert, boots Nginx, obtains the real cert, then reloads.

```bash
cd /home/deploy/bakerio/deploy
EMAIL=you@example.com ./init-letsencrypt.sh
# STAGING=1 to test against Let's Encrypt staging (avoids rate limits)
# ./init-letsencrypt.sh --force to recreate an existing cert
```

Edit the `DOMAINS` / `CERT_NAME` / `EMAIL` values in the script to match your DNS before
running. Each domain in `DOMAINS` must have an A record pointing at the VPS. After this,
Certbot auto-renews and Nginx reloads every 6h to pick up renewals.

### 3. Bring the stack up

```bash
docker compose -f docker-compose.prod.yml --env-file .env.prod pull
docker compose -f docker-compose.prod.yml --env-file .env.prod up -d
```

The `migrate` service applies pending migrations before `app` starts serving. This is
also what the CD workflow runs after pushing new images.

## Notes

- **Migrations** run automatically via the `migrate` service against
  `backend/db/migrations`. To add or change schema, see
  [backend/DEVELOPMENT.md](../backend/DEVELOPMENT.md).
- **Routing** in production is domain-based via `nginx.conf` (one subdomain each for
  the API, order, and console).
- **Secrets** never live in git — only `*.example` templates are committed; the real
  `.env.prod` stays on the VPS.
