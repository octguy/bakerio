# API test suite

End-to-end tests that hit a running backend on `localhost:8080`.

## Setup

```bash
# 1. Start backend (separate terminal)
cd backend
make docker-up
make migrate-up
make run

# 2. Install test deps + run
cd backend/tests/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
pytest
```

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `BAKERIO_BASE_URL` | `http://localhost:8080/api/v1` | API base URL (no trailing slash) |
| `BAKERIO_ADMIN_PASSWORD` | `123456` | Password used for the seeded admins |

## Layout

```
conftest.py              shared fixtures (clients, role tokens, seeded branch)
helpers.py               HTTP assertion helpers, data factories
test_auth.py             /auth/register, login, verify, logout, password
test_users.py            /users admin endpoints
test_profile.py          /profile self endpoints
test_branch.py           /branch CRUD + status
test_categories.py       /categories CRUD
test_products.py         /products CRUD + /prices + /images
test_suppliers.py        /suppliers CRUD
test_procurement.py      /procurement/orders CRUD + state machine
test_rbac_matrix.py      role × endpoint authorization matrix
```

## Running subsets

```bash
pytest -m branch               # one resource
pytest -m "branch or product"  # multiple
pytest -m "not slow"           # skip multi-step flows
pytest test_rbac_matrix.py -v  # full RBAC table with subtest names
pytest -k "create"             # by name fragment
```

## State assumptions

- Backend must be running with **seeded admin accounts** (`seedAdmins` runs on startup):
  `superadmin@bakerio.com`, `gm@`, `inventory@`, `marketing@`, `store@` — all password `123456`.
- The `store_manager` seed has no branch by default. The first test that needs it
  creates a branch via super_admin and assigns it via `PATCH /users/:id/branch` *if that endpoint exists*; otherwise the store_manager fixture is skipped with a clear message.
- Tests do **not** reset DB state. They use UUID-suffixed names/SKUs to avoid collisions
  and rely on soft-delete to avoid uniqueness conflicts across runs.

## Adding tests

- New resource → new `test_<resource>.py`, mark with `@pytest.mark.<resource>`, add a row to `pytest.ini`.
- For RBAC, just add a row to the `MATRIX` table in `test_rbac_matrix.py`.
- Prefer parametrize over copy-paste for similar-shape cases (validation errors,
  forbidden, not-found).
