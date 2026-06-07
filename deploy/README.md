# Bakerio Deployment

Docker Compose stacks for running Bakerio — a **local** stack for full-stack
development with production fidelity, and a **production** stack for the VPS behind
Nginx + Let's Encrypt.

```
docker-compose.local.yml    Full local stack (infra + backend + all 3 frontends in dev mode)
docker-compose.prod.yml     Production stack (pulls pushed images, Nginx, Certbot)
Makefile                    Shortcuts for the local stack (make up / down / logs / ...)
up-local.sh                 One-command local bring-up (build, wait for backend, seed demo)
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

Runs the whole platform on your machine. The three frontends run in **dev mode**
(`next dev`, see [../frontend/Dockerfile.local](../frontend/Dockerfile.local)), so they
fetch from the backend at **request time** rather than baking data in at build time. That
keeps the bring-up to a single `docker compose up --build` — no build-time prerender, and
no attaching the image build to the Compose network. Source under `frontend/` is
bind-mounted, so edits hot-reload without a rebuild.

```bash
cd deploy
make up          # or: ./up-local.sh
```

Common tasks (run `make` with no target to list them all):

| Command | What it does |
|---|---|
| `make up` | Build + start everything, wait for backend, seed demo |
| `make down` | Stop and remove containers (keeps data) |
| `make clean` | `down` **and wipe volumes** (DB, MinIO, …) |
| `make restart` | `down` then `up` |
| `make logs` | Tail all logs (`make logs s=order` for one service) |
| `make ps` | Container status |
| `make build` | Rebuild images (`s=console` for one; `make rebuild` for no-cache) |
| `make sh s=app` | Open a shell in a container |
| `make health` | Curl the backend readiness endpoint |

What `up-local.sh` (`make up`) does:

1. Builds and starts the whole stack in one pass — infra (`postgres`, `redis`,
   `rabbitmq`, `minio`, `mailhog`), `migrate`, the backend `app`, and the three
   frontends.
2. Waits for the backend `/health/ready` endpoint.
3. Seeds the demo catalog (idempotent) so the apps have real data to render.

> First load of each frontend page is slower while the dev server compiles it on demand.
>
> API routing: `order` and `console` run a Node server, so the browser calls their
> same-origin `/api/backend` proxy, which forwards to `app:8080` inside the network. The
> `web` branding site is a static export with no server, so its browser calls hit the
> backend directly at `localhost:8080` (the backend's CORS is permissive in dev).

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

Tear down with `make down` (or `docker compose -f docker-compose.local.yml down`). Use
`make clean` (i.e. `down -v`) to also wipe volumes / data.

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
