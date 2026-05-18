"""Tests for /branch endpoints."""
from __future__ import annotations

import httpx
import pytest

from helpers import assert_status, branch_payload, data, error_code


pytestmark = pytest.mark.branch


# --- Auth ----------------------------------------------------------------------

@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/branch"),
        ("GET", "/branch/00000000-0000-0000-0000-000000000000"),
        ("POST", "/branch"),
        ("PATCH", "/branch/00000000-0000-0000-0000-000000000000"),
        ("PATCH", "/branch/00000000-0000-0000-0000-000000000000/status"),
        ("DELETE", "/branch/00000000-0000-0000-0000-000000000000"),
    ],
)
def test_anon_blocked(anon_client: httpx.Client, method, path):
    r = anon_client.request(method, path, json={})
    assert r.status_code == 401


# --- POST /branch --------------------------------------------------------------

class TestCreate:
    def test_happy_path(self, super_client: httpx.Client):
        payload = branch_payload(name="HQ Test", region="north")
        body = data(super_client.post("/branch", json=payload), 201)
        assert body["name"] == "HQ Test"
        assert body["region"] == "north"
        assert body["status"] == "active"

    @pytest.mark.parametrize(
        "payload,_id",
        [
            pytest.param({}, "empty", id="empty"),
            pytest.param(
                branch_payload(name=""), "name", id="empty-name"
            ),
            pytest.param(
                branch_payload(address=""), "address", id="empty-address"
            ),
            pytest.param(
                branch_payload(region="east"), "region", id="invalid-region"
            ),
            pytest.param(
                branch_payload(lat=200), "lat", id="lat-out-of-range"
            ),
            pytest.param(
                branch_payload(lng=-200), "lng", id="lng-out-of-range"
            ),
            pytest.param(
                branch_payload(name="x" * 101), "name", id="name-too-long"
            ),
        ],
    )
    def test_validation_returns_422(self, super_client, payload, _id):
        assert error_code(super_client.post("/branch", json=payload), 422)


# --- GET /branch ---------------------------------------------------------------

def test_list_includes_created_branch(super_client: httpx.Client, branch: dict):
    body = data(super_client.get("/branch"), 200)
    ids = [b["id"] for b in body]
    assert branch["id"] in ids


# --- GET /branch/:id -----------------------------------------------------------

class TestGetByID:
    def test_happy_path(self, super_client: httpx.Client, branch: dict):
        body = data(super_client.get(f"/branch/{branch['id']}"), 200)
        assert body["id"] == branch["id"]

    def test_not_found_returns_404(self, super_client: httpx.Client):
        zero = "00000000-0000-0000-0000-000000000000"
        assert error_code(super_client.get(f"/branch/{zero}"), 404)

    def test_invalid_uuid_returns_422(self, super_client: httpx.Client):
        assert error_code(super_client.get("/branch/not-a-uuid"), 422)


# --- PATCH /branch/:id ---------------------------------------------------------

class TestUpdate:
    def test_partial_update(self, super_client: httpx.Client, branch: dict):
        body = data(
            super_client.patch(
                f"/branch/{branch['id']}",
                json={"name": "Renamed"},
            ),
            200,
        )
        assert body["name"] == "Renamed"
        # Other fields should not have been wiped.
        assert body["address"] == branch["address"]

    def test_invalid_uuid_returns_422(self, super_client: httpx.Client):
        r = super_client.patch("/branch/not-a-uuid", json={"name": "x"})
        assert error_code(r, 422)

    def test_invalid_region_rejected(
        self, super_client: httpx.Client, branch: dict
    ):
        r = super_client.patch(
            f"/branch/{branch['id']}", json={"region": "east"}
        )
        assert error_code(r, 422)


# --- PATCH /branch/:id/status --------------------------------------------------

class TestUpdateStatus:
    def test_round_trip(self, super_client: httpx.Client, branch: dict):
        assert_status(
            super_client.patch(
                f"/branch/{branch['id']}/status", json={"status": "inactive"}
            ),
            200,
        )
        body = data(super_client.get(f"/branch/{branch['id']}"), 200)
        assert body["status"] == "inactive"

    @pytest.mark.parametrize(
        "payload",
        [
            pytest.param({}, id="empty"),
            pytest.param({"status": "weird"}, id="invalid-value"),
        ],
    )
    def test_validation(self, super_client, branch, payload):
        r = super_client.patch(
            f"/branch/{branch['id']}/status", json=payload
        )
        assert error_code(r, 422)


# --- DELETE /branch/:id --------------------------------------------------------

class TestDelete:
    def test_soft_delete_then_not_found(
        self, super_client: httpx.Client, branch: dict
    ):
        assert_status(super_client.delete(f"/branch/{branch['id']}"), 204)
        assert error_code(super_client.get(f"/branch/{branch['id']}"), 404)
        ids = [b["id"] for b in data(super_client.get("/branch"), 200)]
        assert branch["id"] not in ids

    def test_invalid_uuid_returns_422(self, super_client: httpx.Client):
        r = super_client.delete("/branch/not-a-uuid")
        assert error_code(r, 422)
