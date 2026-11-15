from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(r"S:\Hackathon\Veyra\video-production")
EVID = ROOT / "assets" / "evidence"
EVID.mkdir(parents=True, exist_ok=True)

quote_source = Path(r"S:\Hackathon\Veyra\paid proof\Screenshot 2026-11-14 211910.png")
result_source = Path(r"S:\Hackathon\Veyra\paid proof\Screenshot 2026-11-14 221232.png")
base_source = Path(r"C:\Users\Paul\AppData\Local\Temp\codex-clipboard-652bbb38-7453-45b0-a393-7f2854dff872.png")

def crop_fit(path, box, out, label):
    img = Image.open(path).convert("RGB")
    card = img.crop(box)
    card.save(out, quality=94, optimize=True)
    print(f"{label}: {card.width}x{card.height} => {out}")

# These crops exclude the browser chrome and the connected wallet row.
crop_fit(quote_source, (160, 500, 1760, 1018), EVID / "quote-redacted.jpg", "quote")
crop_fit(result_source, (160, 450, 1760, 1018), EVID / "result-redacted.jpg", "result")

# Settlement exhibit: preserve status, block, timestamp, hash, amount and recipient.
# The visitor payer's abbreviated sender label is intentionally covered.
base = Image.open(base_source).convert("RGB")
receipt = base.crop((95, 420, 1810, 760))
d = ImageDraw.Draw(receipt)
# Original action row sender text maps to x=95..310, y=40..83 in this crop.
d.rounded_rectangle((88, 43, 312, 82), radius=7, fill=(255,255,255))
font_path = r"C:\Windows\Fonts\consola.ttf"
font = ImageFont.truetype(font_path, 16)
d.text((101, 54), "PAYER REDACTED", fill=(91, 91, 91), font=font)
receipt.save(EVID / "base-settlement-redacted.jpg", quality=95, optimize=True)

# Bundle quick manifest with source and exact privacy treatment.
(EVID / "evidence-manifest.md").write_text(
"""# Sanitised payment evidence assets

- quote-redacted.jpg: genuine Veyra quote screen; browser chrome and visitor address row excluded.
- result-redacted.jpg: genuine Veyra provider result; browser chrome and connected-wallet row excluded.
- base-settlement-redacted.jpg: genuine BaseScan receipt screenshot; sender label/address obscured while keeping the transaction hash, successful status, block, time, amount and recipient visible.

The originating images remain in the separate local paid proof folder and are not copied into this production bundle or committed.
""", encoding="utf-8")
