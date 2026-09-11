"""Rebuild synthetic V4.9 visual fixtures with Pillow/reportlab (development only)."""
from pathlib import Path
import hashlib, json
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'tests' / 'fixtures' / 'vision-benchmark'
OUT.mkdir(parents=True, exist_ok=True)
FONT = Path('C:/Windows/Fonts/arial.ttf')
if not FONT.exists():
    FONT = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
font = ImageFont.truetype(str(FONT), 25)
small = ImageFont.truetype(str(FONT), 20)
title = ImageFont.truetype(str(FONT), 30)
cases = []
units = ['CNY million', 'USD thousand', 'HKD million', '%', 'shares thousand', 'EUR million']
metrics = [('Revenue', 'Operating costs'), ('Operating cash flow', 'Capital expenditure'),
           ('Net profit', 'Nonrecurring gain'), ('Return on equity', 'Operating margin'),
           ('Basic shares', 'Diluted shares'), ('Assets', 'Liabilities')]
for index in range(48):
    case_id = f'VIS-{index + 1:03}'
    family, variation = index % 6, index // 6
    kind = ['table', 'screenshot', 'scanned-pdf'][index % 3]
    periods = [str(2025 - variation % 4), str(2024 - variation % 4)]
    headers = ['Metric', *periods]
    unit = units[family]
    footnotes = [f'[1] {"Restated comparative period" if variation % 2 else "Consolidated scope; not parent-only"}.']
    rows, cells = [], []
    for row_index, row in enumerate(metrics[family]):
        values = []
        for col_index, column in enumerate(periods):
            number = (index + 3) * 17 + row_index * 29 + col_index * 11
            value = f'{number:,}.25' if family != 3 else f'{number % 30}.5%'
            if row_index == 1 and variation % 3 == 0:
                value = f'({value})'
            elif row_index == 1 and variation % 3 == 1:
                value = '-' + value
            if variation == 4 and row_index == 0 and col_index == 1:
                value = ''  # Visible blank, not zero.
            if variation == 5 and row_index == 1 and col_index == 0:
                value = 'unreadable'  # Explicit missing-control case.
            if variation == 6 and row_index == 0 and col_index == 0:
                value = '0'  # Real zero differs from missing.
            values.append(value)
            cells.append(dict(row=row, column=column, value=None if value in ['', 'unreadable'] else value,
                              unit=unit, date=column + '-12-31', footnote='[1]' if row_index == 1 else None))
        rows.append([row + (' [1]' if row_index == 1 else ''), *values])
    background = '#edf1f5' if kind == 'screenshot' else '#ffffff'
    image = Image.new('RGB', (1200, 800), background)
    draw = ImageDraw.Draw(image)
    if kind == 'screenshot':
        draw.rounded_rectangle((20, 20, 1180, 780), radius=15, fill='white', outline='#bec6d0', width=2)
        draw.rectangle((20, 20, 1180, 60), fill='#263849')
        draw.text((42, 28), 'Research source preview - synthetic fixture', font=small, fill='white')
    draw.text((65, 95), f'{case_id} / Synthetic financial statement', font=title, fill='#172c40')
    draw.text((65, 150), f'Unit: {unit}', font=font, fill='#263849')
    draw.text((65, 192), 'Periods end 31 December; visible cells only.', font=small, fill='#333333')
    xs = [65, 590, 840, 1135]
    for r, values in enumerate([headers, *rows]):
        top = 265 + r * 85
        draw.rectangle((65, top, 1135, top + 85), fill='#e3ebf2' if r == 0 else 'white', outline='#657687', width=2)
        for x in xs[1:-1]:
            draw.line((x, top, x, top + 85), fill='#657687', width=2)
        for c, value in enumerate(values):
            draw.text((xs[c] + 14, top + 26), value, font=font, fill='#263849')
    draw.text((65, 565), footnotes[0], font=small, fill='#333333')
    draw.text((65, 615), 'Blank / unreadable cells are missing; do not fill zero.', font=small, fill='#333333')
    draw.text((65, 690), 'Synthetic benchmark only - no actual issuer or investment facts.', font=small, fill='#657687')
    if kind == 'scanned-pdf':
        image = image.convert('L').convert('RGB')
        if variation % 2:
            image = image.rotate(0.7, resample=Image.Resampling.BICUBIC, fillcolor='white')
        file = case_id + '.pdf'
        pdf = canvas.Canvas(str(OUT / file), pagesize=(600, 400), invariant=1, pageCompression=1)
        pdf.drawImage(ImageReader(image), 0, 0, 600, 400)
        pdf.showPage(); pdf.save()
    else:
        file = case_id + '.png'
        image.save(OUT / file)
    # A contact sheet is development QA only; canonical bytes are PNG/PDF above.
    if index == 0: previews = []
    previews.append(image.resize((360, 240)))
    cases.append(dict(id=case_id, kind=kind, file=file, sha256=hashlib.sha256((OUT/file).read_bytes()).hexdigest(),
                      synthetic=True, page=1, tags=[unit, 'parentheses' if variation % 3 == 0 else 'sign',
                      'missing' if variation in [4, 5] else 'zero' if variation == 6 else 'numeric', 'footnote', 'relationship'],
                      expected=dict(headers=headers, cells=cells, footnotes=footnotes)))
manifest = dict(version=1, kind='frozen-vision-corpus', synthetic=True, cases=cases)
(OUT/'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
sheet = Image.new('RGB', (360 * 6, 240 * 8), 'white')
for i, preview in enumerate(previews): sheet.paste(preview, ((i % 6) * 360, (i // 6) * 240))
(ROOT/'artifacts').mkdir(exist_ok=True)
sheet.save(ROOT/'artifacts'/'v4-9-vision-contact-sheet.png')
print('Created 48 frozen synthetic cases (32 PNG / 16 scanned PDF).')
