"""Shared pytest fixtures.

Conventions:
- Session-scoped clients per role: log in once per role per test session.
- Function-scoped data fixtures (branch, category, product, supplier): each
  test gets a fresh entity to mutate, with uuid-suffixed names so reruns
  don't collide.
- `super_client` uses the seeded super_admin (wildcard *:*:all) and is the
  fallback admin for setup that needs broad permissions.
"""
from __future__ import annotations

import os
from collections.abc import Iterator

import httpx
import pytest

from helpers import (
    bearer,
    branch_payload,
    category_payload,
    data,
    login,
    product_payload,
    supplier_payload,
)

BASE_URL = os.environ.get("BAKERIO_BASE_URL", "http://localhost:8080/api/v1")
ADMIN_PASSWORD = os.environ.get("BAKERIO_ADMIN_PASSWORD", "123456")

SEEDED_ADMINS: dict[str, str] = {
    "super_admin": "superadmin@bakerio.com",
    "general_manager": "gm@bakerio.com",
    "inventory_manager": "inventory@bakerio.com",
    "marketing_manager": "marketing@bakerio.com",
    "store_manager": "store@bakerio.com",
}


# --- Base client (no auth) -----------------------------------------------------

@pytest.fixture(scope="session")
def base_url() -> str:
    return BASE_URL


@pytest.fixture(scope="session")
def anon_client(base_url: str) -> Iterator[httpx.Client]:
    """Anonymous client — no Authorization header."""
    with httpx.Client(base_url=base_url, timeout=30.0) as c:
        # Sanity check that the server is reachable so failures are obvious.
        try:
            c.get("/auth/login", timeout=5.0)
        except httpx.HTTPError as exc:  # pragma: no cover - dev-only diagnostic
            pytest.exit(
                f"backend not reachable at {base_url}: {exc}. "
                "Start the server with `make run` from backend/.",
                returncode=1,
            )
        yield c


# --- Role tokens & clients -----------------------------------------------------

@pytest.fixture(scope="session")
def tokens(anon_client: httpx.Client) -> dict[str, str]:
    """Map of role -> bearer token. Missing logins are recorded as None."""
    out: dict[str, str] = {}
    for role, email in SEEDED_ADMINS.items():
        try:
            out[role] = login(anon_client, email, ADMIN_PASSWORD)
        except AssertionError:
            # store_manager often fails without a branch — caller should check.
            out[role] = ""
    return out


def _role_client(base_url: str, token: str) -> httpx.Client:
    return httpx.Client(base_url=base_url, timeout=30.0, headers=bearer(token))


@pytest.fixture(scope="session")
def super_client(base_url: str, tokens: dict[str, str]) -> Iterator[httpx.Client]:
    token = tokens["super_admin"]
    if not token:
        pytest.exit(
            "super_admin login failed — is the seed account present?",
            returncode=1,
        )
    with _role_client(base_url, token) as c:
        yield c


@pytest.fixture(scope="session")
def gm_client(base_url: str, tokens: dict[str, str]) -> Iterator[httpx.Client]:
    if not tokens["general_manager"]:
        pytest.skip("general_manager login unavailable")
    with _role_client(base_url, tokens["general_manager"]) as c:
        yield c


@pytest.fixture(scope="session")
def inventory_client(
    base_url: str, tokens: dict[str, str]
) -> Iterator[httpx.Client]:
    if not tokens["inventory_manager"]:
        pytest.skip("inventory_manager login unavailable")
    with _role_client(base_url, tokens["inventory_manager"]) as c:
        yield c


@pytest.fixture(scope="session")
def marketing_client(
    base_url: str, tokens: dict[str, str]
) -> Iterator[httpx.Client]:
    if not tokens["marketing_manager"]:
        pytest.skip("marketing_manager login unavailable")
    with _role_client(base_url, tokens["marketing_manager"]) as c:
        yield c


@pytest.fixture(scope="session")
def store_client(
    base_url: str, tokens: dict[str, str]
) -> Iterator[httpx.Client]:
    """Store-manager client.

    The seeded store@bakerio.com has no branch_id, so it fails login until
    something has assigned one. We let the test skip rather than fail.
    """
    if not tokens.get("store_manager"):
        pytest.skip(
            "store_manager has no branch_id assigned; cannot log in. "
            "Assign a branch and re-run if you need store-scoped tests."
        )
    with _role_client(base_url, tokens["store_manager"]) as c:
        yield c


# --- Resource factories --------------------------------------------------------

@pytest.fixture
def branch(super_client: httpx.Client) -> dict:
    """Create a branch and yield its dto. No teardown — soft-delete handles dedup."""
    return data(super_client.post("/branch", json=branch_payload()), 201)


@pytest.fixture
def category(super_client: httpx.Client) -> dict:
    return data(super_client.post("/categories", json=category_payload()), 201)


@pytest.fixture
def product(super_client: httpx.Client, category: dict) -> dict:
    return data(
        super_client.post(
            "/products",
            json=product_payload(category_id=category["id"]),
        ),
        201,
    )


@pytest.fixture
def supplier(super_client: httpx.Client) -> dict:
    return data(super_client.post("/suppliers", json=supplier_payload()), 201)
