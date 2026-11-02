import re, hashlib
from datetime import date
from decimal import Decimal
from typing import Literal
from pydantic import BaseModel, Field

CATEGORIES = [
    "Groceries",
    "Restaurants & Dining",
    "Shopping",
    "Transportation",
    "Housing",
    "Utilities",
    "Entertainment",
    "Healthcare",
    "Education",
    "Travel",
    "Subscriptions",
    "Personal Care",
    "Other",
]
Category = Literal[
    "Groceries",
    "Restaurants & Dining",
    "Shopping",
    "Transportation",
    "Housing",
    "Utilities",
    "Entertainment",
    "Healthcare",
    "Education",
    "Travel",
    "Subscriptions",
    "Personal Care",
    "Other",
]
Kind = Literal["expense", "income", "refund", "transfer", "payment"]


class Row(BaseModel):
    date: date
    merchant: str = Field(min_length=1, max_length=200)
    cents: int = Field(ge=1, le=100000000)
    category: Category = "Other"
    kind: Kind = "expense"
    confidence: int = Field(default=50, ge=0, le=100)


def normalize(value):
    value = re.sub(r"\b(?:XXXX\d*|\d{4,}|HTTPS?\S*|WWW\.\S*)\b", "", value.upper())
    return re.sub(r"\s+", " ", value).strip(" *-")[:200] or "UNKNOWN MERCHANT"


RULES = {
    "WHOLE FOODS": "Groceries",
    "TRADER JOE": "Groceries",
    "SAFEWAY": "Groceries",
    "COFFEE": "Restaurants & Dining",
    "SWEETGREEN": "Restaurants & Dining",
    "CHIPOTLE": "Restaurants & Dining",
    "UBER": "Transportation",
    "SHELL": "Transportation",
    "TARGET": "Shopping",
    "AMAZON": "Shopping",
    "RENT": "Housing",
    "ELECTRIC": "Utilities",
    "NETFLIX": "Subscriptions",
    "SPOTIFY": "Subscriptions",
    "ADOBE": "Subscriptions",
    "CINEMA": "Entertainment",
    "PHARMACY": "Healthcare",
    "COURSERA": "Education",
    "AIRLINES": "Travel",
    "SALON": "Personal Care",
}


def classify(merchant, custom=None):
    for key, category in (custom or {}).items():
        if key in merchant:
            return category, 100
    for key, category in RULES.items():
        if key in merchant:
            return category, 95
    return "Other", 35


def fingerprint(row, occurrence=0):
    return hashlib.sha256(
        f"{row.date}|{row.merchant}|{row.cents}|{row.kind}|{occurrence}".encode()
    ).hexdigest()


def parse_text(text, year=None):
    if "CHASE" not in text.upper():
        raise ValueError("Only supported Chase statements can be parsed.")
    years = re.findall(r"\b(20\d{2})\b", text[:3000])
    year = year or (int(years[0]) if years else None)
    if not year:
        raise ValueError("Statement year missing. Select the statement ending year.")
    credit = bool(re.search(r"CREDIT CARD|CARDMEMBER|PURCHASES", text, re.I))
    rows = []
    warnings = []
    section = "expense"
    for line in text.splitlines():
        upper = line.upper().strip()
        if upper in ["DEPOSITS AND ADDITIONS", "DEPOSITS"]:
            section = "income"
        elif upper in ["PAYMENTS AND OTHER CREDITS"]:
            section = "payment"
        elif upper in [
            "ATM & DEBIT CARD WITHDRAWALS",
            "ELECTRONIC WITHDRAWALS",
            "PURCHASES",
            "FEES CHARGED",
        ]:
            section = "expense"
        match = re.match(
            r"^\s*(\d{2}/\d{2})(?:/\d{2,4})?\s+(?:\d{2}/\d{2}\s+)?(.+?)\s+(-?\$?[\d,]+\.\d{2}-?)\s*$",
            line,
        )
        if not match:
            continue
        ds, desc, amount = match.groups()
        try:
            month, day = map(int, ds.split("/"))
            y = year
            # December transactions in January-ending statements belong to the prior year.
            if month == 12 and re.search(r"01/\d{2}/" + str(year), text[:3000]):
                y -= 1
            dt = date(y, month, day)
            signed = Decimal(amount.replace("$", "").replace(",", "").strip("-"))
            negative = "-" in amount
            merchant = normalize(desc)
            kind = section
            if re.search(r"REFUND|RETURN|REVERSAL", desc, re.I):
                kind = "refund"
            elif re.search(r"PAYMENT THANK|AUTOPAY|CREDIT CARD PAYMENT", desc, re.I):
                kind = "payment"
            elif re.search(r"TRANSFER|ZELLE", desc, re.I):
                kind = "transfer"
            elif re.search(r"PAYROLL|DIRECT DEP", desc, re.I):
                kind = "income"
            elif negative:
                kind = "refund" if credit else "expense"
            cat, conf = classify(merchant)
            if signed:
                rows.append(
                    Row(
                        date=dt,
                        merchant=merchant,
                        cents=int(signed * 100),
                        category=cat,
                        kind=kind,
                        confidence=conf,
                    )
                )
        except (ValueError, ArithmeticError):
            warnings.append(
                "A date or amount could not be parsed. Review the original statement locally."
            )
    if not rows:
        raise ValueError(
            "No supported transaction rows found. Scanned PDFs require local OCR; no transactions were invented."
        )
    return rows, warnings
