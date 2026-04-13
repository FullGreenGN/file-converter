import path from 'node:path';
import { audioConverter } from './audio.js';
import { convertDocxToPdf } from './document.js';
import { convertHeicToImage } from './image.js';
import { type ConverterDefinition } from './types.js';
import { type ImageOutputFormat } from './image.js';

export type SupportedInputType = 'image' | 'document' | 'audio';

export interface ResolvedConverter {
  type: SupportedInputType;
  definition: ConverterDefinition<any>;
}

const imageConverter: ConverterDefinition<ImageOutputFormat> = {
  key: 'image',
  label: 'Image',
  inputExtensions: ['.heic'],
  outputFormats: ['jpg', 'png'],
  defaultOutputFormat: 'jpg',
  convert: ({ inputPath, outputPath, format }) => convertHeicToImage({ inputPath, outputPath, format }),
  buildDefaultOutputPath: (inputPath, format) => buildDefaultOutputPath(inputPath, format),
};

const documentConverter: ConverterDefinition<'pdf'> = {
  key: 'document',
  label: 'Document',
  inputExtensions: ['.docx'],
  outputFormats: ['pdf'],
  defaultOutputFormat: 'pdf',
  convert: ({ inputPath, outputPath, format: _format }) => convertDocxToPdf({ inputPath, outputPath }),
  buildDefaultOutputPath: (inputPath) => buildDefaultOutputPath(inputPath, 'pdf'),
};

export const converters: Array<ConverterDefinition<any>> = [imageConverter, documentConverter, audioConverter];

export function resolveConverter(inputPath: string): ResolvedConverter {
  const extension = path.extname(inputPath).toLowerCase();
  const definition = converters.find((candidate) => candidate.inputExtensions.includes(extension));

  if (!definition) {
    throw new Error(`Unsupported input format: ${extension || 'unknown'}. Supported formats are .heic, .docx, and audio formats like .mp3 or .wav.`);
  }

  return {
    type: definition.key as SupportedInputType,
    definition,
  };
}

function buildDefaultOutputPath(inputPath: string, format: string): string {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}.${format}`);
}

