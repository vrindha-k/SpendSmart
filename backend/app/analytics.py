from collections import defaultdict


def analytics(rows):
    spending = sum(
        r.cents if r.kind == "expense" else -r.cents if r.kind == "refund" else 0
        for r in rows
    )
    income = sum(r.cents for r in rows if r.kind == "income")
    categories = defaultdict(int)
    months = defaultdict(lambda: {"spending": 0, "income": 0})
    merchants = defaultdict(int)
    weeks = defaultdict(int)
    for r in rows:
        month = r.date[:7]
        if r.kind in ["expense", "refund"]:
            value = r.cents * (1 if r.kind == "expense" else -1)
            categories[r.category] += value
            merchants[r.merchant] += value
            months[month]["spending"] += value
            from datetime import date

            d = date.fromisoformat(r.date)
            weeks[d.strftime("%G-W%V")] += value
        elif r.kind == "income":
            months[month]["income"] += r.cents
    trend = [{"month": k, **v} for k, v in sorted(months.items())]
    change = None
    if len(trend) > 1 and trend[-2]["spending"] > 0:
        change = round((trend[-1]["spending"] / trend[-2]["spending"] - 1) * 100, 1)
    dates = sorted(r.date for r in rows)
    from datetime import date

    days = (
        (date.fromisoformat(dates[-1]) - date.fromisoformat(dates[0])).days + 1
        if dates
        else 1
    )
    recurring = []
    groups = defaultdict(list)
    for r in rows:
        if r.kind == "expense":
            groups[r.merchant].append(r)
    for merchant, rs in groups.items():
        if (
            len({r.date[:7] for r in rs}) >= 3
            and max(r.cents for r in rs) - min(r.cents for r in rs) <= 100
        ):
            recurring.append(
                {
                    "merchant": merchant,
                    "cents": rs[-1].cents,
                    "months": len({r.date[:7] for r in rs}),
                }
            )
    return {
        "spending": spending,
        "income": income,
        "net": income - spending,
        "daily": round(spending / days),
        "change": change,
        "categories": [
            {"name": k, "value": v}
            for k, v in sorted(categories.items(), key=lambda x: -x[1])
        ],
        "trend": trend,
        "merchants": [
            {"name": k, "value": v}
            for k, v in sorted(merchants.items(), key=lambda x: -x[1])[:10]
        ],
        "weekly": [{"week": k, "value": v} for k, v in sorted(weeks.items())],
        "recurring": recurring,
        "count": len(rows),
    }
