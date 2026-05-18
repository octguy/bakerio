"""Tests for /profile self-service endpoints."""
from __future__ import annotations

import httpx
import pytest

from helpers import assert_status, data, uniq


pytestmark = pytest.mark.profile


def test_anon_blocked(anon_client: httpx.Client):
    assert anon_client.get("/profile").status_code == 401


def test_super_admin_reads_own_profile(super_client: httpx.Client):
    body = data(super_client.get("/profile"), 200)
    assert "id" in body
    assert "full_name" in body


def test_update_display_name_round_trip(super_client: httpx.Client):
    new_name = uniq("updated")
    assert_status(
        super_client.patch("/profile", json={"display_name": new_name}),
        200,
    )
    body = data(super_client.get("/profile"), 200)
    # The handler may store display_name into full_name or expose it separately;
    # accept either, but assert the round-trip persisted *something*.
    assert body.get("full_name") == new_name or body.get("display_name") == new_name


def test_update_bio_and_avatar(super_client: httpx.Client):
    payload = {"bio": "Test bio", "avatar_url": "https://example.com/avatar.png"}
    assert_status(super_client.patch("/profile", json=payload), 200)
    body = data(super_client.get("/profile"), 200)
    assert body.get("bio") == "Test bio"


def test_anon_cannot_update(anon_client: httpx.Client):
    r = anon_client.patch("/profile", json={"display_name": "x"})
    assert r.status_code == 401
