# @fullgreen/converter

A CLI to convert:

- `.heic` -> `.jpg` or `.png` (via `sharp`)
- `.docx` -> `.pdf` (via `libreoffice-convert`)

## Requirements

- Node.js 20+
- `pnpm`
- LibreOffice installed and available on your system `PATH` (required for DOCX to PDF conversion)

## Install Dependencies

```bash
pnpm install
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
```

### Interactive mode

If no arguments are provided, the CLI prompts for input and output details:

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
- DOCX conversion requires LibreOffice runtime binaries to be installed on your machine.
- Unsupported file extensions are rejected with clear error messages.

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

