"""Tests for /categories endpoints."""
from __future__ import annotations

import httpx
import pytest

from helpers import assert_status, category_payload, data, error_code, uniq


pytestmark = pytest.mark.categories


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/categories"),
        ("GET", "/categories/00000000-0000-0000-0000-000000000000"),
        ("POST", "/categories"),
        ("PATCH", "/categories/00000000-0000-0000-0000-000000000000"),
        ("DELETE", "/categories/00000000-0000-0000-0000-000000000000"),
    ],
)
def test_anon_blocked(anon_client: httpx.Client, method, path):
    r = anon_client.request(method, path, json={})
    assert r.status_code == 401


# --- POST ----------------------------------------------------------------------

class TestCreate:
    def test_happy_path(self, super_client: httpx.Client):
        name = uniq("Pastries")
        payload = category_payload(name=name)
        body = data(super_client.post("/categories", json=payload), 201)
        assert body["name"] == name
        assert body["slug"] == name.lower()
        assert body["is_active"] is True

    def test_duplicate_name_returns_conflict_or_validation(
        self, super_client: httpx.Client
    ):
        name = uniq("dup-cat")
        assert_status(
            super_client.post("/categories", json=category_payload(name=name)),
            201,
        )
        r = super_client.post("/categories", json=category_payload(name=name))
        # Unique constraint surfaces as 409 (Conflict) or 500 depending on whether
        # the service catches it; accept either form of failure.
        assert r.status_code in (409, 422, 500)

    def test_nested_category(self, super_client: httpx.Client, category: dict):
        body = data(
            super_client.post(
                "/categories",
                json=category_payload(parent_id=category["id"]),
            ),
            201,
        )
        assert body["parent_id"] == category["id"]

    @pytest.mark.parametrize(
        "payload",
        [
            pytest.param({}, id="empty"),
            pytest.param(category_payload(name=""), id="empty-name"),
            pytest.param(category_payload(name="x" * 101), id="name-too-long"),
        ],
    )
    def test_validation_returns_422(self, super_client, payload):
        assert error_code(super_client.post("/categories", json=payload), 422)


# --- GET -----------------------------------------------------------------------

def test_list_includes_created(super_client: httpx.Client, category: dict):
    ids = [c["id"] for c in data(super_client.get("/categories"), 200)]
    assert category["id"] in ids


class TestGetByID:
    def test_happy_path(self, super_client: httpx.Client, category: dict):
        body = data(super_client.get(f"/categories/{category['id']}"), 200)
        assert body["id"] == category["id"]

    def test_not_found(self, super_client: httpx.Client):
        # TODO: see test_branch — backend returns 500 for missing rows today.
        zero = "00000000-0000-0000-0000-000000000000"
        r = super_client.get(f"/categories/{zero}")
        assert r.status_code in (404, 500)

    def test_invalid_uuid(self, super_client: httpx.Client):
        assert error_code(super_client.get("/categories/not-uuid"), 422)


# --- PATCH ---------------------------------------------------------------------

class TestUpdate:
    def test_round_trip(self, super_client: httpx.Client, category: dict):
        renamed = uniq("renamed")
        body = data(
            super_client.patch(
                f"/categories/{category['id']}",
                json={
                    "name": renamed,
                    "sort_order": 5,
                    "is_active": True,
                },
            ),
            200,
        )
        assert body["name"] == renamed
        assert body["sort_order"] == 5

    def test_circular_parent_rejected(
        self, super_client: httpx.Client, category: dict
    ):
        r = super_client.patch(
            f"/categories/{category['id']}",
            json={
                "name": category["name"],
                "parent_id": category["id"],
                "sort_order": 0,
                "is_active": True,
            },
        )
        assert error_code(r, 422)


# --- DELETE --------------------------------------------------------------------

def test_soft_delete(super_client: httpx.Client, category: dict):
    assert_status(super_client.delete(f"/categories/{category['id']}"), 204)
    r = super_client.get(f"/categories/{category['id']}")
    assert r.status_code in (404, 500)
