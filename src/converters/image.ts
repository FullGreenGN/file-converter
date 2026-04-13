import { access } from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

export type ImageOutputFormat = 'jpg' | 'png';

export interface ConvertHeicToImageOptions {
  inputPath: string;
  outputPath: string;
  format: ImageOutputFormat;
}

const execFileAsync = promisify(execFile);

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

  try {
    const image = sharp(inputPath, { failOn: 'error' });

    if (format === 'jpg') {
      await image.jpeg({ quality: 90 }).toFile(outputPath);
    } else {
      await image.png().toFile(outputPath);
    }
  } catch (error) {
    if (canUseMacOSSipsFallback(error)) {
      try {
        await convertHeicWithSips({ inputPath, outputPath, format });
        return outputPath;
      } catch (fallbackError) {
        throw mapHeicRuntimeError(error, inputPath, fallbackError);
      }
    }

    throw mapHeicRuntimeError(error, inputPath);
  }

  return outputPath;
}

function mapHeicRuntimeError(error: unknown, inputPath: string, fallbackError?: unknown): Error {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const lowered = rawMessage.toLowerCase();
  const fallbackMessage = fallbackError
    ? `\nFallback (macOS sips) error: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`
    : '';

  if (lowered.includes('support for this compression format has not been built in') || lowered.includes('heif: error while loading plugin')) {
    return new Error(
      `HEIC decoding is not available in the current sharp/libvips runtime.\n` +
        `Input: ${inputPath}\n` +
        'Try one of the following:\n' +
        '1) Use Node.js 20 or 22 LTS (Node 25 may not have compatible native binaries yet)\n' +
        '2) Reinstall sharp for your platform: pnpm rebuild sharp\n' +
        '3) Update sharp to the latest version\n' +
        '4) Convert this HEIC using another tool and retry\n' +
        `Original error: ${rawMessage}` +
        fallbackMessage,
    );
  }

  if (lowered.includes('no decoding plugin installed for this compression format')) {
    return new Error(
      `HEIC decoding plugin is unavailable for this runtime.\n` +
        `Input: ${inputPath}\n` +
        '1) Reinstall sharp for your platform: pnpm rebuild sharp\n' +
        `Original error: ${rawMessage}` +
        fallbackMessage,
    );
  }

  if (lowered.includes('bad seek') || lowered.includes('invalid input')) {
    return new Error(
      `The HEIC file appears corrupted or partially unreadable: ${inputPath}\n` +
        `Original error: ${rawMessage}` +
        fallbackMessage,
    );
  }

  return new Error(`Image conversion failed for ${inputPath}: ${rawMessage}${fallbackMessage}`);
}

function canUseMacOSSipsFallback(error: unknown): boolean {
  if (process.platform !== 'darwin') {
    return false;
  }

  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();
  return (
    message.includes('support for this compression format has not been built in') ||
    message.includes('heif: error while loading plugin') ||
    message.includes('no decoding plugin installed for this compression format')
  );
}

async function convertHeicWithSips(options: ConvertHeicToImageOptions): Promise<void> {
  const { inputPath, outputPath, format } = options;
  const sipsFormat = format === 'jpg' ? 'jpeg' : 'png';

  await execFileAsync('sips', ['-s', 'format', sipsFormat, inputPath, '--out', outputPath]);
}

async function ensureFileExists(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Input file not found: ${filePath}`);
  }
}

