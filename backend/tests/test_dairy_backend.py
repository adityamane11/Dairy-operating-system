"""
Backend tests for Siddhnath Doodh Sankalan Kendra dairy app.
Covers: auth, farmers, milk-entries, advances, payment-summary, settings,
rate-preview, scan-image (Gemini OCR), and cascade delete.
"""
import base64
import io
import os
import random
import string
import uuid

import pytest
import requests
from PIL import Image, ImageDraw, ImageFont

BASE_URL = os.environ.get("EXPO_BACKEND_URL", "http://localhost:8001").rstrip("/")
API = f"{BASE_URL}/api"


# ─── shared state ─────────────────────────────────────────────────────────
state = {"farmer_id": None, "farmer_code": None, "entry_id": None, "advance_id": None}


def _no_underscore_id(obj):
    """Recursively assert no '_id' key in response."""
    if isinstance(obj, dict):
        assert "_id" not in obj, f"Found _id in response: {obj}"
        for v in obj.values():
            _no_underscore_id(v)
    elif isinstance(obj, list):
        for v in obj:
            _no_underscore_id(v)


# ─── Auth ──────────────────────────────────────────────────────────────────
class TestAuth:
    def test_admin_login_success(self):
        r = requests.post(f"{API}/auth/admin-login", json={"password": "admin123"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["ok"] is True
        assert data["role"] == "admin"
        _no_underscore_id(data)

    def test_admin_login_wrong_password(self):
        r = requests.post(f"{API}/auth/admin-login", json={"password": "wrong"})
        assert r.status_code == 401


# ─── Farmers ───────────────────────────────────────────────────────────────
class TestFarmers:
    def test_create_farmer_auto_code(self):
        suffix = "".join(random.choices(string.ascii_lowercase, k=4))
        payload = {"name": f"TEST_Ramesh_{suffix}", "phone": "9999911111", "village": "Pune"}
        r = requests.post(f"{API}/farmers", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        _no_underscore_id(data)
        assert data["name"] == payload["name"]
        assert data["phone"] == "9999911111"
        assert data["farmer_code"].startswith("F") and len(data["farmer_code"]) == 4
        state["farmer_id"] = data["id"]
        state["farmer_code"] = data["farmer_code"]

        # verify persistence
        g = requests.get(f"{API}/farmers/{data['id']}")
        assert g.status_code == 200
        assert g.json()["id"] == data["id"]

    def test_list_farmers(self):
        r = requests.get(f"{API}/farmers")
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        _no_underscore_id(rows)
        assert any(f["id"] == state["farmer_id"] for f in rows)

    def test_farmer_login_success(self):
        r = requests.post(
            f"{API}/auth/farmer-login",
            json={"farmer_code": state["farmer_code"], "phone": "9999911111"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["role"] == "farmer"
        assert data["farmer"]["id"] == state["farmer_id"]
        _no_underscore_id(data)

    def test_farmer_login_wrong_phone(self):
        r = requests.post(
            f"{API}/auth/farmer-login",
            json={"farmer_code": state["farmer_code"], "phone": "0000000000"},
        )
        assert r.status_code == 401


# ─── Rate preview & milk entries ──────────────────────────────────────────
class TestRateAndMilk:
    def test_rate_preview_formula(self):
        # fat=3.8, snf=8.7, liters=10 → base 35 + (0.3/0.1)*0.4 + (0.2/0.1)*0.3
        # = 35 + 1.2 + 0.6 = 36.8;  amount=368.0
        r = requests.post(
            f"{API}/rate-preview",
            json={"fat": 3.8, "snf": 8.7, "liters": 10},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["rate"] == pytest.approx(36.8, abs=0.01)
        assert data["amount"] == pytest.approx(368.0, abs=0.01)

    def test_create_milk_entry(self):
        payload = {
            "farmer_id": state["farmer_id"],
            "date": "2026-01-10",
            "shift": "morning",
            "liters": 10,
            "fat": 3.8,
            "snf": 8.7,
        }
        r = requests.post(f"{API}/milk-entries", json=payload)
        assert r.status_code == 200, r.text
        data = r.json()
        _no_underscore_id(data)
        assert data["rate"] == pytest.approx(36.8, abs=0.01)
        assert data["amount"] == pytest.approx(368.0, abs=0.01)
        assert data["farmer_code"] == state["farmer_code"]
        state["entry_id"] = data["id"]

    def test_list_milk_entries_filters(self):
        r = requests.get(
            f"{API}/milk-entries",
            params={
                "farmer_id": state["farmer_id"],
                "date_from": "2026-01-01",
                "date_to": "2026-01-31",
            },
        )
        assert r.status_code == 200
        rows = r.json()
        _no_underscore_id(rows)
        assert any(e["id"] == state["entry_id"] for e in rows)

    def test_today_summary(self):
        # create an entry for today to ensure summary populated
        today = __import__("datetime").datetime.utcnow().strftime("%Y-%m-%d")
        payload = {
            "farmer_id": state["farmer_id"],
            "date": today,
            "shift": "evening",
            "liters": 5,
            "fat": 4.0,
            "snf": 8.5,
        }
        c = requests.post(f"{API}/milk-entries", json=payload)
        assert c.status_code == 200
        r = requests.get(f"{API}/today-summary")
        assert r.status_code == 200
        data = r.json()
        assert data["date"] == today
        assert data["entries"] >= 1
        assert data["liters"] >= 5
        assert "avg_fat" in data and "avg_snf" in data


# ─── Advances ──────────────────────────────────────────────────────────────
class TestAdvances:
    def test_create_advance(self):
        r = requests.post(
            f"{API}/advances",
            json={
                "farmer_id": state["farmer_id"],
                "amount": 200,
                "note": "TEST_advance",
                "date": "2026-01-10",
            },
        )
        assert r.status_code == 200, r.text
        data = r.json()
        _no_underscore_id(data)
        assert data["settled"] is False
        assert data["amount"] == 200
        state["advance_id"] = data["id"]

    def test_list_unsettled_advances(self):
        r = requests.get(f"{API}/advances", params={"unsettled": "true"})
        assert r.status_code == 200
        rows = r.json()
        assert all(a["settled"] is False for a in rows)
        assert any(a["id"] == state["advance_id"] for a in rows)


# ─── Payment summary ──────────────────────────────────────────────────────
class TestPaymentSummary:
    def test_payment_summary(self):
        r = requests.get(
            f"{API}/payment-summary/{state['farmer_id']}",
            params={"date_from": "2026-01-01", "date_to": "2026-01-31"},
        )
        assert r.status_code == 200, r.text
        data = r.json()
        _no_underscore_id(data)
        # gross >= 368 (from earlier entry); advance = 200; net = gross - 200
        assert data["gross_amount"] >= 368.0
        assert data["total_advance"] == pytest.approx(200.0, abs=0.01)
        assert data["net_payable"] == pytest.approx(
            data["gross_amount"] - data["total_advance"], abs=0.01
        )
        assert data["avg_fat"] > 0
        assert data["avg_snf"] > 0

    def test_settle_advances(self):
        r = requests.post(f"{API}/payment-summary/{state['farmer_id']}/settle-advances")
        assert r.status_code == 200
        assert r.json()["ok"] is True

        # verify advances are settled now
        ck = requests.get(
            f"{API}/advances",
            params={"farmer_id": state["farmer_id"], "unsettled": "true"},
        )
        assert ck.status_code == 200
        assert all(a["settled"] for a in ck.json()) or len(ck.json()) == 0


# ─── Settings ──────────────────────────────────────────────────────────────
class TestSettings:
    def test_get_settings(self):
        r = requests.get(f"{API}/settings")
        assert r.status_code == 200
        data = r.json()
        _no_underscore_id(data)
        assert data["base_rate"] == 35.0
        assert data["base_fat"] == 3.5
        assert data["base_snf"] == 8.5

    def test_update_and_revert_settings(self):
        # update
        r = requests.put(f"{API}/settings", json={"dairy_phone": "9876543210"})
        assert r.status_code == 200
        assert r.json()["dairy_phone"] == "9876543210"
        # persist
        g = requests.get(f"{API}/settings")
        assert g.json()["dairy_phone"] == "9876543210"
        # revert
        requests.put(f"{API}/settings", json={"dairy_phone": ""})


# ─── AI Scan ──────────────────────────────────────────────────────────────
def _make_lcd_image_b64() -> str:
    """Build a real JPEG with visible LCD-like numeric text."""
    img = Image.new("RGB", (480, 240), (10, 10, 10))
    d = ImageDraw.Draw(img)
    # add some texture/edges so it's not a uniform image
    for i in range(0, 480, 20):
        d.line([(i, 0), (i, 240)], fill=(20, 20, 20), width=1)
    try:
        font = ImageFont.truetype(
            "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf", 36
        )
    except Exception:
        font = ImageFont.load_default()
    d.text((20, 20), "FAT  3.8", fill=(0, 255, 80), font=font)
    d.text((20, 90), "SNF  8.6", fill=(0, 255, 80), font=font)
    d.text((20, 160), "CLR  27.5", fill=(0, 255, 80), font=font)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode("ascii")


class TestScanImage:
    def test_scan_image_returns_valid_json(self):
        b64 = _make_lcd_image_b64()
        r = requests.post(f"{API}/scan-image", json={"image_base64": b64}, timeout=90)
        # Must not 500; 200 with structured response or 502 if upstream fails
        assert r.status_code == 200, f"status={r.status_code} body={r.text[:500]}"
        data = r.json()
        for k in ("fat", "snf", "density", "raw"):
            assert k in data, f"missing {k} in {data}"
        # fields must be float or None
        for k in ("fat", "snf", "density"):
            assert data[k] is None or isinstance(data[k], (int, float))

    def test_scan_image_invalid_base64(self):
        r = requests.post(
            f"{API}/scan-image", json={"image_base64": "not_base64!!!"}
        )
        # Either 400 (bad base64) or 502 (upstream rejects). Must NOT 500.
        assert r.status_code in (400, 502), r.status_code


# ─── Cascade delete ───────────────────────────────────────────────────────
class TestCascadeDelete:
    def test_cascade_delete_farmer(self):
        # create farmer
        c = requests.post(
            f"{API}/farmers",
            json={"name": "TEST_Cascade", "phone": "9000000001", "village": "X"},
        )
        assert c.status_code == 200
        fid = c.json()["id"]

        # create entry + advance
        e = requests.post(
            f"{API}/milk-entries",
            json={
                "farmer_id": fid,
                "date": "2026-01-10",
                "shift": "morning",
                "liters": 1,
                "fat": 3.5,
                "snf": 8.5,
            },
        )
        assert e.status_code == 200
        a = requests.post(
            f"{API}/advances",
            json={"farmer_id": fid, "amount": 50, "date": "2026-01-10"},
        )
        assert a.status_code == 200

        # delete farmer
        d = requests.delete(f"{API}/farmers/{fid}")
        assert d.status_code == 200

        # verify gone
        g = requests.get(f"{API}/farmers/{fid}")
        assert g.status_code == 404

        # verify entries empty
        le = requests.get(f"{API}/milk-entries", params={"farmer_id": fid})
        assert le.status_code == 200
        assert le.json() == []

        # verify advances empty
        la = requests.get(f"{API}/advances", params={"farmer_id": fid})
        assert la.status_code == 200
        assert la.json() == []


# ─── Final cleanup ────────────────────────────────────────────────────────
@pytest.fixture(scope="session", autouse=True)
def _cleanup():
    yield
    fid = state.get("farmer_id")
    if fid:
        try:
            requests.delete(f"{API}/farmers/{fid}", timeout=10)
        except Exception:
            pass
