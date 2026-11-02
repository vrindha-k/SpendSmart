import calendar, random
from .parsing import Row, classify


def demo_rows():
    rng = random.Random(42)
    rows = []
    merchants = [
        ("WHOLE FOODS", 4500, 9500),
        ("TRADER JOE", 2500, 6500),
        ("SWEETGREEN", 1200, 2100),
        ("COFFEE HOUSE", 450, 950),
        ("AMAZON", 1800, 9000),
        ("UBER", 1200, 4200),
        ("SHELL", 3500, 6000),
        ("CINEMA", 1600, 3200),
        ("PHARMACY", 1200, 3800),
        ("SALON", 3500, 6500),
        ("COURSERA", 4900, 4900),
    ]
    for month in range(5, 11):

        def add(day, merchant, cents, kind="expense"):
            cat, confidence = classify(merchant)
            rows.append(
                Row(
                    date=f"2026-{month:02}-{day:02}",
                    merchant=merchant,
                    cents=cents,
                    kind=kind,
                    category=cat,
                    confidence=confidence,
                )
            )

        add(1, "ACME PAYROLL · SYNTHETIC", 560000, "income")
        add(2, "RENT · DEMO APARTMENT", 145000)
        add(5, "NETFLIX", 1599)
        add(8, "SPOTIFY", 1099)
        add(12, "ADOBE", 2299)
        add(17, "ELECTRIC", rng.randint(6500, 11000))
        for day in range(1, calendar.monthrange(2026, month)[1] + 1):
            if day % 2 == 0:
                merchant, low, high = rng.choice(merchants)
                add(day, merchant, rng.randint(low, high))
            if day % 3 == 0:
                add(day, "COFFEE HOUSE", rng.randint(450, 950))
        add(21, "AMAZON", 2499, "refund")
        add(24, "CREDIT CARD PAYMENT", 90000, "payment")
    return rows
