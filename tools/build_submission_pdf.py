#!/usr/bin/env python3
"""
Builds the single submission PDF required by the assignment:
  1. the full code base (as a printed listing)
  2. screenshots of the output (every image in the screenshots/ folder, sorted by file name)
  3. the project report (a PDF exported from Word)

Usage (from the CampusFix folder):
  pip install reportlab pypdf pillow
  python tools/build_submission_pdf.py --report CampusFix-Project-Report.pdf --out CampusFix-Submission.pdf
"""
import argparse, io, os, sys
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from pypdf import PdfReader, PdfWriter
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {'node_modules', 'dist', '.git', 'uploads', 'screenshots', 'tools', '__pycache__'}
SKIP_FILES = {'package-lock.json', 'database.sqlite', '.env'}
CODE_EXT = {'.js', '.jsx', '.json', '.css', '.html', '.md', '.example', '.txt', '.yml', '.yaml', '.gitignore'}
FONT, SIZE, LEAD = 'Courier', 7.5, 9.2
W, H = A4
MARGIN = 36
MAX_CHARS = int((W - 2 * MARGIN) / (SIZE * 0.6))
LINES_PER_PAGE = int((H - 2 * MARGIN - 30) / LEAD)


def collect_files():
    found = []
    for folder, dirs, files in os.walk(ROOT):
        dirs[:] = sorted(d for d in dirs if d not in SKIP_DIRS)
        for name in sorted(files):
            if name in SKIP_FILES:
                continue
            ext = os.path.splitext(name)[1] or name
            if ext in CODE_EXT or name in {'.gitignore', '_redirects'}:
                found.append(os.path.join(folder, name))
    return found


def wrap(line):
    line = line.replace('\t', '    ').rstrip('\n')
    if not line:
        return ['']
    return [line[i:i + MAX_CHARS] for i in range(0, len(line), MAX_CHARS)]


def code_listing_pdf(files):
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    # cover page
    c.setFont('Helvetica-Bold', 22)
    c.drawString(MARGIN, H - 120, 'CampusFix - Source Code')
    c.setFont('Helvetica', 12)
    c.drawString(MARGIN, H - 150, 'MIT 8333: Advanced Web Application Development (Virtual Lab)')
    c.drawString(MARGIN, H - 180, 'Files included:')
    c.setFont(FONT, 9)
    y = H - 200
    for f in files:
        if y < MARGIN:
            c.showPage(); c.setFont(FONT, 9); y = H - MARGIN
        c.drawString(MARGIN + 10, y, os.path.relpath(f, ROOT).replace(os.sep, '/'))
        y -= 11
    c.showPage()
    for path in files:
        rel = os.path.relpath(path, ROOT).replace(os.sep, '/')
        try:
            with open(path, encoding='utf-8') as fh:
                lines = [seg for raw in fh for seg in wrap(raw)]
        except UnicodeDecodeError:
            continue
        for start in range(0, max(len(lines), 1), LINES_PER_PAGE):
            c.setFont('Helvetica-Bold', 9)
            c.drawString(MARGIN, H - MARGIN, f'{rel}  (part {start // LINES_PER_PAGE + 1})')
            c.line(MARGIN, H - MARGIN - 4, W - MARGIN, H - MARGIN - 4)
            c.setFont(FONT, SIZE)
            y = H - MARGIN - 20
            for text in lines[start:start + LINES_PER_PAGE]:
                c.drawString(MARGIN, y, text)
                y -= LEAD
            c.showPage()
    c.save()
    buf.seek(0)
    return PdfReader(buf)


def screenshots_pdf(folder):
    names = sorted(n for n in os.listdir(folder) if n.lower().endswith(('.png', '.jpg', '.jpeg')))
    if not names:
        return None
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    for name in names:
        path = os.path.join(folder, name)
        with Image.open(path) as im:
            iw, ih = im.size
        box_w, box_h = W - 2 * MARGIN, H - 2 * MARGIN - 40
        scale = min(box_w / iw, box_h / ih)
        dw, dh = iw * scale, ih * scale
        caption = os.path.splitext(name)[0].replace('_', ' ').replace('-', ' ')
        c.setFont('Helvetica-Bold', 11)
        c.drawString(MARGIN, H - MARGIN - 8, caption)
        c.drawImage(path, MARGIN, H - MARGIN - 30 - dh, dw, dh)
        c.showPage()
    c.save()
    buf.seek(0)
    return PdfReader(buf)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--report', help='Project report exported to PDF')
    p.add_argument('--screenshots', default=os.path.join(ROOT, 'screenshots'))
    p.add_argument('--out', default=os.path.join(ROOT, 'CampusFix-Submission.pdf'))
    a = p.parse_args()

    writer = PdfWriter()
    parts = [('code', code_listing_pdf(collect_files()))]
    if os.path.isdir(a.screenshots):
        shots = screenshots_pdf(a.screenshots)
        if shots:
            parts.append(('screenshots', shots))
        else:
            print('Note: no images found in', a.screenshots)
    if a.report:
        parts.append(('report', PdfReader(a.report)))
    else:
        print('Note: no --report given, the report will not be included.')
    for label, reader in parts:
        for page in reader.pages:
            writer.add_page(page)
        print(f'Added {label}: {len(reader.pages)} pages')
    with open(a.out, 'wb') as fh:
        writer.write(fh)
    print('Created', a.out)


if __name__ == '__main__':
    sys.exit(main())
