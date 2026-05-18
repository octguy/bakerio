"""Tests for /products endpoints (incl. prices and images)."""
from __future__ import annotations

import io

import httpx
import pytest

from helpers import assert_status, data, error_code, product_payload, uniq


pytestmark = pytest.mark.products


@pytest.mark.parametrize(
    "method,path",
    [
        ("GET", "/products"),
        ("GET", "/products/00000000-0000-0000-0000-000000000000"),
        ("POST", "/products"),
        ("PATCH", "/products/00000000-0000-0000-0000-000000000000"),
        ("DELETE", "/products/00000000-0000-0000-0000-000000000000"),
        ("POST", "/products/00000000-0000-0000-0000-000000000000/prices"),
        ("GET", "/products/00000000-0000-0000-0000-000000000000/prices"),
    ],
)
def test_anon_blocked(anon_client: httpx.Client, method, path):
    r = anon_client.request(method, path, json={})
    assert r.status_code == 401


# --- POST /products ------------------------------------------------------------

class TestCreate:
    def test_happy_path(self, super_client: httpx.Client, category: dict):
        payload = product_payload(category_id=category["id"], name="Sourdough")
        body = data(super_client.post("/products", json=payload), 201)
        assert body["name"] == "Sourdough"
        assert body["sku"] == payload["sku"]
        assert body["is_active"] is True

    def test_duplicate_sku_rejected(
        self, super_client: httpx.Client, category: dict
    ):
        payload = product_payload(category_id=category["id"])
        assert_status(super_client.post("/products", json=payload), 201)
        r = super_client.post("/products", json=payload)
        assert r.status_code in (409, 422, 500)

    @pytest.mark.parametrize(
        "payload",
        [
            pytest.param({}, id="empty"),
            pytest.param(product_payload(sku=""), id="empty-sku"),
            pytest.param(product_payload(name=""), id="empty-name"),
            pytest.param(product_payload(unit=""), id="empty-unit"),
            pytest.param(product_payload(price=None), id="missing-price"),
        ],
    )
    def test_validation_returns_422(self, super_client, payload):
        assert error_code(super_client.post("/products", json=payload), 422)


# --- GET /products -------------------------------------------------------------

def test_list_includes_created(super_client: httpx.Client, product: dict):
    ids = [p["id"] for p in data(super_client.get("/products"), 200)]
    assert product["id"] in ids


class TestGetByID:
    def test_happy_path(self, super_client: httpx.Client, product: dict):
        body = data(super_client.get(f"/products/{product['id']}"), 200)
        assert body["id"] == product["id"]

    def test_not_found(self, super_client: httpx.Client):
        zero = "00000000-0000-0000-0000-000000000000"
        assert error_code(super_client.get(f"/products/{zero}"), 404)

    def test_invalid_uuid(self, super_client: httpx.Client):
        assert error_code(super_client.get("/products/not-uuid"), 422)


# --- PATCH /products/:id -------------------------------------------------------

class TestUpdate:
    def test_partial_update(self, super_client: httpx.Client, product: dict):
        new_name = uniq("renamed")
        body = data(
            super_client.patch(
                f"/products/{product['id']}", json={"name": new_name}
            ),
            200,
        )
        assert body["name"] == new_name

    def test_not_found(self, super_client: httpx.Client):
        zero = "00000000-0000-0000-0000-000000000000"
        r = super_client.patch(f"/products/{zero}", json={"name": "x"})
        assert error_code(r, 404)


# --- DELETE /products/:id ------------------------------------------------------

def test_soft_delete(super_client: httpx.Client, product: dict):
    assert_status(super_client.delete(f"/products/{product['id']}"), 204)
    assert error_code(super_client.get(f"/products/{product['id']}"), 404)


# --- POST /products/:id/prices -------------------------------------------------

