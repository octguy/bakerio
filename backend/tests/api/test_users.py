"""Tests for /users admin endpoints."""
from __future__ import annotations

import httpx
import pytest

from helpers import assert_status, data, error_code, uniq


pytestmark = pytest.mark.users


# --- POST /users (create staff) ------------------------------------------------

class TestCreateUser:
    def test_super_admin_can_create_staff(self, super_client: httpx.Client):
        payload = {
            "email": f"{uniq('staff')}@example.com",
            "full_name": "Staff",
            "password": "password123",
            "role": "marketing_manager",
        }
        body = data(super_client.post("/users", json=payload), 201)
        assert body["email"] == payload["email"]
        assert body["role"] == "marketing_manager"

    def test_store_level_role_requires_branch_id(self, super_client: httpx.Client):
        # store_manager is a store-level role — should require branch_id.
        payload = {
            "email": f"{uniq('staff')}@example.com",
            "full_name": "Store Without Branch",
            "password": "password123",
            "role": "store_manager",
        }
        r = super_client.post("/users", json=payload)
        assert r.status_code in (400, 422)

    def test_store_level_role_with_branch_succeeds(
        self, super_client: httpx.Client, branch: dict
    ):
        payload = {
            "email": f"{uniq('staff')}@example.com",
            "full_name": "Store With Branch",
            "password": "password123",
            "role": "store_manager",
            "branch_id": branch["id"],
        }
        body = data(super_client.post("/users", json=payload), 201)
        assert body["branch_id"] == branch["id"]

    def test_anon_cannot_create_user(self, anon_client: httpx.Client):
        r = anon_client.post(
            "/users",
            json={
                "email": "x@y.io",
                "full_name": "X",
                "password": "password123",
                "role": "marketing_manager",
            },
        )
        assert r.status_code == 401

    @pytest.mark.parametrize(
        "payload",
        [
            pytest.param({}, id="empty"),
            pytest.param(
                {
                    "email": "ok@x.io",
                    "full_name": "X",
                    "password": "password123",
                    # missing role
                },
                id="missing-role",
            ),
            pytest.param(
                {
                    "email": "not-an-email",
                    "full_name": "X",
                    "password": "password123",
                    "role": "marketing_manager",
                },
                id="invalid-email",
            ),
            pytest.param(
                {
                    "email": "ok@x.io",
                    "full_name": "X",
                    "password": "short",
                    "role": "marketing_manager",
                },
                id="password-too-short",
            ),
        ],
    )
    def test_validation_returns_422(self, super_client: httpx.Client, payload):
        assert error_code(super_client.post("/users", json=payload), 422)


# --- GET /users/:id/profile ----------------------------------------------------

class TestGetUserProfile:
    @pytest.fixture
    def created_user(self, super_client: httpx.Client) -> dict:
        return data(
            super_client.post(
                "/users",
                json={
                    "email": f"{uniq('staff')}@example.com",
                    "full_name": "Profile Subject",
                    "password": "password123",
                    "role": "marketing_manager",
                },
            ),
            201,
        )

    def test_super_admin_can_read(self, super_client, created_user):
        body = data(super_client.get(f"/users/{created_user['id']}/profile"), 200)
        assert body["full_name"] == "Profile Subject"

    def test_not_found_returns_404(self, super_client):
        zero = "00000000-0000-0000-0000-000000000000"
        assert error_code(super_client.get(f"/users/{zero}/profile"), 404)

    def test_invalid_uuid_returns_422(self, super_client):
        assert error_code(super_client.get("/users/not-a-uuid/profile"), 422)

    def test_anon_blocked(self, anon_client, created_user):
        r = anon_client.get(f"/users/{created_user['id']}/profile")
        assert r.status_code == 401


# --- PATCH /users/:id/profile --------------------------------------------------

class TestUpdateUserProfile:
    @pytest.fixture
    def created_user(self, super_client: httpx.Client) -> dict:
        return data(
            super_client.post(
                "/users",
                json={
                    "email": f"{uniq('staff')}@example.com",
                    "full_name": "Original Name",
                    "password": "password123",
                    "role": "marketing_manager",
                },
            ),
            201,
        )

    def test_update_full_name(self, super_client, created_user):
        body = data(
            super_client.patch(
                f"/users/{created_user['id']}/profile",
                json={"full_name": "Updated Name"},
            ),
            200,
        )
        assert body["full_name"] == "Updated Name"

    def test_invalid_uuid_returns_422(self, super_client):
        r = super_client.patch(
            "/users/not-a-uuid/profile",
            json={"full_name": "x"},
        )
        assert error_code(r, 422)


# --- PATCH /users/:id/password -------------------------------------------------

class TestSetUserPassword:
    @pytest.fixture
    def created_user(self, super_client: httpx.Client) -> dict:
        email = f"{uniq('staff')}@example.com"
        body = data(
            super_client.post(
                "/users",
                json={
                    "email": email,
                    "full_name": "Pwd Subject",
                    "password": "password123",
                    "role": "marketing_manager",
                },
            ),
            201,
        )
        body["_email"] = email
        return body

    def test_admin_sets_password(
        self, anon_client: httpx.Client, super_client: httpx.Client, created_user
    ):
        new_pw = "freshpassword1"
        assert_status(
            super_client.patch(
                f"/users/{created_user['id']}/password",
                json={"password": new_pw},
            ),
            200,
        )
        # The new password works for login.
        from helpers import login as _login
        token = _login(anon_client, created_user["_email"], new_pw)
        assert token

    @pytest.mark.parametrize(
        "payload",
        [
            pytest.param({}, id="empty"),
            pytest.param({"password": "short"}, id="too-short"),
        ],
    )
    def test_validation_returns_422(
        self, super_client: httpx.Client, created_user, payload
    ):
        r = super_client.patch(
            f"/users/{created_user['id']}/password", json=payload
        )
        assert error_code(r, 422)
