import { access } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import ffmpegStatic from 'ffmpeg-static';
import { type ConverterDefinition } from './types.js';

export type AudioOutputFormat = 'mp3' | 'wav';

const audioInputExtensions = ['.aac', '.alac', '.flac', '.m4a', '.mp3', '.ogg', '.opus', '.wav', '.wma', '.webm'];

export async function convertAudioToFile(options: {
  inputPath: string;
  outputPath: string;
  format: AudioOutputFormat;
}): Promise<string> {
  const { inputPath, outputPath, format } = options;

  await ensureFileExists(inputPath);

  const inputExtension = path.extname(inputPath).toLowerCase();
  if (!audioInputExtensions.includes(inputExtension)) {
    throw new Error(`Unsupported audio input format: ${inputExtension || 'unknown'}. Supported formats are ${audioInputExtensions.join(', ')}.`);
  }

  const ffmpegPath = ffmpegStatic;
  if (!ffmpegPath) {
    throw new Error('Audio conversion failed: ffmpeg-static binary is not available for this platform.');
  }

  const args = ['-y', '-i', inputPath, '-vn'];
  if (format === 'mp3') {
    args.push('-codec:a', 'libmp3lame', '-q:a', '2', outputPath);
  } else {
    args.push('-codec:a', 'pcm_s16le', outputPath);
  }

  await runFfmpeg(ffmpegPath, args);
  return outputPath;
}

export const audioConverter: ConverterDefinition<AudioOutputFormat> = {
  key: 'audio',
  label: 'Audio',
  inputExtensions: audioInputExtensions,
  outputFormats: ['mp3', 'wav'],
  defaultOutputFormat: 'mp3',
  convert: ({ inputPath, outputPath, format }) => convertAudioToFile({ inputPath, outputPath, format }),
  buildDefaultOutputPath: (inputPath, format) => buildDefaultOutputPath(inputPath, format),
};

function buildDefaultOutputPath(inputPath: string, format: AudioOutputFormat): string {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}.${format}`);
}

async function ensureFileExists(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Input file not found: ${filePath}`);
  }
}

function runFfmpeg(ffmpegPath: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpegPath, args, { stdio: 'inherit' });

    child.on('error', (error) => {
      reject(new Error(`Audio conversion failed to start: ${error.message}`));
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Audio conversion failed: ffmpeg exited with code ${code ?? 'unknown'}.`));
    });
  });
}


