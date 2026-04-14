import { access } from 'node:fs/promises';
import path from 'node:path';
import mammoth from 'mammoth';
import { buildHtmlDocument, renderHtmlToPdf } from './pdf.js';

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

    return buildHtmlDocument(`<main class="document-body">${result.value}</main>`, {
      title: path.basename(inputPath),
      extraStyles: `
        .document-body img {
          max-width: 100%;
          height: auto;
        }
      `,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`DOCX parsing failed: ${message}`);
  }
}


async function ensureFileExists(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Input file not found: ${filePath}`);
  }
}

