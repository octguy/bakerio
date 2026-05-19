"""Tests for /auth/* endpoints."""
from __future__ import annotations

import httpx
import pytest

from helpers import assert_status, data, error_code, login, uniq


pytestmark = pytest.mark.auth


# --- /auth/register ------------------------------------------------------------

class TestRegister:
    def test_creates_new_user(self, anon_client: httpx.Client):
        payload = {
            "email": f"{uniq('user')}@example.com",
            "full_name": "Test User",
            "password": "password123",
        }
        body = data(anon_client.post("/auth/register", json=payload), 201)
        assert body["email"] == payload["email"]
        assert body["full_name"] == payload["full_name"]
        assert "id" in body

    def test_duplicate_email_returns_409(self, anon_client: httpx.Client):
        payload = {
            "email": f"{uniq('user')}@example.com",
            "full_name": "Dup",
            "password": "password123",
        }
        assert_status(anon_client.post("/auth/register", json=payload), 201)
        r2 = anon_client.post("/auth/register", json=payload)
        assert error_code(r2, 409)

    @pytest.mark.parametrize(
        "payload",
        [
            pytest.param({}, id="empty-body"),
            pytest.param(
                {"email": "not-an-email", "full_name": "x", "password": "secret123"},
                id="invalid-email",
            ),
            pytest.param(
                {"email": "ok@x.io", "full_name": "x", "password": "short"},
                id="password-too-short",
            ),
            pytest.param(
                {"email": "ok@x.io", "password": "secret123"},
                id="missing-full-name",
            ),
        ],
    )
    def test_validation_returns_422(self, anon_client: httpx.Client, payload):
        r = anon_client.post("/auth/register", json=payload)
        assert error_code(r, 422)


# --- /auth/login ---------------------------------------------------------------

class TestLogin:
    def test_seeded_super_admin_can_log_in(self, anon_client: httpx.Client):
        token = login(anon_client, "superadmin@bakerio.com", "123456")
        assert token

    def test_wrong_password_returns_401(self, anon_client: httpx.Client):
        r = anon_client.post(
            "/auth/login",
            json={"email": "superadmin@bakerio.com", "password": "wrong-password"},
        )
        assert error_code(r, 401)

    def test_unknown_email_returns_401(self, anon_client: httpx.Client):
        r = anon_client.post(
            "/auth/login",
            json={"email": "nobody@example.com", "password": "password123"},
        )
        assert error_code(r, 401)

    @pytest.mark.parametrize(
        "payload",
        [
            pytest.param({}, id="empty"),
            pytest.param({"email": "x", "password": "y"}, id="invalid-email"),
            pytest.param({"email": "x@y.io"}, id="missing-password"),
        ],
    )
    def test_validation_returns_422(self, anon_client: httpx.Client, payload):
        assert error_code(anon_client.post("/auth/login", json=payload), 422)


# --- /auth/verify --------------------------------------------------------------

class TestVerify:
    def test_unknown_user_or_otp_rejected(self, anon_client: httpx.Client):
        r = anon_client.post(
            "/auth/verify",
            json={"user_id": "00000000-0000-0000-0000-000000000000", "otp": "000000"},
        )
        # Either 404 (user not found) or 422/401 depending on impl — accept 4xx
        assert 400 <= r.status_code < 500

    @pytest.mark.parametrize(
        "payload",
        [
            pytest.param({}, id="empty"),
            pytest.param({"user_id": "not-uuid", "otp": "000000"}, id="bad-uuid"),
            pytest.param(
                {"user_id": "00000000-0000-0000-0000-000000000000", "otp": "abc"},
                id="non-numeric-otp",
            ),
            pytest.param(
                {"user_id": "00000000-0000-0000-0000-000000000000", "otp": "12345"},
                id="otp-too-short",
            ),
        ],
    )
    def test_validation_returns_422(self, anon_client: httpx.Client, payload):
        assert error_code(anon_client.post("/auth/verify", json=payload), 422)


# --- /auth/logout (protected) --------------------------------------------------

class TestLogout:
    def test_requires_auth(self, anon_client: httpx.Client):
        r = anon_client.post("/auth/logout")
        assert r.status_code == 401

    def test_blacklists_token(self, anon_client: httpx.Client, staff_user: dict):
        """Logout invalidates the bearer token.

        Uses an admin-provisioned staff_user so we don't touch the
        session-scoped super_client token (which would cascade into every
        other test).
        """
        token = login(anon_client, staff_user["_email"], staff_user["_password"])
        with httpx.Client(
            base_url=str(anon_client.base_url),
            timeout=anon_client.timeout,
            headers={"Authorization": f"Bearer {token}"},
        ) as c:
            assert_status(c.post("/auth/logout"), 204)
            # Token is now blacklisted: any protected route should 401.
            r = c.get("/branch")
            assert r.status_code == 401


# --- /auth/password (protected) ------------------------------------------------

class TestChangePassword:
    def test_requires_auth(self, anon_client: httpx.Client):
        r = anon_client.patch(
            "/auth/password",
            json={"current_password": "x" * 8, "new_password": "y" * 8},
        )
        assert r.status_code == 401

    def test_round_trip(
        self, anon_client: httpx.Client, staff_user: dict
    ):
        original = staff_user["_password"]
        new_pw = "rotatedpw1"
        token = login(anon_client, staff_user["_email"], original)

        with httpx.Client(
            base_url=str(anon_client.base_url),
            timeout=anon_client.timeout,
            headers={"Authorization": f"Bearer {token}"},
        ) as c:
            assert_status(
                c.patch(
                    "/auth/password",
                    json={"current_password": original, "new_password": new_pw},
                ),
                204,
            )

        # Old password no longer works; new one does.
        assert error_code(
            anon_client.post(
                "/auth/login",
                json={"email": staff_user["_email"], "password": original},
            ),
            401,
        )
        assert login(anon_client, staff_user["_email"], new_pw)

    def test_wrong_current_password_rejected(
        self, anon_client: httpx.Client, staff_user: dict
    ):
        token = login(anon_client, staff_user["_email"], staff_user["_password"])
        with httpx.Client(
            base_url=str(anon_client.base_url),
            timeout=anon_client.timeout,
            headers={"Authorization": f"Bearer {token}"},
        ) as c:
            r = c.patch(
                "/auth/password",
                json={"current_password": "wrongpw1", "new_password": "newsecret1"},
            )
            assert r.status_code in (401, 422)
