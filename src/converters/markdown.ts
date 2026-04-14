import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { marked } from 'marked';
import { buildHtmlDocument, renderHtmlToPdf } from './pdf.js';
import { type ConverterDefinition } from './types.js';

export type MarkdownOutputFormat = 'pdf';

export interface ConvertMarkdownToPdfOptions {
  inputPath: string;
  outputPath: string;
}

export const markdownConverter: ConverterDefinition<MarkdownOutputFormat> = {
  key: 'markdown',
  label: 'Markdown',
  inputExtensions: ['.md'],
  outputFormats: ['pdf'],
  defaultOutputFormat: 'pdf',
  convert: ({ inputPath, outputPath }) => convertMarkdownToPdf({ inputPath, outputPath }),
  buildDefaultOutputPath: (inputPath) => buildDefaultOutputPath(inputPath, 'pdf'),
};

export async function convertMarkdownToPdf(options: ConvertMarkdownToPdfOptions): Promise<string> {
  const { inputPath, outputPath } = options;

  await ensureFileExists(inputPath);

  const inputExtension = path.extname(inputPath).toLowerCase();
  if (inputExtension !== '.md') {
    throw new Error(`Unsupported markdown input format: ${inputExtension || 'unknown'}. Only .md is supported.`);
  }

  const markdown = await readFile(inputPath, 'utf8');
  if (!markdown.trim()) {
    throw new Error(`Markdown input is empty: ${inputPath}`);
  }

  const htmlContent = marked.parse(markdown, { gfm: true, breaks: false });
  const html = buildHtmlDocument(`<article class="markdown-body">${htmlContent}</article>`, {
    title: path.basename(inputPath),
  });

  await renderHtmlToPdf({ html, outputPath });
  return outputPath;
}

async function ensureFileExists(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Input file not found: ${filePath}`);
  }
}

function buildDefaultOutputPath(inputPath: string, format: MarkdownOutputFormat): string {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}.${format}`);
}

