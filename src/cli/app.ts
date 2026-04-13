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
  const format = resolveDirectFormat(definition.outputFormats, options?.format, definition.defaultOutputFormat);
  const outputPath = outputPathRaw ? resolvePath(outputPathRaw) : definition.buildDefaultOutputPath(inputPath, format);

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
  const outputPath = resolvePath(outputPathRaw);

  const spinner = ora(`Converting ${chalk.cyan(path.basename(inputPath))}...`).start();
  try {
    await definition.convert({ inputPath, outputPath, format: outputFormat });
    spinner.succeed(chalk.green(`Conversion completed: ${outputPath}`));
  } catch (error) {
    spinner.fail(chalk.red('Conversion failed'));
    throw error;
  }
}

function resolveDirectFormat(allowedFormats: readonly string[], requestedFormat: string | undefined, defaultFormat: string): string {
  if (!requestedFormat) {
    return defaultFormat;
  }

  const normalized = requestedFormat.toLowerCase();
  if (!allowedFormats.includes(normalized)) {
    throw new Error(`Invalid format option: ${requestedFormat}. Allowed values are ${allowedFormats.join(', ')}.`);
  }

  return normalized;
}

function resolvePath(filePath: string): string {
  return path.resolve(process.cwd(), filePath);
}

function handleFatalError(error: unknown): never {
  const message = error instanceof Error ? error.message : String(error);
  console.error(chalk.red(`Error: ${message}`));
  process.exit(1);
}

