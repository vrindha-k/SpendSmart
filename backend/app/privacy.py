"""An allowlist boundary: raw descriptions and exact dates never leave this module."""

from secrets import token_hex
from pydantic import BaseModel, Field
from .analytics import analytics


def minimized_payload(rows):
    aliases = {}
    mapping = {}
    payload = []
    for r in rows:
        if r.merchant not in aliases:
            alias = "merchant_" + token_hex(6)
            aliases[r.merchant] = alias
            mapping[alias] = r.merchant
        payload.append(
            {
                "merchant_alias": aliases[r.merchant],
                "month": r.date[:7],
                "amount_cents": r.cents,
                "category": r.category,
                "type": r.kind,
            }
        )
    return {"transactions": payload}, mapping


class Suggestion(BaseModel):
    merchant_alias: str
    reduction_percent: int = Field(ge=1, le=30)


class AIResult(BaseModel):
    suggestions: list[Suggestion] = Field(max_length=8)


def grounded_recommendations(result, payload, mapping):
    # Ignore model-generated monetary claims: calculate estimates locally from approved rows.
    totals = {}
    months = set()
    excluded = set()
    for r in payload["transactions"]:
        months.add(r["month"])
        if r["category"] in ["Healthcare", "Housing", "Utilities", "Education"]:
            excluded.add(r["merchant_alias"])
        if r["type"] in ["expense", "refund"]:
            totals[r["merchant_alias"]] = totals.get(r["merchant_alias"], 0) + r[
                "amount_cents"
            ] * (1 if r["type"] == "expense" else -1)
    found = set()
    output = []
    for s in result.suggestions:
        if (
            s.merchant_alias not in totals
            or s.merchant_alias in found
            or s.merchant_alias in excluded
            or totals[s.merchant_alias] <= 0
        ):
            continue
        found.add(s.merchant_alias)
        baseline = round(totals[s.merchant_alias] / max(len(months), 1))
        output.append(
            {
                "merchant": mapping[s.merchant_alias],
                "baseline_cents": baseline,
                "saving_cents": round(baseline * s.reduction_percent / 100),
                "percent": s.reduction_percent,
            }
        )
    return sorted(output, key=lambda r: -r["saving_cents"])
