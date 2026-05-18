"""HTTP assertion helpers and data factories shared across test modules."""
from __future__ import annotations

import uuid
from typing import Any

import httpx


# --- Response helpers ----------------------------------------------------------

def assert_status(r: httpx.Response, expected: int) -> None:
    """Assert HTTP status with the response body included on failure."""
    assert r.status_code == expected, (
        f"expected {expected}, got {r.status_code}: {r.text}"
    )


def data(r: httpx.Response, expected: int = 200) -> Any:
    """Assert status and return the `data` field of the success envelope."""
    assert_status(r, expected)
    body = r.json()
    assert "data" in body, f"missing data envelope: {body}"
    return body["data"]


def error_code(r: httpx.Response, expected_status: int) -> str:
    """Assert the failure status and return the error code from the envelope."""
    assert_status(r, expected_status)
    body = r.json()
    assert "error" in body and "code" in body["error"], f"bad error envelope: {body}"
    return body["error"]["code"]


# --- Auth helpers --------------------------------------------------------------

def bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def login(client: httpx.Client, email: str, password: str) -> str:
    """Login and return the bearer token."""
    r = client.post("/auth/login", json={"email": email, "password": password})
    return data(r, 200)["access_token"]


# --- Data factories ------------------------------------------------------------

def uniq(prefix: str = "test") -> str:
    """A short unique suffix, safe for SKU/email/slug."""
    return f"{prefix}-{uuid.uuid4().hex[:8]}"


def branch_payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "name": uniq("branch"),
        "address": "123 Test St",
        "region": "south",
    }
    payload.update(overrides)
    return payload


def category_payload(**overrides: Any) -> dict[str, Any]:
    payload = {"name": uniq("cat"), "sort_order": 0}
    payload.update(overrides)
    return payload


def product_payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "sku": uniq("SKU").upper(),
        "name": uniq("product"),
        "unit": "kg",
        "price": "10.00",
    }
    payload.update(overrides)
    return payload


def supplier_payload(**overrides: Any) -> dict[str, Any]:
    payload = {
        "name": uniq("supplier"),
        "contact_info": "test@supplier.example",
        "region": "south",
    }
    payload.update(overrides)
    return payload
