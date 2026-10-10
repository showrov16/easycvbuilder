#!/usr/bin/env python3
"""Converts css/templates.src.css (px based) into css/templates.css (em based, so the
'fit to page' shrink works by changing one font-size). Only needed if you edit the source."""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
src = (root / 'css' / 'templates.src.css').read_text()
out = []
pos = 0
for m in re.finditer(r'([^{}]+)\{([^{}]*)\}', src):
    sel, body = m.group(1).strip(), m.group(2)
    if sel.startswith('@font-face') or sel.startswith('/*'):
        out.append(sel + '{' + body + '}')
        continue
    sel = re.sub(r'(^|,)\s*\.t(\d+)', lambda x: x.group(1) + '.cv.t' + x.group(2), sel)
    decls = []
    for d in body.split(';'):
        if not d.strip():
            continue
        prop = d.split(':', 1)[0].strip()
        if prop.startswith(('border', 'outline', 'box-shadow')) or 'var(' in d:
            decls.append(d.strip())
        else:
            decls.append(re.sub(r'(-?\d*\.?\d+)px', lambda x: ('%.4f' % (float(x.group(1)) / 12)).rstrip('0').rstrip('.') + 'em' if float(x.group(1)) != 0 else '0', d.strip()))
    out.append(sel + '{' + ';'.join(decls) + '}')
text = '\n'.join(out)
# strip any comment lines that slipped into selectors
text = re.sub(r'/\*.*?\*/', '', text, flags=re.S)
(root / 'css' / 'templates.css').write_text(text)
print('wrote', root / 'css' / 'templates.css', len(text), 'bytes')
