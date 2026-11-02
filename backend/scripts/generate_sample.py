"""Generate a clearly synthetic text-based Chase-layout PDF for local import demos."""

from pathlib import Path
from reportlab.pdfgen import canvas

path = Path("data/synthetic-chase.pdf")
path.parent.mkdir(exist_ok=True)
pdf = canvas.Canvas(str(path))
lines = [
    "CHASE CREDIT CARD - SYNTHETIC DEMO ONLY",
    "Statement ending 10/31/2026",
    "PURCHASES",
    "10/02 WHOLE FOODS 45.67",
    "10/04 COFFEE HOUSE 6.50",
    "10/06 SPOTIFY 10.99",
    "10/08 AMAZON 32.00",
    "10/09 AMAZON REFUND -12.99",
    "PAYMENTS AND OTHER CREDITS",
    "10/15 PAYMENT THANK YOU -100.00",
]
for i, line in enumerate(lines):
    pdf.drawString(50, 790 - i * 22, line)
pdf.save()
print(f"Generated {path.resolve()} (synthetic, ignored by Git)")
