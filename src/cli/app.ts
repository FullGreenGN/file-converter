import path from 'node:path';
import chalk from 'chalk';
import { Command } from 'commander';
import ora from 'ora';
import { resolveConverter } from '../converters/index.js';
import { ensureFileExists, promptOutputFormat, promptPathWithAutocomplete } from './prompts.js';

interface CliOptions {
  format?: string;
}

export async function runCli(): Promise<void> {
  const program = new Command();

  program
    .name('fullgreen-convert')
    .description('Convert HEIC images, DOCX documents, and audio files.')
    .argument('[input]', 'input file path')
    .argument('[output]', 'output file path')
    .option('-f, --format <format>', 'output format for the detected converter')
    .action(async (input?: string, output?: string, options?: CliOptions) => {
      try {
        if (!input) {
          await runInteractiveMode();
          return;
        }

        await runDirectMode(input, output, options ?? {});
      } catch (error) {
        handleFatalError(error);
      }
    });

  await program.parseAsync(process.argv);
}

async function runDirectMode(inputPathRaw: string, outputPathRaw?: string, options?: CliOptions): Promise<void> {
  const inputPath = resolvePath(inputPathRaw);
  await ensureFileExists(inputPath);

  const { definition } = resolveConverter(inputPath);
  const format = resolveOutputFormat({
    allowedFormats: definition.outputFormats,
    requestedFormat: options?.format,
    outputPathRaw,
    defaultFormat: definition.defaultOutputFormat,
  });
  const outputPath = outputPathRaw ? resolveOutputPath(outputPathRaw, format, definition.outputFormats) : definition.buildDefaultOutputPath(inputPath, format as never);

  const spinner = ora(`Converting ${chalk.cyan(path.basename(inputPath))}...`).start();
  try {
    await definition.convert({ inputPath, outputPath, format: format as never });
    spinner.succeed(chalk.green(`Conversion completed: ${outputPath}`));
  } catch (error) {
    spinner.fail(chalk.red('Conversion failed'));
    throw error;
  }
}

async function runInteractiveMode(): Promise<void> {
  const inputPathRaw = await promptPathWithAutocomplete('Input file path');
  const inputPath = resolvePath(inputPathRaw);
  await ensureFileExists(inputPath);

  const { definition } = resolveConverter(inputPath);
  const outputFormat = await promptOutputFormat(definition);
  const defaultOutputPath = definition.buildDefaultOutputPath(inputPath, outputFormat);
  const outputPathRaw = await promptPathWithAutocomplete('Output file path', defaultOutputPath);
  const outputPath = resolveOutputPath(outputPathRaw, outputFormat, definition.outputFormats);

  const spinner = ora(`Converting ${chalk.cyan(path.basename(inputPath))}...`).start();
  try {
    await definition.convert({ inputPath, outputPath, format: outputFormat });
    spinner.succeed(chalk.green(`Conversion completed: ${outputPath}`));
  } catch (error) {
    spinner.fail(chalk.red('Conversion failed'));
    throw error;
  }
}

function resolvePath(filePath: string): string {
  return path.resolve(process.cwd(), filePath);
}

function resolveOutputFormat(options: {
  allowedFormats: readonly string[];
  requestedFormat?: string;
  outputPathRaw?: string;
  defaultFormat: string;
}): string {
  const { allowedFormats, requestedFormat, outputPathRaw, defaultFormat } = options;
  const requested = requestedFormat?.toLowerCase();

  if (requested) {
    ensureAllowedFormat(requested, allowedFormats, requestedFormat);

    if (outputPathRaw) {
      const outputExtension = path.extname(outputPathRaw).toLowerCase().replace(/^\./, '');
      if (outputExtension && outputExtension !== requested) {
        throw new Error(
          `Output path extension .${outputExtension} does not match the requested format "${requested}". ` +
            `Choose one of: ${allowedFormats.join(', ')}.`,
        );
      }
    }

    return requested;
  }

  if (outputPathRaw) {
    const outputExtension = path.extname(outputPathRaw).toLowerCase().replace(/^\./, '');
    if (outputExtension) {
      ensureAllowedFormat(outputExtension, allowedFormats, outputExtension);
      return outputExtension;
    }
  }

  return defaultFormat;
}

function resolveOutputPath(outputPathRaw: string, format: string, allowedFormats: readonly string[]): string {
  const outputPath = resolvePath(outputPathRaw);
  const outputExtension = path.extname(outputPath).toLowerCase().replace(/^\./, '');

  if (outputExtension && !allowedFormats.includes(outputExtension)) {
    throw new Error(`Unsupported output format: .${outputExtension}. Allowed values are ${allowedFormats.join(', ')}.`);
  }

  if (outputExtension && outputExtension !== format) {
    throw new Error(`Output path extension .${outputExtension} does not match the selected format "${format}".`);
  }

  return outputPath;
}

function ensureAllowedFormat(format: string, allowedFormats: readonly string[], originalValue: string): void {
  if (!allowedFormats.includes(format)) {
    throw new Error(`Invalid format option: ${originalValue}. Allowed values are ${allowedFormats.join(', ')}.`);
  }
}

function handleFatalError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`Error: ${message}`));
  process.exit(1);
}

