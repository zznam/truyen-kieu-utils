"""Optional maintenance tool; ordinary app builds use the checked-in WOFF2 files."""
import hashlib
import io
import json
from pathlib import Path
from urllib.request import urlopen

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

FONT_DIR = Path(__file__).resolve().parents[1] / 'public' / 'fonts'
UNICODES = (
    list(range(0x0000, 0x0250))
    + list(range(0x0300, 0x0370))
    + list(range(0x1E00, 0x1F00))
    + list(range(0x2000, 0x2070))
    + [0x20AB, 0x20AC, 0x2190, 0x2191, 0x2192, 0x2193, 0x2212, 0xFEFF, 0xFFFD]
)

for source in json.loads((FONT_DIR / 'sources.json').read_text()):
    with urlopen(source['url'], timeout=60) as response:
        data = response.read()
    if hashlib.sha256(data).hexdigest() != source['sha256']:
        raise ValueError(f"Source checksum mismatch: {source['file']}")
    font = TTFont(io.BytesIO(data), lazy=False)
    font.ensureDecompiled()
    options = subset.Options()
    options.flavor = 'woff2'
    options.name_IDs = ['*']
    options.name_legacy = True
    options.name_languages = ['*']
    subsetter = subset.Subsetter(options=options)
    subsetter.populate(unicodes=UNICODES)
    subsetter.subset(font)
    font = instantiateVariableFont(font, {'wdth': 100}, inplace=True)
    font.flavor = 'woff2'
    cmap = font.getBestCmap()
    for codepoint in [0x0306, 0x031B, 0x0302, 0x0323, 0x1EAF]:
        if codepoint not in cmap:
            raise ValueError(f"Missing Vietnamese glyph U+{codepoint:04X}")
    font.save(FONT_DIR / source['output'])
    print(source['output'])
