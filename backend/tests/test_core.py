from types import SimpleNamespace
import io, json
from reportlab.pdfgen import canvas
import pytest
from app.parsing import parse_text, normalize, classify
from app.analytics import analytics
from app.privacy import minimized_payload, AIResult, grounded_recommendations

TEXT = """CHASE CREDIT CARD 01/31/2026
PURCHASES
01/03 WHOLE FOODS 1234 45.67
01/05 COFFEE HOUSE 5.50
01/06 AMAZON REFUND -12.99
PAYMENTS AND OTHER CREDITS
01/08 PAYMENT THANK YOU -100.00
"""


def test_parse_and_refunds():
    rows, _ = parse_text(TEXT)
    assert [r.kind for r in rows] == ["expense", "expense", "refund", "payment"]
    assert rows[0].cents == 4567 and rows[0].merchant == "WHOLE FOODS"
    assert rows[0].category == "Groceries"


def test_checking_sections():
    rows, _ = parse_text(
        "CHASE CHECKING 2026\nDEPOSITS AND ADDITIONS\n02/01 ACME PAYROLL 5,000.00\nELECTRONIC WITHDRAWALS\n02/02 ELECTRIC 90.00\n02/03 TRANSFER SAVINGS 100.00"
    )
    assert [r.kind for r in rows] == ["income", "expense", "transfer"]


def test_year_rollover():
    rows, _ = parse_text("CHASE CREDIT CARD 01/31/2026\n12/28 COFFEE 5.00")
    assert str(rows[0].date) == "2025-12-28"


@pytest.mark.parametrize(
    "text",
    ["CHASE scanned blank 2026", "OTHER BANK 2026\n01/01 STORE 5.00", "CHASE no year"],
)
def test_no_invented_transactions(text):
    with pytest.raises(ValueError):
        parse_text(text)


def test_rules_and_normalization():
    assert normalize("  WHOLE FOODS XXXX1234 987654  ") == "WHOLE FOODS"
    assert classify("WHOLE FOODS", {"WHOLE": "Shopping"}) == ("Shopping", 100)
    assert classify("UNKNOWN")[1] < 60


def obj(kind, cents, dt="2026-01-01", merchant="M", category="Other"):
    return SimpleNamespace(
        kind=kind, cents=cents, date=dt, merchant=merchant, category=category
    )


def test_analytics_money_semantics():
    s = analytics(
        [
            obj("expense", 10000),
            obj("refund", 1000),
            obj("payment", 50000),
            obj("transfer", 4000),
            obj("income", 20000),
        ]
    )
    assert s["spending"] == 9000 and s["income"] == 20000 and s["net"] == 11000
    assert s["daily"] == 9000 and analytics([])["spending"] == 0


def test_recurring_and_change():
    s = analytics(
        [
            obj("expense", 1000, "2026-01-01"),
            obj("expense", 1050, "2026-02-01"),
            obj("expense", 1000, "2026-03-01"),
        ]
    )
    assert len(s["recurring"]) == 1 and s["change"] == -4.8


def test_privacy_allowlist_and_randomization():
    rows = [
        obj("expense", 3000, merchant="JANE DOE ACCOUNT 123456789 ADDRESS 10 MAIN ST")
    ]
    p, m = minimized_payload(rows)
    p2, _ = minimized_payload(rows)
    raw = json.dumps(p)
    assert all(
        value not in raw
        for value in ["JANE", "ACCOUNT", "123456789", "MAIN ST", "2026-01-01"]
    )
    assert set(p["transactions"][0]) == {
        "merchant_alias",
        "month",
        "amount_cents",
        "category",
        "type",
    }
    assert p != p2 and list(m.values()) == [rows[0].merchant]


def test_grounding_unknown_alias_and_estimates():
    p, m = minimized_payload([obj("expense", 10000)])
    alias = next(iter(m))
    result = AIResult(
        suggestions=[
            {"merchant_alias": alias, "reduction_percent": 25},
            {"merchant_alias": "fake", "reduction_percent": 30},
        ]
    )
    r = grounded_recommendations(result, p, m)
    assert len(r) == 1 and r[0]["saving_cents"] == 2500
    with pytest.raises(ValueError):
        AIResult(suggestions=[{"merchant_alias": alias, "reduction_percent": 101}])


def pdf_bytes(text=TEXT):
    output = io.BytesIO()
    pdf = canvas.Canvas(output)
    for i, line in enumerate(text.splitlines()):
        pdf.drawString(50, 790 - i * 18, line)
    pdf.save()
    return output.getvalue()


