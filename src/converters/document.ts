import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import libreofficeConvert from 'libreoffice-convert';

interface LibreOfficeConvert {
  convert: (
    input: Buffer,
    format: string,
    filter: unknown,
    callback: (error: Error | null, done?: Buffer) => void
  ) => void;
}

const libre = libreofficeConvert as unknown as LibreOfficeConvert;

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

  const sourceBuffer = await readFile(inputPath);
  const pdfBuffer = await convertToPdf(sourceBuffer);

  await writeFile(outputPath, pdfBuffer);
  return outputPath;
}

async function convertToPdf(inputBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    libre.convert(inputBuffer, '.pdf', undefined, (error, done) => {
      if (error) {
        reject(new Error(`LibreOffice conversion failed: ${error.message}`));
        return;
      }

      if (!done) {
        reject(new Error('LibreOffice conversion failed: empty conversion output.'));
        return;
      }

      resolve(done);
    });
  });
}

async function ensureFileExists(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Input file not found: ${filePath}`);
  }
}

