# @fullgreen/converter

A CLI to convert:

- `.heic` -> `.jpg` or `.png` (via `sharp`)
- `.docx` -> `.pdf` (via `mammoth` + `puppeteer`)
- audio files -> `.mp3` or `.wav` (via bundled `ffmpeg-static`)

## Requirements

- Node.js 20+
- `pnpm`

## Install Dependencies

```bash
pnpm install
```

If `pnpm` blocks install scripts (common in pnpm v10+), allow Puppeteer and `ffmpeg-static` to finish their setup steps:

```bash
pnpm approve-builds
pnpm rebuild puppeteer
pnpm exec puppeteer browsers install chrome
```

## Build

```bash
pnpm build
```

## Usage

### Direct command mode

```bash
fullgreen-convert <input> [output] [--format jpg|png]
```

Examples:

```bash
# Auto output path: ./photo.jpg
fullgreen-convert ./photo.heic

# Explicit output path and format
fullgreen-convert ./photo.heic ./photo.png --format png

# Auto output path: ./report.pdf
fullgreen-convert ./report.docx

# Explicit output path
fullgreen-convert ./report.docx ./exports/report.pdf

# Convert music to MP3 by default
fullgreen-convert ./track.flac

# Convert music to WAV explicitly
fullgreen-convert ./track.m4a ./track.wav --format wav
```

### Interactive mode

If no arguments are provided, the CLI prompts for input and output details.
File paths use autocomplete-style suggestions, and `.docx` inputs show `.pdf` as the selectable output format:

```bash
fullgreen-convert
```

## Run with pnpm dlx

After publishing to npm, run without global install:

```bash
pnpm dlx @fullgreen/converter ./photo.heic
```

You can also pass output and format:

```bash
pnpm dlx @fullgreen/converter ./photo.heic ./photo.png --format png
```

## Test Locally with Global Link

From project root:

```bash
pnpm install
pnpm build
pnpm link --global
```

Then use it anywhere:

```bash
fullgreen-convert /absolute/path/to/input.heic
```

To remove the global link:

```bash
pnpm unlink --global @fullgreen/converter
```

## Development Scripts

```bash
pnpm dev
pnpm typecheck
pnpm build
pnpm test
```

## Notes

- HEIC conversion supports only JPG and PNG outputs.
- DOCX conversion is Node-only and uses an embedded Chromium runtime from `puppeteer`.
- Audio conversion supports common music formats and outputs MP3 or WAV.
- The first install can take longer because `puppeteer` downloads a browser binary.
- Unsupported file extensions are rejected with clear error messages.
- In interactive mode, file paths use autocomplete suggestions and `.pdf` is available as a selectable output format for `.docx` inputs.
- Audio inputs can be converted interactively to either MP3 or WAV.
- The codebase is split into `src/cli/*` and `src/converters/*` so the entrypoint stays thin.

## Troubleshooting HEIC Errors

If you see errors like:

- `heif: Error while loading plugin: Support for this compression format has not been built in`
- `bad seek` while reading a `.heic` file

try:

```bash
node -v
pnpm rebuild sharp
pnpm up sharp
```

Use Node.js 20 or 22 LTS if possible. Node 25 may have native-module compatibility gaps.

On macOS, this CLI automatically falls back to `sips` when `sharp/libheif` cannot decode a HEIC variant.

If conversion still fails, the source HEIC may be corrupted or encoded with a codec your runtime cannot decode.

