"""RBAC authorization matrix.

For every (role, method, path) cell we record either:
  - ``"allow"``  → caller should reach the handler (2xx, or 4xx for *data*
                   reasons like 404/422 — never 403)
  - ``"deny"``   → caller should be rejected by ``RequirePermission`` (403)

The matrix is built per-endpoint to keep the table compact:
``ENDPOINTS = [(method, path, body_factory, allowed_roles), ...]``

We then expand it to (role, endpoint) pairs and assert the outcome.

This file is the single source of truth for role authorization in the API. If
you change a route's permission, update its row here.
"""
from __future__ import annotations

from typing import Callable

import httpx
import pytest

from helpers import (
    branch_payload,
    category_payload,
    product_payload,
    supplier_payload,
)


pytestmark = pytest.mark.rbac


ROLES = ("super_admin", "general_manager", "inventory_manager",
         "marketing_manager", "store_manager")

# Each entry: (method, path, body_factory_or_None, allowed_roles_set, label)
#
# For *write* methods, body_factory(payload_ctx) returns a JSON-serializable
# body. payload_ctx is a dict with shared ids: 'branch_id', 'category_id',
# 'product_id', 'supplier_id', 'user_id', 'po_id' — pre-created in a session
# fixture below.
ENDPOINTS: list[tuple[str, str, Callable | None, set[str], str]] = [
    # --- /branch (branch:view:all / branch:manage:all + branch:update:all) ---
    ("GET",    "/branch",                 None,
     {"super_admin", "general_manager"}, "list-branches"),
    ("GET",    "/branch/{branch_id}",     None,
     {"super_admin", "general_manager"}, "get-branch"),
    ("POST",   "/branch",                 lambda ctx: branch_payload(),
     {"super_admin"}, "create-branch"),
    ("PATCH",  "/branch/{branch_id}",     lambda ctx: {"name": "rbac-test"},
     {"super_admin"}, "update-branch"),
    ("PATCH",  "/branch/{branch_id}/status",
     lambda ctx: {"status": "active"},
     {"super_admin"}, "branch-status"),
    ("DELETE", "/branch/{branch_id}",     None,
     {"super_admin"}, "delete-branch"),

    # --- /categories (product:view:all / product:manage:all) -----------------
    ("GET",    "/categories",             None,
     {"super_admin", "general_manager", "inventory_manager",
      "marketing_manager", "store_manager"}, "list-categories"),
    ("GET",    "/categories/{category_id}", None,
     {"super_admin", "general_manager", "inventory_manager",
      "marketing_manager", "store_manager"}, "get-category"),
    ("POST",   "/categories",
     lambda ctx: category_payload(),
     {"super_admin", "general_manager", "inventory_manager",
      "marketing_manager"}, "create-category"),
    ("PATCH",  "/categories/{category_id}",
     lambda ctx: {"name": "rbac-cat", "sort_order": 0, "is_active": True},
     {"super_admin", "general_manager", "inventory_manager",
      "marketing_manager"}, "update-category"),
    ("DELETE", "/categories/{category_id}", None,
     {"super_admin", "general_manager", "inventory_manager",
      "marketing_manager"}, "delete-category"),

    # --- /products (product:view:all / product:manage:all / update_price) ----
    ("GET",    "/products",               None,
     {"super_admin", "general_manager", "inventory_manager",
      "marketing_manager", "store_manager"}, "list-products"),
    ("GET",    "/products/{product_id}",  None,
     {"super_admin", "general_manager", "inventory_manager",
      "marketing_manager", "store_manager"}, "get-product"),
    ("POST",   "/products",
     lambda ctx: product_payload(category_id=ctx["category_id"]),
     {"super_admin", "general_manager", "inventory_manager",
      "marketing_manager"}, "create-product"),
    ("PATCH",  "/products/{product_id}",  lambda ctx: {"name": "rbac-prod"},
     {"super_admin", "general_manager", "inventory_manager",
      "marketing_manager"}, "update-product"),
    ("DELETE", "/products/{product_id}",  None,
     {"super_admin", "general_manager", "inventory_manager",
      "marketing_manager"}, "delete-product"),
    ("POST",   "/products/{product_id}/prices",
     lambda ctx: {"branch_id": ctx["branch_id"], "price": "1.00"},
     {"super_admin", "general_manager", "inventory_manager",
      "marketing_manager"}, "set-price"),
    ("GET",    "/products/{product_id}/prices", None,
     {"super_admin", "general_manager", "inventory_manager",
      "marketing_manager", "store_manager"}, "get-price-history"),

    # --- /suppliers (supplier:view:all / supplier:manage:all) ----------------
    ("GET",    "/suppliers?region=south", None,
     {"super_admin", "inventory_manager", "store_manager"}, "list-suppliers"),
    ("GET",    "/suppliers/{supplier_id}", None,
     {"super_admin", "inventory_manager", "store_manager"}, "get-supplier"),
    ("POST",   "/suppliers",              lambda ctx: supplier_payload(),
     {"super_admin", "inventory_manager"}, "create-supplier"),
    ("PATCH",  "/suppliers/{supplier_id}", lambda ctx: {"name": "rbac-sup"},
     {"super_admin", "inventory_manager"}, "update-supplier"),
    ("DELETE", "/suppliers/{supplier_id}", None,
     {"super_admin", "inventory_manager"}, "delete-supplier"),

    # --- /procurement (procurement:view:branch / manage:branch / approve) ----
    ("GET",    "/procurement/orders",     None,
     {"super_admin", "inventory_manager", "store_manager"}, "list-pos"),
    ("GET",    "/procurement/orders/{po_id}", None,
     {"super_admin", "inventory_manager", "store_manager"}, "get-po"),
    ("POST",   "/procurement/orders",
     lambda ctx: {
         "supplier_id": ctx["supplier_id"],
         "items": [{
             "product_id": ctx["product_id"],
             "quantity": "1",
             "unit_price": "1",
         }],
     },
     {"super_admin", "inventory_manager", "store_manager"}, "create-po"),
    ("PATCH",  "/procurement/orders/{po_id}/status",
     lambda ctx: {"status": "PENDING"},
     {"super_admin", "inventory_manager", "store_manager"}, "update-po-status"),

    # --- /users (user:manage:all / user:view:all / user:manage:branch) -------
    ("POST",   "/users",
     lambda ctx: {
         "email": "rbac-noop@example.invalid",  # may 409 if dup; we accept 4xx
         "full_name": "X",
         "password": "password123",
         "role": "marketing_manager",
     },
     {"super_admin", "general_manager", "store_manager"}, "create-user"),
    ("GET",    "/users/{user_id}/profile", None,
     {"super_admin", "general_manager", "store_manager"}, "get-user-profile"),
    ("PATCH",  "/users/{user_id}/profile", lambda ctx: {"full_name": "x"},
     {"super_admin", "general_manager", "store_manager"},
     "update-user-profile"),
    ("PATCH",  "/users/{user_id}/password",
     lambda ctx: {"password": "rotated1234"},
     {"super_admin", "general_manager", "store_manager"},
     "set-user-password"),

    # --- /profile (no perm required; just auth) ------------------------------
    ("GET",    "/profile",                None,
     set(ROLES), "get-self-profile"),
    ("PATCH",  "/profile",
     lambda ctx: {"display_name": "rbac"},
     set(ROLES), "update-self-profile"),
]


