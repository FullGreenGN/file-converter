import { access } from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import puppeteer from 'puppeteer';

export interface ConvertDocxToPdfOptions {
  inputPath: string;
  outputPath: string;
}

export async function convertDocxToPdf(options: ConvertDocxToPdfOptions): Promise<string> {
  const { inputPath, outputPath } = options;

  await ensureFileExists(inputPath);

  const inputExtension = path.extname(inputPath).toLowerCase();
  if (inputExtension !== '.docx') {
    throw new Error(`Unsupported document input format: ${inputExtension || 'unknown'}. Only .docx is supported.`);
  }

  const html = await convertDocxToHtml(inputPath);
  await renderHtmlToPdf(html, outputPath);
  return outputPath;
}

async function convertDocxToHtml(inputPath: string): Promise<string> {
  try {
    const result = await mammoth.convertToHtml({ path: inputPath });
    if (!result.value?.trim()) {
      throw new Error('DOCX to HTML conversion returned empty content.');
    }

    return wrapHtmlDocument(result.value);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`DOCX parsing failed: ${message}`);
  }
}

async function renderHtmlToPdf(html: string, outputPath: string): Promise<void> {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;

  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: outputPath,
      format: 'A4',
      printBackground: true,
      margin: {
        top: '18mm',
        right: '14mm',
        bottom: '18mm',
        left: '14mm',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const lowered = message.toLowerCase();

    if (lowered.includes('could not find chrome') || lowered.includes('failed to launch the browser process')) {
      throw new Error(
        'PDF rendering failed: Puppeteer browser is not available.\n' +
          'If you are using pnpm v10+, allow install scripts and install Chromium:\n' +
          '1) pnpm approve-builds\n' +
          '2) pnpm rebuild puppeteer\n' +
          '3) pnpm exec puppeteer browsers install chrome',
      );
    }

    throw new Error(`PDF rendering failed: ${message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

function wrapHtmlDocument(content: string): string {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
        line-height: 1.5;
        font-size: 12pt;
      }
      img {
        max-width: 100%;
        height: auto;
      }
      table {
        border-collapse: collapse;
        width: 100%;
      }
      td, th {
        border: 1px solid #ddd;
        padding: 6px;
      }
    </style>
  </head>
  <body>
    ${content}
  </body>
</html>`;
}

async function ensureFileExists(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Input file not found: ${filePath}`);
  }
}

