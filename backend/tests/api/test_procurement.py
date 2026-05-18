"""Tests for /procurement endpoints.

Note: most procurement endpoints require ``procurement:manage:branch`` or
``procurement:view:branch`` *and* a branch_id on the caller. The seeded
inventory_manager has the permissions but no branch_id, so we use
super_admin (wildcard *:*:all) which can hit any branch-scoped route by
falling back to its own context. If your deployment has a true store_manager
with a branch_id, prefer the ``store_client`` fixture for these.
"""
from __future__ import annotations

import httpx
import pytest

from helpers import data, error_code, supplier_payload, uniq


pytestmark = pytest.mark.procurement


# --- Auth ----------------------------------------------------------------------

@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/procurement/orders"),
        ("GET", "/procurement/orders/00000000-0000-0000-0000-000000000000"),
        ("POST", "/procurement/orders"),
        ("PATCH", "/procurement/orders/00000000-0000-0000-0000-000000000000/status"),
    ],
)
def test_anon_blocked(anon_client: httpx.Client, method, path):
    r = anon_client.request(method, path, json={})
    assert r.status_code == 401


# --- POST /procurement/orders --------------------------------------------------

@pytest.fixture
def procurement_actor(super_client, store_client):
    """Use the store-manager client when available; fall back to super_admin."""
    return store_client if store_client else super_client


class TestCreatePO:
    def test_happy_path(
        self,
        super_client: httpx.Client,
        procurement_actor: httpx.Client,
        supplier: dict,
        product: dict,
    ):
        payload = {
            "supplier_id": supplier["id"],
            "note": "Test PO",
            "items": [
                {
                    "product_id": product["id"],
                    "quantity": "10",
                    "unit_price": "5",
                }
            ],
        }
        body = data(procurement_actor.post("/procurement/orders", json=payload), 201)
        assert body["supplier_id"] == supplier["id"]
        assert body["status"] in ("DRAFT", "draft")
        assert str(body["total_amount"]) in ("50", "50.00")
        assert len(body["items"]) == 1

    def test_supplier_not_found_returns_404(
        self, procurement_actor: httpx.Client, product: dict
    ):
        r = procurement_actor.post(
            "/procurement/orders",
            json={
                "supplier_id": "00000000-0000-0000-0000-000000000000",
                "items": [
                    {
                        "product_id": product["id"],
                        "quantity": "1",
                        "unit_price": "1",
                    }
                ],
            },
        )
        assert error_code(r, 404)

    @pytest.mark.parametrize(
        "payload_factory,_id",
        [
            (lambda s, p: {}, "empty"),
            (lambda s, p: {"supplier_id": s, "items": []}, "no-items"),
            (
                lambda s, p: {"supplier_id": s, "items": [{"product_id": p}]},
                "item-missing-fields",
            ),
            (
                lambda s, p: {"items": [
                    {"product_id": p, "quantity": "1", "unit_price": "1"}
                ]},
                "missing-supplier",
            ),
        ],
    )
    def test_validation_returns_422(
        self,
        procurement_actor: httpx.Client,
        supplier: dict,
        product: dict,
        payload_factory,
        _id,
    ):
        payload = payload_factory(supplier["id"], product["id"])
        assert error_code(
            procurement_actor.post("/procurement/orders", json=payload), 422
        )


# --- GET /procurement/orders ---------------------------------------------------

def test_list_includes_created(
    procurement_actor: httpx.Client, supplier: dict, product: dict
):
    body = data(
        procurement_actor.post(
            "/procurement/orders",
            json={
                "supplier_id": supplier["id"],
                "items": [
                    {
                        "product_id": product["id"],
                        "quantity": "1",
                        "unit_price": "1",
                    }
                ],
            },
        ),
        201,
    )
    listed = data(procurement_actor.get("/procurement/orders"), 200)
    ids = [po["id"] for po in listed]
    assert body["id"] in ids


# --- GET /procurement/orders/:id -----------------------------------------------

class TestGetPO:
    def test_not_found(self, procurement_actor: httpx.Client):
        zero = "00000000-0000-0000-0000-000000000000"
        assert error_code(
            procurement_actor.get(f"/procurement/orders/{zero}"), 404
        )

    def test_invalid_uuid(self, procurement_actor: httpx.Client):
        assert error_code(
            procurement_actor.get("/procurement/orders/not-uuid"), 422
        )


# --- PATCH /procurement/orders/:id/status --------------------------------------

@pytest.fixture
def draft_po(procurement_actor, supplier, product) -> dict:
    return data(
        procurement_actor.post(
            "/procurement/orders",
            json={
                "supplier_id": supplier["id"],
                "items": [
                    {
                        "product_id": product["id"],
                        "quantity": "1",
                        "unit_price": "1",
                    }
                ],
            },
        ),
        201,
    )


class TestStateMachine:
    def test_draft_to_pending_to_approved(
        self, procurement_actor: httpx.Client, draft_po: dict
    ):
        path = f"/procurement/orders/{draft_po['id']}/status"
        body = data(
            procurement_actor.patch(path, json={"status": "PENDING"}), 200
        )
        assert body["status"] == "PENDING"

        body = data(
            procurement_actor.patch(path, json={"status": "APPROVED"}), 200
        )
        assert body["status"] == "APPROVED"

    def test_invalid_transition_rejected(
        self, procurement_actor: httpx.Client, draft_po: dict
    ):
        # DRAFT -> APPROVED is not allowed (must go through PENDING).
        r = procurement_actor.patch(
            f"/procurement/orders/{draft_po['id']}/status",
            json={"status": "APPROVED"},
        )
        assert error_code(r, 422)

    def test_unknown_status_rejected(
        self, procurement_actor: httpx.Client, draft_po: dict
    ):
        r = procurement_actor.patch(
            f"/procurement/orders/{draft_po['id']}/status",
            json={"status": "BOGUS"},
        )
        assert error_code(r, 422)

    def test_not_found(self, procurement_actor: httpx.Client):
        zero = "00000000-0000-0000-0000-000000000000"
        r = procurement_actor.patch(
            f"/procurement/orders/{zero}/status",
            json={"status": "PENDING"},
        )
        assert error_code(r, 404)


# --- Cross-region PO (business rule check, if implemented) ---------------------

@pytest.mark.slow
def test_full_lifecycle_emits_received(
    procurement_actor: httpx.Client, supplier: dict, product: dict
):
    po = data(
        procurement_actor.post(
            "/procurement/orders",
            json={
                "supplier_id": supplier["id"],
                "items": [
                    {
                        "product_id": product["id"],
                        "quantity": "2",
                        "unit_price": "3",
                    }
                ],
            },
        ),
        201,
    )
    path = f"/procurement/orders/{po['id']}/status"
    for next_status in ("PENDING", "APPROVED", "RECEIVED"):
        body = data(procurement_actor.patch(path, json={"status": next_status}), 200)
        assert body["status"] == next_status