def test_full_pdf_preview_import_duplicates_edit_export(client):
    r = client.post(
        "/api/statements/preview",
        files={"file": ("synthetic.pdf", pdf_bytes(), "application/pdf")},
    )
    assert r.status_code == 200, r.text
    rows = r.json()["rows"]
    assert len(rows) == 4
    assert client.get("/api/transactions?source=local").json() == []
    assert (
        client.post("/api/statements/import", json={"rows": rows}).json()["imported"]
        == 4
    )
    assert (
        client.post("/api/statements/import", json={"rows": rows}).json()["duplicates"]
        == 4
    )
    stored = client.get("/api/transactions?source=local").json()
    id = stored[0]["id"]
    edited = {**rows[0], "category": "Shopping"}
    assert (
        client.patch(f"/api/transactions/{id}?source=local", json=edited).status_code
        == 200
    )
    assert (
        next(
            r
            for r in client.get(
                "/api/transactions?source=local&category=Shopping"
            ).json()
            if r["id"] == id
        )["confidence"]
        == 100
    )
    assert (
        client.patch(f"/api/transactions/{id}?source=demo", json=edited).status_code
        == 404
    )
    assert "merchant" in client.get("/api/export?source=local").text
    assert len(client.get("/api/transactions?source=demo").json()) > 100


def test_repeated_identical_purchases_within_statement(client):
    row = {
        "date": "2026-01-01",
        "merchant": "COFFEE",
        "cents": 500,
        "kind": "expense",
        "category": "Restaurants & Dining",
    }
    assert (
        client.post("/api/statements/import", json={"rows": [row, row]}).json()[
            "imported"
        ]
        == 2
    )
    assert (
        client.post("/api/statements/import", json={"rows": [row, row]}).json()[
            "duplicates"
        ]
        == 2
    )


def test_bad_uploads_and_validation(client):
    assert (
        client.post(
            "/api/statements/preview",
            files={"file": ("x.pdf", b"bad", "application/pdf")},
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/statements/preview",
            files={
                "file": ("x.pdf", pdf_bytes("CHASE 2026 no rows"), "application/pdf")
            },
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/statements/import", json={"rows": [{"cents": -10}]}
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/ai/analyze", json={"token": "x", "consent": False}
        ).status_code
        == 422
    )


def test_ai_disabled_and_preview(client):
    r = client.post("/api/ai/preview", json={"source": "demo"})
    assert r.status_code == 200
    assert "COFFEE" not in json.dumps(r.json()["payload"])
    assert (
        client.post(
            "/api/ai/analyze", json={"token": r.json()["token"], "consent": True}
        ).status_code
        == 503
    )


def test_rules_bulk_delete_filters(client):
    assert (
        client.post(
            "/api/rules", json={"merchant": "coffee", "category": "Shopping"}
        ).status_code
        == 200
    )
    r = client.post(
        "/api/statements/preview",
        files={"file": ("x.pdf", pdf_bytes(), "application/pdf")},
    ).json()
    assert r["rows"][1]["category"] == "Shopping"
    rows = client.get(
        "/api/transactions?source=demo&start=2026-10-01&end=2026-10-31"
    ).json()
    assert rows and all(r["date"].startswith("2026-10") for r in rows)
    assert (
        client.post(
            "/api/transactions/bulk", json={"ids": [rows[0]["id"]], "category": "Other"}
        ).json()["updated"]
        == 1
    )
    client.delete("/api/data?source=local")
    assert client.get("/api/transactions?source=demo").json()


def test_claude_success_failure_and_single_use_consent(client, monkeypatch):
    import anthropic
    from app.database import settings

    monkeypatch.setattr(settings, "ai_enabled", True)
    monkeypatch.setattr(settings, "anthropic_api_key", "synthetic-test-key")
    seen = []

    class Messages:
        def create(self, **kwargs):
            seen.append(kwargs)
            payload = json.loads(kwargs["messages"][0]["content"])
            alias = next(
                r["merchant_alias"]
                for r in payload["transactions"]
                if r["type"] == "expense"
            )
            return SimpleNamespace(
                content=[
                    SimpleNamespace(
                        type="text",
                        text=json.dumps(
                            {
                                "suggestions": [
                                    {"merchant_alias": alias, "reduction_percent": 20}
                                ]
                            }
                        ),
                    )
                ]
            )

    monkeypatch.setattr(
        anthropic, "Anthropic", lambda **kwargs: SimpleNamespace(messages=Messages())
    )
    token = client.post("/api/ai/preview", json={"source": "demo"}).json()["token"]
    response = client.post("/api/ai/analyze", json={"token": token, "consent": True})
    assert response.status_code == 200 and response.json()["recommendations"]
    assert "COFFEE" not in seen[0]["messages"][0]["content"]
    assert (
        client.post(
            "/api/ai/analyze", json={"token": token, "consent": True}
        ).status_code
        == 400
    )

    def fail(**kwargs):
        raise RuntimeError("secret provider error")

    monkeypatch.setattr(anthropic, "Anthropic", fail)
    token = client.post("/api/ai/preview", json={"source": "demo"}).json()["token"]
    response = client.post("/api/ai/analyze", json={"token": token, "consent": True})
    assert response.status_code == 502 and "secret" not in response.text
    assert client.get("/api/analytics").status_code == 200