class TestSetPrice:
    def test_set_branch_price(
        self, super_client: httpx.Client, product: dict, branch: dict
    ):
        body = data(
            super_client.post(
                f"/products/{product['id']}/prices",
                json={"branch_id": branch["id"], "price": "12.50"},
            ),
            200,
        )
        assert body["branch_id"] == branch["id"]
        assert str(body["price"]) in ("12.50", "12.5")

    def test_nil_branch_id_rejected(
        self, super_client: httpx.Client, product: dict
    ):
        r = super_client.post(
            f"/products/{product['id']}/prices",
            json={
                "branch_id": "00000000-0000-0000-0000-000000000000",
                "price": "10",
            },
        )
        # Service rejects uuid.Nil with Validation (422).
        assert error_code(r, 422)

    @pytest.mark.parametrize(
        "payload",
        [
            pytest.param({}, id="empty"),
            pytest.param({"price": "10"}, id="missing-branch"),
            pytest.param(
                {"branch_id": "00000000-0000-0000-0000-000000000000"},
                id="missing-price",
            ),
        ],
    )
    def test_validation(self, super_client, product, payload):
        r = super_client.post(
            f"/products/{product['id']}/prices", json=payload
        )
        assert error_code(r, 422)


# --- GET /products/:id/prices --------------------------------------------------

def test_price_history(super_client: httpx.Client, product: dict, branch: dict):
    assert_status(
        super_client.post(
            f"/products/{product['id']}/prices",
            json={"branch_id": branch["id"], "price": "9.99"},
        ),
        200,
    )
    body = data(super_client.get(f"/products/{product['id']}/prices"), 200)
    assert isinstance(body, list)


# --- POST /products/:id/images -------------------------------------------------

class TestImageUpload:
    @pytest.fixture
    def png_bytes(self) -> bytes:
        # 1x1 transparent PNG.
        return bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
            "0000000d49444154789c63f8cf00000000010100051a1d7d0000000049454e44ae"
            "426082"
        )

    def test_upload_image(
        self, super_client: httpx.Client, product: dict, png_bytes: bytes
    ):
        files = {"file": ("test.png", io.BytesIO(png_bytes), "image/png")}
        body = data(
            super_client.post(
                f"/products/{product['id']}/images",
                files=files,
                data={"is_primary": "false"},
            ),
            201,
        )
        # Response shape: dto.ProductImageResponse
        assert "id" in body
        assert "url" in body

    def test_rejects_disallowed_content_type(
        self, super_client: httpx.Client, product: dict
    ):
        files = {"file": ("test.txt", io.BytesIO(b"text"), "text/plain")}
        r = super_client.post(
            f"/products/{product['id']}/images", files=files
        )
        assert error_code(r, 422)

    def test_missing_file_returns_422(
        self, super_client: httpx.Client, product: dict
    ):
        r = super_client.post(f"/products/{product['id']}/images")
        assert error_code(r, 422)


class TestImageDeleteAndPrimary:
    @pytest.fixture
    def uploaded_image(
        self, super_client: httpx.Client, product: dict
    ) -> dict:
        png = bytes.fromhex(
            "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
            "0000000d49444154789c63f8cf00000000010100051a1d7d0000000049454e44ae"
            "426082"
        )
        files = {"file": ("test.png", io.BytesIO(png), "image/png")}
        body = data(
            super_client.post(
                f"/products/{product['id']}/images", files=files
            ),
            201,
        )
        body["_product_id"] = product["id"]
        return body

    def test_set_primary(self, super_client: httpx.Client, uploaded_image: dict):
        r = super_client.patch(
            f"/products/{uploaded_image['_product_id']}/images/"
            f"{uploaded_image['id']}/primary"
        )
        assert r.status_code in (200, 204)

    def test_delete(self, super_client: httpx.Client, uploaded_image: dict):
        r = super_client.delete(
            f"/products/{uploaded_image['_product_id']}/images/"
            f"{uploaded_image['id']}"
        )
        assert r.status_code in (200, 204)

    def test_invalid_image_id(
        self, super_client: httpx.Client, product: dict
    ):
        r = super_client.delete(
            f"/products/{product['id']}/images/not-uuid"
        )
        assert error_code(r, 422)
