# Vietnamese reading fonts

Noto Serif and Noto Sans are distributed under the included SIL Open Font Licenses.
The upstream TTF files come from [Google Fonts at revision 8b0a1d0](https://github.com/google/fonts/tree/8b0a1d0f5983c89bc2b93f1b5fb55f9e252744b5/ofl).
`sources.json` records the exact source URLs and SHA-256 hashes.

These WOFF2 subsets retain Latin, Vietnamese, combining marks, punctuation and common symbols.
They retain the 100–900 weight axis and fix width to 100%. Regular and italic are separate files.
The standard web subsets omit the combining breve U+0306 and horn U+031B, causing system-font
fallback for decomposed Vietnamese text. Keeping the complete combining-mark block avoids that.
The browser regression checks actual painted fonts for NFC and NFD vowels in both styles.

Ordinary builds require no font downloads or Python tooling. To regenerate intentionally:

```sh
python3 -m venv /tmp/kieu-font-tools
/tmp/kieu-font-tools/bin/pip install fonttools==4.67.0 brotli==1.2.1
/tmp/kieu-font-tools/bin/python scripts/build-fonts.py
pnpm test:ui --grep 'every Vietnamese vowel'
```

Font requests go only to this app's `/fonts/` path. Each compressed face is approximately
100–130 KiB and is requested only when its family and style are used.
