# Statement feature tests: draft, create/versioning, advance deductions, milk entry sync, list/get, cascade delete
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("EXPO_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"
D_FROM, D_TO = "2020-03-01", "2020-03-10"


def _mk_farmer(s, name):
    code = "TS" + uuid.uuid4().hex[:5].upper()
    r = s.post(f"{API}/farmers", json={"name": name, "phone": "9" + uuid.uuid4().int.__str__()[:9], "farmer_code": code})
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def s():
    x = requests.Session()
    x.headers.update({"Content-Type": "application/json"})
    return x


@pytest.fixture(scope="module")
def ctx(s):
    f = _mk_farmer(s, "TEST_StmtFarmer")
    other = _mk_farmer(s, "TEST_OtherFarmer")
    # existing entries: F on 03-02 morning (2L), 03-03 evening (3L); other farmer on 03-02 morning
    e1 = s.post(f"{API}/milk-entries", json={"farmer_id": f["id"], "date": "2020-03-02", "shift": "morning", "liters": 2, "fat": 4.0, "snf": 8.5}).json()
    e2 = s.post(f"{API}/milk-entries", json={"farmer_id": f["id"], "date": "2020-03-03", "shift": "evening", "liters": 3, "fat": 4.0, "snf": 8.5}).json()
    eo = s.post(f"{API}/milk-entries", json={"farmer_id": other["id"], "date": "2020-03-02", "shift": "morning", "liters": 5, "fat": 4.0, "snf": 8.5}).json()
    a1 = s.post(f"{API}/advances", json={"farmer_id": f["id"], "amount": 500, "note": "TEST_a1", "date": "2020-02-20"}).json()
    a2 = s.post(f"{API}/advances", json={"farmer_id": f["id"], "amount": 300, "note": "TEST_a2", "date": "2020-02-25"}).json()
    data = {"f": f, "other": other, "e1": e1, "e2": e2, "eo": eo, "a1": a1, "a2": a2}
    yield data
    s.delete(f"{API}/farmers/{f['id']}")
    s.delete(f"{API}/farmers/{other['id']}")


def _days(m=None, e=None):
    m = m or {}
    e = e or {}
    out = []
    for i in range(1, 11):
        d = f"2020-03-{i:02d}"
        out.append({"date": d, "morning": m.get(d, 0), "evening": e.get(d, 0)})
    return out


class TestDraft:
    def test_draft_days_and_advances(self, s, ctx):
        r = s.get(f"{API}/statement-draft/{ctx['f']['id']}", params={"date_from": D_FROM, "date_to": D_TO})
        assert r.status_code == 200, r.text
        d = r.json()
        assert len(d["days"]) == 10
        assert d["days"][0]["date"] == D_FROM and d["days"][-1]["date"] == D_TO
        by = {x["date"]: x for x in d["days"]}
        assert by["2020-03-02"]["morning"] == 2 and by["2020-03-03"]["evening"] == 3
        assert by["2020-03-01"]["morning"] == 0
        ids = {a["advance_id"]: a for a in d["advances"]}
        assert ids[ctx["a1"]["id"]]["available"] == 500
        assert ids[ctx["a2"]["id"]]["available"] == 300
        assert d["last_version"] == 0 and d["rate"] is None
        assert "_id" not in d["farmer"]

    def test_draft_invalid_period(self, s, ctx):
        r = s.get(f"{API}/statement-draft/{ctx['f']['id']}", params={"date_from": D_TO, "date_to": D_FROM})
        assert r.status_code == 400

    def test_draft_unknown_farmer(self, s):
        r = s.get(f"{API}/statement-draft/nope", params={"date_from": D_FROM, "date_to": D_TO})
        assert r.status_code == 404


class TestStatementCreate:
    def test_validation_rate_zero(self, s, ctx):
        r = s.post(f"{API}/statements", json={"farmer_id": ctx["f"]["id"], "date_from": D_FROM, "date_to": D_TO, "rate": 0, "days": _days()})
        assert r.status_code == 400

    def test_validation_deduction_gt_balance(self, s, ctx):
        r = s.post(f"{API}/statements", json={"farmer_id": ctx["f"]["id"], "date_from": D_FROM, "date_to": D_TO, "rate": 50,
                                              "days": _days({"2020-03-01": 100}), "deductions": [{"advance_id": ctx["a2"]["id"], "amount": 301}]})
        assert r.status_code == 400

    def test_validation_deduction_gt_gross(self, s, ctx):
        # gross = 2L * 50 = 100 ; deduct 200 (< balance 500)
        r = s.post(f"{API}/statements", json={"farmer_id": ctx["f"]["id"], "date_from": D_FROM, "date_to": D_TO, "rate": 50,
                                              "days": _days({"2020-03-01": 2}), "deductions": [{"advance_id": ctx["a1"]["id"], "amount": 200}]})
        assert r.status_code == 400
        # nothing mutated
        a = {x["id"]: x for x in s.get(f"{API}/advances", params={"farmer_id": ctx["f"]["id"]}).json()}
        assert a[ctx["a1"]["id"]]["deducted"] == 0

    def test_create_v1(self, s, ctx):
        # morning 03-01 10, 03-02 2 (same as existing), evening 03-03 0 (delete existing), evening 03-05 4.5
        body = {"farmer_id": ctx["f"]["id"], "date_from": D_FROM, "date_to": D_TO, "rate": 45.5,
                "days": _days({"2020-03-01": 10, "2020-03-02": 2}, {"2020-03-05": 4.5}),
                "deductions": [{"advance_id": ctx["a1"]["id"], "amount": 200}, {"advance_id": ctx["a2"]["id"], "amount": 300}]}
        r = s.post(f"{API}/statements", json=body)
        assert r.status_code == 200, r.text
        st = r.json()
        assert st["version"] == 1
        assert st["total_morning"] == 12 and st["total_evening"] == 4.5 and st["total_liters"] == 16.5
        assert st["gross_amount"] == round(16.5 * 45.5, 2)
        assert st["total_deduction"] == 500
        assert st["net_payable"] == round(16.5 * 45.5 - 500, 2)
        assert len(st["rows"]) == 10
        assert "_id" not in st
        ctx["st1"] = st
        # advances
        a = {x["id"]: x for x in s.get(f"{API}/advances", params={"farmer_id": ctx["f"]["id"]}).json()}
        assert a[ctx["a1"]["id"]]["deducted"] == 200 and a[ctx["a1"]["id"]]["settled"] is False
        assert a[ctx["a2"]["id"]]["deducted"] == 300 and a[ctx["a2"]["id"]]["settled"] is True

    def test_milk_entries_synced(self, s, ctx):
        rows = s.get(f"{API}/milk-entries", params={"farmer_id": ctx["f"]["id"], "date_from": D_FROM, "date_to": D_TO}).json()
        key = {(r["date"], r["shift"]): r for r in rows}
        assert set(key) == {("2020-03-01", "morning"), ("2020-03-02", "morning"), ("2020-03-05", "evening")}
        for r in rows:
            assert r["rate"] == 45.5 and r["amount"] == round(r["liters"] * 45.5, 2)
        # unchanged-liters entry kept same id (updated in place)
        assert key[("2020-03-02", "morning")]["id"] == ctx["e1"]["id"]
        # other farmer untouched
        o = s.get(f"{API}/milk-entries", params={"farmer_id": ctx["other"]["id"]}).json()
        assert len(o) == 1 and o[0]["id"] == ctx["eo"]["id"] and o[0]["rate"] == ctx["eo"]["rate"]

    def test_draft_after_save(self, s, ctx):
        d = s.get(f"{API}/statement-draft/{ctx['f']['id']}", params={"date_from": D_FROM, "date_to": D_TO}).json()
        assert d["last_version"] == 1 and d["rate"] == 45.5
        ids = {a["advance_id"]: a for a in d["advances"]}
        # settled a2 still shown since it was in prev version, available includes prev deduction
        assert ids[ctx["a2"]["id"]]["available"] == 300 and ids[ctx["a2"]["id"]]["deduct"] == 300
        assert ids[ctx["a1"]["id"]]["available"] == 500 and ids[ctx["a1"]["id"]]["deduct"] == 200

    def test_resave_v2_reverts_previous(self, s, ctx):
        body = {"farmer_id": ctx["f"]["id"], "date_from": D_FROM, "date_to": D_TO, "rate": 40,
                "days": _days({"2020-03-01": 10, "2020-03-02": 2}, {"2020-03-05": 4.5}),
                "deductions": [{"advance_id": ctx["a1"]["id"], "amount": 500}, {"advance_id": ctx["a2"]["id"], "amount": 100}]}
        r = s.post(f"{API}/statements", json=body)
        assert r.status_code == 200, r.text
        st = r.json()
        assert st["version"] == 2 and st["total_deduction"] == 600 and st["net_payable"] == round(16.5 * 40 - 600, 2)
        ctx["st2"] = st
        a = {x["id"]: x for x in s.get(f"{API}/advances", params={"farmer_id": ctx["f"]["id"]}).json()}
        assert a[ctx["a1"]["id"]]["deducted"] == 500 and a[ctx["a1"]["id"]]["settled"] is True
        assert a[ctx["a2"]["id"]]["deducted"] == 100 and a[ctx["a2"]["id"]]["settled"] is False
        rows = s.get(f"{API}/milk-entries", params={"farmer_id": ctx["f"]["id"], "date_from": D_FROM, "date_to": D_TO}).json()
        assert all(r["rate"] == 40 for r in rows)

    def test_resave_v3_no_deductions(self, s, ctx):
        body = {"farmer_id": ctx["f"]["id"], "date_from": D_FROM, "date_to": D_TO, "rate": 40,
                "days": _days({"2020-03-01": 10}), "deductions": []}
        st = s.post(f"{API}/statements", json=body).json()
        assert st["version"] == 3 and st["total_deduction"] == 0
        a = {x["id"]: x for x in s.get(f"{API}/advances", params={"farmer_id": ctx["f"]["id"]}).json()}
        assert a[ctx["a1"]["id"]]["deducted"] == 0 and a[ctx["a1"]["id"]]["settled"] is False
        assert a[ctx["a2"]["id"]]["deducted"] == 0 and a[ctx["a2"]["id"]]["settled"] is False
        rows = s.get(f"{API}/milk-entries", params={"farmer_id": ctx["f"]["id"], "date_from": D_FROM, "date_to": D_TO}).json()
        assert len(rows) == 1 and rows[0]["liters"] == 10

    def test_duplicate_advance_ids_overdeduct(self, s, ctx):
        # Edge: same advance twice — each validated separately against balance 300
        body = {"farmer_id": ctx["f"]["id"], "date_from": "2020-04-01", "date_to": "2020-04-10", "rate": 100,
                "days": [{"date": "2020-04-01", "morning": 10, "evening": 0}],
                "deductions": [{"advance_id": ctx["a2"]["id"], "amount": 200}, {"advance_id": ctx["a2"]["id"], "amount": 200}]}
        r = s.post(f"{API}/statements", json=body)
        ctx["dup_status"] = r.status_code
        if r.status_code == 200:
            a = {x["id"]: x for x in s.get(f"{API}/advances", params={"farmer_id": ctx["f"]["id"]}).json()}
            pytest.fail(f"Duplicate advance_id accepted; a2 deducted={a[ctx['a2']['id']]['deducted']} > amount 300")


class TestStatementRead:
    def test_list_and_get(self, s, ctx):
        lst = s.get(f"{API}/statements", params={"farmer_id": ctx["f"]["id"]}).json()
        assert len(lst) >= 3 and "rows" not in lst[0] and "_id" not in lst[0]
        assert lst[0]["created_at"] >= lst[-1]["created_at"]
        g = s.get(f"{API}/statements/{ctx['st1']['id']}")
        assert g.status_code == 200 and g.json()["version"] == 1 and len(g.json()["rows"]) == 10
        assert s.get(f"{API}/statements/does-not-exist").status_code == 404

    def test_delete_farmer_cascades(self, s):
        f = _mk_farmer(s, "TEST_CascadeFarmer")
        st = s.post(f"{API}/statements", json={"farmer_id": f["id"], "date_from": D_FROM, "date_to": D_TO, "rate": 40,
                                               "days": _days({"2020-03-01": 1})}).json()
        assert s.delete(f"{API}/farmers/{f['id']}").status_code == 200
        assert s.get(f"{API}/statements/{st['id']}").status_code == 404
        assert s.get(f"{API}/statements", params={"farmer_id": f["id"]}).json() == []
