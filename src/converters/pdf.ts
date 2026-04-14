import puppeteer from 'puppeteer';

export interface RenderHtmlToPdfOptions {
  html: string;
  outputPath: string;
}

export function buildHtmlDocument(content: string, options?: { title?: string; extraStyles?: string }): string {
  const title = options?.title ?? 'Document';
  const extraStyles = options?.extraStyles ?? '';

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        padding: 32px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
        font-size: 12pt;
        line-height: 1.6;
        color: #1f2328;
        background: #fff;
      }

      .markdown-body,
      .document-body {
        max-width: 920px;
        margin: 0 auto;
      }

      h1, h2, h3, h4, h5, h6 {
        line-height: 1.25;
        margin: 1.2em 0 0.5em;
      }

      h1 { font-size: 2.2em; }
      h2 { font-size: 1.7em; border-bottom: 1px solid #d0d7de; padding-bottom: 0.3em; }
      h3 { font-size: 1.35em; }

      p, ul, ol, blockquote, table, pre {
        margin: 0 0 1em;
      }

      a {
        color: #0969da;
        text-decoration: none;
      }

      a:hover {
        text-decoration: underline;
      }

      code, pre {
        font-family: SFMono-Regular, Consolas, 'Liberation Mono', Menlo, monospace;
        font-size: 0.95em;
      }

      pre {
        padding: 16px;
        overflow: auto;
        border-radius: 8px;
        background: #f6f8fa;
      }

      code {
        padding: 0.15em 0.4em;
        border-radius: 6px;
        background: rgba(175, 184, 193, 0.2);
      }

      pre code {
        padding: 0;
        background: transparent;
      }

      blockquote {
        padding: 0 1em;
        color: #57606a;
        border-left: 4px solid #d0d7de;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      th, td {
        padding: 8px 10px;
        border: 1px solid #d0d7de;
        text-align: left;
        vertical-align: top;
      }

      img {
        max-width: 100%;
        height: auto;
      }

      hr {
        border: 0;
        border-top: 1px solid #d0d7de;
        margin: 1.5em 0;
      }

      ${extraStyles}
    </style>
  </head>
  <body>
    ${content}
  </body>
</html>`;
}

export async function renderHtmlToPdf(options: RenderHtmlToPdfOptions): Promise<void> {
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    await page.setContent(options.html, { waitUntil: 'networkidle0' });
    await page.pdf({
      path: options.outputPath,
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: '16mm',
        right: '14mm',
        bottom: '16mm',
        left: '14mm',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (message.toLowerCase().includes('could not find chrome') || message.toLowerCase().includes('failed to launch the browser process')) {
      throw new Error(
        'PDF rendering failed: Puppeteer browser is not available.\n' +
          'Run: pnpm exec puppeteer browsers install chrome',
      );
    }

    throw new Error(`PDF rendering failed: ${message}`);
  } finally {
    await browser.close();
  }
}

async function launchBrowser(): Promise<Awaited<ReturnType<typeof puppeteer.launch>>> {
  return puppeteer.launch({
    headless: true,
    args: process.platform === 'darwin' ? [] : ['--disable-setuid-sandbox', '--no-sandbox'],
  });
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
