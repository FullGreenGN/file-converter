import { access, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import csvtojson from 'csvtojson';
import { Parser as Json2CsvParser } from 'json2csv';
import { dump, load } from 'js-yaml';
import { type ConverterDefinition } from './types.js';

export type CsvOutputFormat = 'json';
export type JsonOutputFormat = 'csv' | 'yaml';
export type YamlOutputFormat = 'json';

export interface ConvertCsvToJsonOptions {
  inputPath: string;
  outputPath: string;
}

export interface ConvertJsonToDataOptions {
  inputPath: string;
  outputPath: string;
  format: JsonOutputFormat;
}

export interface ConvertYamlToJsonOptions {
  inputPath: string;
  outputPath: string;
}

const csvInputExtensions = ['.csv'] as const;
const jsonInputExtensions = ['.json'] as const;
const yamlInputExtensions = ['.yaml', '.yml'] as const;

export async function convertCsvToJson(options: ConvertCsvToJsonOptions): Promise<string> {
  const { inputPath, outputPath } = options;

  await ensureFileExists(inputPath);
  ensureInputExtension(inputPath, csvInputExtensions, 'CSV');

  const rows = await csvtojson({ trim: true, checkType: true }).fromFile(inputPath);
  if (!rows.length) {
    throw new Error(`CSV file has no rows to convert: ${inputPath}`);
  }

  await writeFile(outputPath, `${JSON.stringify(rows, null, 2)}\n`, 'utf8');
  return outputPath;
}

export async function convertJsonToCsv(options: ConvertJsonToDataOptions): Promise<string> {
  const { inputPath, outputPath } = options;

  await ensureFileExists(inputPath);
  ensureInputExtension(inputPath, jsonInputExtensions, 'JSON');

  const parsed = await readJson(inputPath);
  const records = normalizeRecordsForCsv(parsed);
  if (!records.length) {
    throw new Error(`JSON input does not contain any records for CSV conversion: ${inputPath}`);
  }

  const headers = collectHeaders(records);
  const parser = new Json2CsvParser({ fields: headers, header: true });
  const csv = parser.parse(records);

  await writeFile(outputPath, `${csv}\n`, 'utf8');
  return outputPath;
}

export async function convertJsonToYaml(options: ConvertJsonToDataOptions): Promise<string> {
  const { inputPath, outputPath } = options;

  await ensureFileExists(inputPath);
  ensureInputExtension(inputPath, jsonInputExtensions, 'JSON');

  const parsed = await readJson(inputPath);
  const yaml = dump(parsed, {
    noRefs: true,
    sortKeys: false,
    lineWidth: 100,
  });

  await writeFile(outputPath, yaml, 'utf8');
  return outputPath;
}

export async function convertYamlToJson(options: ConvertYamlToJsonOptions): Promise<string> {
  const { inputPath, outputPath } = options;

  await ensureFileExists(inputPath);
  ensureInputExtension(inputPath, yamlInputExtensions, 'YAML');

  const raw = await readFile(inputPath, 'utf8');
  if (!raw.trim()) {
    throw new Error(`YAML input is empty: ${inputPath}`);
  }

  const parsed = load(raw);
  if (typeof parsed === 'undefined') {
    throw new Error(`YAML input could not be parsed into a JSON value: ${inputPath}`);
  }

  await writeFile(outputPath, `${JSON.stringify(parsed, null, 2)}\n`, 'utf8');
  return outputPath;
}

export const csvConverter: ConverterDefinition<CsvOutputFormat> = {
  key: 'data',
  label: 'Data',
  inputExtensions: csvInputExtensions,
  outputFormats: ['json'],
  defaultOutputFormat: 'json',
  convert: ({ inputPath, outputPath }) => convertCsvToJson({ inputPath, outputPath }),
  buildDefaultOutputPath: (inputPath, format) => buildDefaultOutputPath(inputPath, format),
};

export const jsonConverter: ConverterDefinition<JsonOutputFormat> = {
  key: 'data',
  label: 'Data',
  inputExtensions: jsonInputExtensions,
  outputFormats: ['csv', 'yaml'],
  defaultOutputFormat: 'csv',
  convert: ({ inputPath, outputPath, format }) => {
    if (format === 'csv') {
      return convertJsonToCsv({ inputPath, outputPath, format });
    }

    return convertJsonToYaml({ inputPath, outputPath, format });
  },
  buildDefaultOutputPath: (inputPath, format) => buildDefaultOutputPath(inputPath, format),
};

export const yamlConverter: ConverterDefinition<YamlOutputFormat> = {
  key: 'data',
  label: 'Data',
  inputExtensions: yamlInputExtensions,
  outputFormats: ['json'],
  defaultOutputFormat: 'json',
  convert: ({ inputPath, outputPath }) => convertYamlToJson({ inputPath, outputPath }),
  buildDefaultOutputPath: (inputPath, format) => buildDefaultOutputPath(inputPath, format),
};

export const dataConverters = [csvConverter, jsonConverter, yamlConverter] as const;

async function readJson(filePath: string): Promise<unknown> {
  const raw = await readFile(filePath, 'utf8');
  if (!raw.trim()) {
    throw new Error(`JSON input is empty: ${filePath}`);
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Invalid JSON input: ${filePath}\n${message}`);
  }
}

function normalizeRecordsForCsv(value: unknown): Array<Record<string, string>> {
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return [];
    }

    return value.map((item) => {
      if (isPlainObject(item)) {
        return flattenRecord(item);
      }

      if (Array.isArray(item)) {
        return { value: JSON.stringify(item) };
      }

      if (item === null || typeof item !== 'object') {
        return { value: serializeScalar(item) };
      }

      return { value: serializeScalar(item) };
    });
  }

  if (isPlainObject(value)) {
    return [flattenRecord(value)];
  }

  if (value === null || typeof value !== 'object') {
    return [{ value: serializeScalar(value) }];
  }

  return [{ value: serializeScalar(value) }];
}

function flattenRecord(record: Record<string, unknown>, prefix = ''): Record<string, string> {
  const flattened: Record<string, string> = {};

  for (const [key, value] of Object.entries(record)) {
    const compoundKey = prefix ? `${prefix}.${key}` : key;

    if (value === null || typeof value === 'undefined') {
      flattened[compoundKey] = '';
      continue;
    }

    if (Array.isArray(value)) {
      flattened[compoundKey] = JSON.stringify(value);
      continue;
    }

    if (isPlainObject(value)) {
      Object.assign(flattened, flattenRecord(value, compoundKey));
      continue;
    }

    flattened[compoundKey] = serializeScalar(value);
  }

  return flattened;
}

function collectHeaders(records: Array<Record<string, string>>): string[] {
  const headers: string[] = [];
  const seen = new Set<string>();

  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!seen.has(key)) {
        seen.add(key);
        headers.push(key);
      }
    }
  }

  return headers;
}

function serializeScalar(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value === null || typeof value === 'undefined') {
    return '';
  }

  return String(value);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function ensureFileExists(filePath: string): Promise<void> {
  try {
    await access(filePath);
  } catch {
    throw new Error(`Input file not found: ${filePath}`);
  }
}

function ensureInputExtension(filePath: string, allowedExtensions: readonly string[], label: string): void {
  const extension = path.extname(filePath).toLowerCase();
  if (!allowedExtensions.includes(extension)) {
    throw new Error(`Unsupported ${label} input format: ${extension || 'unknown'}. Supported formats are ${allowedExtensions.join(', ')}.`);
  }
}

function buildDefaultOutputPath(inputPath: string, format: string): string {
  const parsed = path.parse(inputPath);
  return path.join(parsed.dir, `${parsed.name}.${format}`);
}