@pytest.fixture(scope="session")
def rbac_ctx(super_client: httpx.Client) -> dict[str, str]:
    """Shared resource IDs used in path templates across the matrix."""
    from helpers import data
    branch = data(super_client.post("/branch", json=branch_payload()), 201)
    category = data(super_client.post("/categories", json=category_payload()), 201)
    product = data(
        super_client.post(
            "/products",
            json=product_payload(category_id=category["id"]),
        ),
        201,
    )
    supplier = data(super_client.post("/suppliers", json=supplier_payload()), 201)
    user = data(
        super_client.post(
            "/users",
            json={
                "email": f"rbac-target-{branch['id'][:8]}@example.com",
                "full_name": "RBAC Target",
                "password": "password123",
                "role": "marketing_manager",
            },
        ),
        201,
    )
    # Best-effort PO; if the super_admin can't post procurement (because of
    # no branch_id in JWT), use a placeholder UUID and accept 404 in the matrix.
    po_id = "00000000-0000-0000-0000-000000000000"
    try:
        po = super_client.post(
            "/procurement/orders",
            json={
                "supplier_id": supplier["id"],
                "items": [{
                    "product_id": product["id"],
                    "quantity": "1",
                    "unit_price": "1",
                }],
            },
        )
        if po.status_code == 201:
            po_id = po.json()["data"]["id"]
    except Exception:
        pass
    return {
        "branch_id": branch["id"],
        "category_id": category["id"],
        "product_id": product["id"],
        "supplier_id": supplier["id"],
        "user_id": user["id"],
        "po_id": po_id,
    }


def _role_client(request, role: str):
    """Resolve the appropriate session client fixture for a role."""
    fixture_map = {
        "super_admin": "super_client",
        "general_manager": "gm_client",
        "inventory_manager": "inventory_client",
        "marketing_manager": "marketing_client",
        "store_manager": "store_client",
    }
    return request.getfixturevalue(fixture_map[role])


# Flatten the matrix to (role, endpoint) rows so each pair is its own test id.
_PARAMS = [
    pytest.param(role, ep, id=f"{role}-{ep[4]}")
    for ep in ENDPOINTS
    for role in ROLES
]


@pytest.mark.parametrize("role,endpoint", _PARAMS)
def test_rbac_matrix(request, rbac_ctx, role: str, endpoint):
    method, path_tmpl, body_factory, allowed, _label = endpoint
    try:
        client: httpx.Client = _role_client(request, role)
    except pytest.skip.Exception:
        pytest.skip(f"client unavailable for role {role}")

    path = path_tmpl.format(**rbac_ctx)
    body = body_factory(rbac_ctx) if body_factory else None

    if method == "GET":
        r = client.get(path)
    elif method == "DELETE":
        r = client.delete(path)
    else:
        r = client.request(method, path, json=body)

    if role in allowed:
        # Permission check passed. Must not be 403. Accept 2xx and downstream
        # 4xx (validation/not-found/conflict) since the matrix only verifies
        # authorization, not data-level correctness.
        assert r.status_code != 403, (
            f"{role} should reach {method} {path}, got 403: {r.text}"
        )
        assert r.status_code < 500, (
            f"{role} got 5xx on {method} {path}: {r.text}"
        )
    else:
        assert r.status_code == 403, (
            f"{role} should be forbidden from {method} {path}, "
            f"got {r.status_code}: {r.text}"
        )
