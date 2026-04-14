import path from 'node:path';
import { audioConverter } from './audio.js';
import { dataConverters } from './data.js';
import { convertDocxToPdf } from './document.js';
import { convertImageToImage, supportedImageInputExtensions, type ImageOutputFormat } from './image.js';
import { markdownConverter } from './markdown.js';
import { type ConverterDefinition } from './types.js';

export type SupportedInputType = 'image' | 'document' | 'markdown' | 'data' | 'audio';

export interface ResolvedConverter {
  type: SupportedInputType;
  definition: ConverterDefinition<any>;
}

const imageConverter: ConverterDefinition<ImageOutputFormat> = {
  key: 'image',
  label: 'Image',
  inputExtensions: supportedImageInputExtensions,
  outputFormats: ['jpg', 'png'],
  defaultOutputFormat: 'jpg',
  convert: ({ inputPath, outputPath, format }) => convertImageToImage({ inputPath, outputPath, format }),
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

export const converters: Array<ConverterDefinition<any>> = [
  imageConverter,
  documentConverter,
  markdownConverter,
  ...dataConverters,
  audioConverter,
];

export function resolveConverter(inputPath: string): ResolvedConverter {
  const extension = path.extname(inputPath).toLowerCase();
  const definition = converters.find((candidate) => candidate.inputExtensions.includes(extension));

  if (!definition) {
    throw new Error(
      `Unsupported input format: ${extension || 'unknown'}. Supported formats are ${collectSupportedInputFormats().join(', ')}.`,
    );
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

function collectSupportedInputFormats(): string[] {
  const extensions = converters.flatMap((converter) => [...converter.inputExtensions]);
  return [...new Set(extensions)].sort();
}

