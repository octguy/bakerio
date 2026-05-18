"""Tests for /suppliers endpoints."""
from __future__ import annotations

import httpx
import pytest

from helpers import assert_status, data, error_code, supplier_payload, uniq


pytestmark = pytest.mark.suppliers


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/suppliers"),
        ("GET", "/suppliers/00000000-0000-0000-0000-000000000000"),
        ("POST", "/suppliers"),
        ("PATCH", "/suppliers/00000000-0000-0000-0000-000000000000"),
        ("DELETE", "/suppliers/00000000-0000-0000-0000-000000000000"),
    ],
)
def test_anon_blocked(anon_client: httpx.Client, method, path):
    r = anon_client.request(method, path, json={})
    assert r.status_code == 401


# --- POST ----------------------------------------------------------------------

class TestCreate:
    def test_happy_path(self, super_client: httpx.Client):
        payload = supplier_payload(name=uniq("ACME"))
        body = data(super_client.post("/suppliers", json=payload), 201)
        assert body["name"] == payload["name"]
        assert body["region"] == payload["region"]
        assert body["is_active"] is True

    @pytest.mark.parametrize(
        "payload",
        [
            pytest.param({}, id="empty"),
            pytest.param(supplier_payload(name=""), id="empty-name"),
            pytest.param(supplier_payload(region="east"), id="invalid-region"),
            pytest.param(
                supplier_payload(name="x" * 256), id="name-too-long"
            ),
        ],
    )
    def test_validation_returns_422(self, super_client, payload):
        assert error_code(super_client.post("/suppliers", json=payload), 422)


# --- GET -----------------------------------------------------------------------

def test_list_includes_created(super_client: httpx.Client, supplier: dict):
    # List requires a region query; supplier fixture defaults to south.
    body = data(super_client.get("/suppliers?region=south"), 200)
    ids = [s["id"] for s in body]
    assert supplier["id"] in ids


def test_list_filter_by_region(super_client: httpx.Client):
    n_payload = supplier_payload(region="north", name=uniq("north-sup"))
    s_payload = supplier_payload(region="south", name=uniq("south-sup"))
    n = data(super_client.post("/suppliers", json=n_payload), 201)
    s = data(super_client.post("/suppliers", json=s_payload), 201)

    north_ids = [
        x["id"] for x in data(super_client.get("/suppliers?region=north"), 200)
    ]
    assert n["id"] in north_ids
    assert s["id"] not in north_ids


class TestGetByID:
    def test_happy_path(self, super_client: httpx.Client, supplier: dict):
        body = data(super_client.get(f"/suppliers/{supplier['id']}"), 200)
        assert body["id"] == supplier["id"]

    def test_not_found(self, super_client: httpx.Client):
        zero = "00000000-0000-0000-0000-000000000000"
        assert error_code(super_client.get(f"/suppliers/{zero}"), 404)

    def test_invalid_uuid(self, super_client: httpx.Client):
        assert error_code(super_client.get("/suppliers/not-uuid"), 422)


# --- PATCH ---------------------------------------------------------------------

class TestUpdate:
    def test_partial_update(self, super_client: httpx.Client, supplier: dict):
        new_name = uniq("renamed-sup")
        body = data(
            super_client.patch(
                f"/suppliers/{supplier['id']}",
                json={"name": new_name, "is_active": False},
            ),
            200,
        )
        assert body["name"] == new_name
        assert body["is_active"] is False

    def test_invalid_region_rejected(
        self, super_client: httpx.Client, supplier: dict
    ):
        r = super_client.patch(
            f"/suppliers/{supplier['id']}", json={"region": "east"}
        )
        assert error_code(r, 422)


# --- DELETE --------------------------------------------------------------------

def test_soft_delete(super_client: httpx.Client, supplier: dict):
    assert_status(super_client.delete(f"/suppliers/{supplier['id']}"), 204)
    assert error_code(super_client.get(f"/suppliers/{supplier['id']}"), 404)
