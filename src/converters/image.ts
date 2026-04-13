import { access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

export type ImageOutputFormat = 'jpg' | 'png';

export interface ConvertHeicToImageOptions {
  inputPath: string;
  outputPath: string;
  format: ImageOutputFormat;
}

export async function convertHeicToImage(options: ConvertHeicToImageOptions): Promise<string> {
  const { inputPath, outputPath, format } = options;

  await ensureFileExists(inputPath);

  const inputExtension = path.extname(inputPath).toLowerCase();
  if (inputExtension !== '.heic') {
    throw new Error(`Unsupported image input format: ${inputExtension || 'unknown'}. Only .heic is supported.`);
  }

  if (!['jpg', 'png'].includes(format)) {
    throw new Error(`Unsupported output image format: ${format}. Supported formats are jpg and png.`);
  }

  const image = sharp(inputPath, { failOn: 'error' });

  if (format === 'jpg') {
    await image.jpeg({ quality: 90 }).toFile(outputPath);
  } else {
    await image.png().toFile(outputPath);
  }

  return outputPath;
}

async function ensureFileExists(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Input file not found: ${filePath}`);
  }
}

